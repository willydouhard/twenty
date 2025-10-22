import { z } from 'zod';
import {
  type RecordGqlOperationFilter,
  type DateFilter,
  ViewFilterOperand,
} from '@/types';
import { resolveDateViewFilterValue } from './utils/resolveDateViewFilterValue';

/**
 * Resolves relative date strings in filter objects to absolute date ranges.
 *
 * This function recursively traverses filter structures and converts relative date strings
 * (e.g., "PAST_7_DAY", "THIS_MONTH", "NEXT_2_WEEK") into absolute date range filters.
 *
 * DESIGN RATIONALE:
 * Relative date strings represent time periods (ranges), not points in time. Therefore,
 * regardless of the operator used (eq, gte, lte, etc.), they are ALWAYS converted to
 * range filters with both gte and lte conditions.
 *
 * This design choice ensures:
 * 1. Semantic consistency: "PAST_7_DAY" means "within the past 7 days", not "7 days ago"
 * 2. User intent alignment: Users expect relative dates to filter within a time period
 * 3. System consistency: Matches behavior of the IS_RELATIVE operand in the main filter system
 *
 * @param filter - The filter object potentially containing relative date strings
 * @returns A new filter with all relative dates resolved to absolute date ranges
 *
 * @example
 * Input:  { createdAt: { gte: 'PAST_7_DAY' } }
 * Output: { and: [{ createdAt: { gte: '2024-01-08T12:00:00Z' }}, { createdAt: { lte: '2024-01-15T12:00:00Z' }}] }
 */
const relativeDateRegex = /^(PAST|NEXT|THIS)_(\d+_)?(DAY|WEEK|MONTH|YEAR)$/;

const isRelativeDateString = (value: unknown): value is string => {
  return typeof value === 'string' && relativeDateRegex.test(value);
};

const isDateFilter = (value: unknown): value is DateFilter => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const dateFilter = value as Record<string, unknown>;
  const dateFilterKeys = ['eq', 'gt', 'gte', 'lt', 'lte', 'neq', 'in', 'is'];

  return Object.keys(dateFilter).some((key) => dateFilterKeys.includes(key));
};

const resolveRelativeDateInDateFilter = (
  dateFilter: DateFilter,
): RecordGqlOperationFilter | DateFilter => {
  for (const [key, value] of Object.entries(dateFilter)) {
    if (isRelativeDateString(value)) {
      const resolvedValue = resolveDateViewFilterValue({
        value,
        operand: ViewFilterOperand.IS_RELATIVE,
      });

      if (!resolvedValue) {
        continue;
      }

      const dateRange = z
        .object({ start: z.date(), end: z.date() })
        .safeParse(resolvedValue).data;

      if (dateRange) {
        // IMPORTANT: Always convert relative date strings to ranges, regardless of the original operator.
        // This is intentional because relative date strings like "PAST_7_DAY", "THIS_MONTH", "NEXT_2_WEEK"
        // represent time periods (ranges), not points in time.
        //
        // For example:
        // - "PAST_7_DAY" means "the past 7 days" = [7 days ago, now]
        // - "THIS_MONTH" means "this month" = [start of month, end of month]
        // - "NEXT_2_WEEK" means "the next 2 weeks" = [now, 2 weeks from now]
        //
        // Even if the original filter was { createdAt: { gte: 'PAST_7_DAY' } }, the user intent
        // is "created within the past 7 days", which is a range filter, not "created after the
        // start of the past 7 day period".
        //
        // This behavior is consistent with how the IS_RELATIVE operand works in the regular filter
        // system (see turnRecordFilterIntoRecordGqlOperationFilter.ts).
        return {
          and: [
            { [key]: { gte: dateRange.start.toISOString() } } as DateFilter,
            { [key]: { lte: dateRange.end.toISOString() } } as DateFilter,
          ],
        } as RecordGqlOperationFilter;
      }
    }
  }

  return dateFilter;
};

export const resolveRelativeDatesInFilter = (
  filter: RecordGqlOperationFilter | undefined | null,
): RecordGqlOperationFilter | undefined => {
  if (!filter) {
    return undefined;
  }

  if ('and' in filter && Array.isArray(filter.and)) {
    return {
      and: filter.and
        .map((subFilter) => resolveRelativeDatesInFilter(subFilter))
        .filter((f): f is RecordGqlOperationFilter => f !== undefined),
    };
  }

  if ('or' in filter) {
    const orFilters = Array.isArray(filter.or)
      ? filter.or
      : filter.or
        ? [filter.or]
        : [];
    return {
      or: orFilters
        .map((subFilter) =>
          resolveRelativeDatesInFilter(subFilter as RecordGqlOperationFilter),
        )
        .filter((f): f is RecordGqlOperationFilter => f !== undefined),
    };
  }

  if ('not' in filter && filter.not) {
    const resolvedNot = resolveRelativeDatesInFilter(
      filter.not as RecordGqlOperationFilter,
    );
    return resolvedNot ? { not: resolvedNot } : undefined;
  }

  const resolvedFilter: Record<string, unknown> = {};
  const andFilters: RecordGqlOperationFilter[] = [];

  for (const [fieldName, fieldValue] of Object.entries(filter)) {
    if (isDateFilter(fieldValue)) {
      const resolved = resolveRelativeDateInDateFilter(fieldValue);

      if ('and' in resolved && Array.isArray(resolved.and)) {
        andFilters.push(...resolved.and);
      } else {
        resolvedFilter[fieldName] = resolved;
      }
    } else if (
      typeof fieldValue === 'object' &&
      fieldValue !== null &&
      !Array.isArray(fieldValue)
    ) {
      const nestedResolved = resolveRelativeDatesInFilter(
        fieldValue as RecordGqlOperationFilter,
      );
      if (nestedResolved) {
        resolvedFilter[fieldName] = nestedResolved;
      }
    } else {
      resolvedFilter[fieldName] = fieldValue;
    }
  }

  if (andFilters.length > 0) {
    if (Object.keys(resolvedFilter).length > 0) {
      andFilters.push(resolvedFilter as RecordGqlOperationFilter);
    }
    return { and: andFilters };
  }

  return Object.keys(resolvedFilter).length > 0
    ? (resolvedFilter as RecordGqlOperationFilter)
    : undefined;
};
