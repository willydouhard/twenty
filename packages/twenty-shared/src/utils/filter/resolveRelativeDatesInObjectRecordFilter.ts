import { FieldMetadataType } from '@/types/FieldMetadataType';
import { type PartialFieldMetadataItem } from '@/types/PartialFieldMetadataItem';
import { ViewFilterOperand } from '@/types/ViewFilterOperand';
import { resolveDateViewFilterValue } from './utils/resolveDateViewFilterValue';

/**
 * Resolves relative date strings in search record filters to actual date ranges.
 *
 * Background:
 * - Regular filters use the `IS_RELATIVE` operand with relative date strings (e.g., "PAST_7_DAY")
 * - Search filters bypass the operand system and use direct GraphQL operators (gte, lte, etc.)
 * - The backend GraphQL DateFilter type only accepts Date scalars, not relative date strings
 * - Therefore, any relative date strings in search filters must be resolved before sending to backend
 *
 * Design Decision:
 * - ALL relative date strings are transformed to range filters with {gte: start, lte: end}
 * - This matches the behavior of turnRecordFilterIntoRecordGqlOperationFilter (lines 184-213)
 * - The semantic meaning of relative dates is inherently a range (e.g., "last 7 days" = 7 days ago to now)
 * - This is consistent across all operands that use relative dates in the regular filter system
 *
 * Edge Cases Handled:
 * - Multiple operators in same object: In practice, each filter object has ONE operator per field
 * - Different operator semantics: All relative dates represent ranges, so range transformation is correct
 * - Non-date fields: Passed through unchanged
 * - Already resolved dates: ISO strings and Date objects are passed through unchanged
 */

type DateFilter = {
  eq?: Date | string;
  gt?: Date | string;
  gte?: Date | string;
  in?: Date[] | string[];
  lt?: Date | string;
  lte?: Date | string;
  neq?: Date | string;
  is?: 'NOT_NULL' | 'NULL';
};

type ObjectRecordFilterInput = {
  and?: ObjectRecordFilterInput[] | null;
  or?: ObjectRecordFilterInput[] | null;
  not?: ObjectRecordFilterInput | null;
  [key: string]: unknown;
};

const isDateOrDateTimeField = (
  fieldName: string,
  fieldMetadataItems: PartialFieldMetadataItem[],
): boolean => {
  const field = fieldMetadataItems.find((f) => f.name === fieldName);
  return (
    field?.type === FieldMetadataType.DATE ||
    field?.type === FieldMetadataType.DATE_TIME
  );
};

const isRelativeDateValue = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return /^(PAST|THIS|NEXT)_(\d+|undefined)_(DAY|WEEK|MONTH|YEAR)$/.test(
    value,
  );
};

/**
 * Resolves a single date filter that may contain relative date strings.
 *
 * Note: This function returns on the FIRST relative date value found because:
 * 1. In practice, each filter object has only ONE operator per field
 * 2. Multiple operators on the same field are expressed via `and` conditions at a higher level
 * 3. Example: `{and: [{createdAt: {gte: date1}}, {createdAt: {lte: date2}}]}` not `{createdAt: {gte: date1, lte: date2}}`
 * 4. This matches the pattern in turnRecordFilterIntoRecordGqlOperationFilter
 *
 * The transformation always creates a range filter because relative dates inherently represent ranges:
 * - "PAST_7_DAY" means "from 7 days ago until now"
 * - "THIS_1_MONTH" means "from start of month until end of month"
 * - This is the semantic meaning regardless of which operator contains the relative date string
 */
const resolveRelativeDateFilter = (
  fieldName: string,
  dateFilter: DateFilter,
): ObjectRecordFilterInput | DateFilter => {
  for (const [_operator, value] of Object.entries(dateFilter)) {
    if (isRelativeDateValue(value)) {
      const resolvedDate = resolveDateViewFilterValue({
        value: value as string,
        operand: ViewFilterOperand.IS_RELATIVE,
      });

      if (resolvedDate && 'start' in resolvedDate && 'end' in resolvedDate) {
        return {
          and: [
            {
              [fieldName]: {
                gte: resolvedDate.start.toISOString(),
              },
            },
            {
              [fieldName]: {
                lte: resolvedDate.end.toISOString(),
              },
            },
          ],
        };
      }
    }
  }

  return dateFilter;
};

const processFilterValue = (
  key: string,
  value: unknown,
  fieldMetadataItems: PartialFieldMetadataItem[],
): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (isDateOrDateTimeField(key, fieldMetadataItems)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      return resolveRelativeDateFilter(key, value as DateFilter);
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return resolveRelativeDatesInObjectRecordFilterHelper(
      value as ObjectRecordFilterInput,
      fieldMetadataItems,
    );
  }

  return value;
};

const resolveRelativeDatesInObjectRecordFilterHelper = (
  filter: ObjectRecordFilterInput,
  fieldMetadataItems: PartialFieldMetadataItem[],
): ObjectRecordFilterInput => {
  const result: ObjectRecordFilterInput = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === 'and') {
      if (Array.isArray(value)) {
        result.and = value.map((f) =>
          resolveRelativeDatesInObjectRecordFilterHelper(f, fieldMetadataItems),
        );
      } else {
        result.and = value as ObjectRecordFilterInput[] | null | undefined;
      }
    } else if (key === 'or') {
      if (Array.isArray(value)) {
        result.or = value.map((f) =>
          resolveRelativeDatesInObjectRecordFilterHelper(f, fieldMetadataItems),
        );
      } else {
        result.or = value as ObjectRecordFilterInput[] | null | undefined;
      }
    } else if (key === 'not') {
      if (typeof value === 'object' && value !== null) {
        result.not = resolveRelativeDatesInObjectRecordFilterHelper(
          value as ObjectRecordFilterInput,
          fieldMetadataItems,
        );
      } else {
        result.not = value as ObjectRecordFilterInput | null | undefined;
      }
    } else {
      const processedValue = processFilterValue(key, value, fieldMetadataItems);

      if (
        typeof processedValue === 'object' &&
        processedValue !== null &&
        'and' in processedValue
      ) {
        const andConditions = (processedValue as ObjectRecordFilterInput).and;
        if (!result.and) {
          result.and = [];
        }
        if (Array.isArray(andConditions)) {
          result.and.push(...andConditions);
        }
      } else {
        result[key] = processedValue;
      }
    }
  }

  return result;
};

export const resolveRelativeDatesInObjectRecordFilter = (
  filter: ObjectRecordFilterInput | undefined | null,
  fieldMetadataItems: PartialFieldMetadataItem[],
): ObjectRecordFilterInput | undefined | null => {
  if (!filter || !fieldMetadataItems?.length) {
    return filter;
  }

  return resolveRelativeDatesInObjectRecordFilterHelper(
    filter,
    fieldMetadataItems,
  );
};
