import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  roundToNearestMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import { z } from 'zod';

type FilterValue = string | number | boolean | null | undefined;

type DateFilterOperators = {
  eq?: FilterValue;
  neq?: FilterValue;
  gt?: FilterValue;
  gte?: FilterValue;
  lt?: FilterValue;
  lte?: FilterValue;
  in?: FilterValue[];
  is?: FilterValue;
};

type ObjectRecordFilter = {
  and?: ObjectRecordFilter[];
  or?: ObjectRecordFilter[];
  not?: ObjectRecordFilter;
  [key: string]:
    | DateFilterOperators
    | ObjectRecordFilter[]
    | ObjectRecordFilter
    | FilterValue
    | FilterValue[]
    | undefined;
};

const variableDateViewFilterValueDirectionSchema = z.enum([
  'NEXT',
  'THIS',
  'PAST',
]);

type VariableDateViewFilterValueDirection = z.infer<
  typeof variableDateViewFilterValueDirectionSchema
>;

const variableDateViewFilterValueAmountSchema = z
  .union([z.coerce.number().int().positive(), z.literal('undefined')])
  .transform((val) => (val === 'undefined' ? undefined : val));

const variableDateViewFilterValueUnitSchema = z.enum([
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR',
]);

type VariableDateViewFilterValueUnit = z.infer<
  typeof variableDateViewFilterValueUnitSchema
>;

const variableDateViewFilterValuePartsSchema = z
  .object({
    direction: variableDateViewFilterValueDirectionSchema,
    amount: variableDateViewFilterValueAmountSchema,
    unit: variableDateViewFilterValueUnitSchema,
  })
  .refine((data) => !(data.amount === undefined && data.direction !== 'THIS'), {
    error: "Amount cannot be 'undefined' unless direction is 'THIS'",
  });

const variableDateViewFilterValueSchema = z.string().transform((value) => {
  const [direction, amount, unit] = value.split('_');

  return variableDateViewFilterValuePartsSchema.parse({
    direction,
    amount,
    unit,
  });
});

const addUnit = (
  date: Date,
  amount: number,
  unit: VariableDateViewFilterValueUnit,
) => {
  switch (unit) {
    case 'DAY':
      return addDays(date, amount);
    case 'WEEK':
      return addWeeks(date, amount);
    case 'MONTH':
      return addMonths(date, amount);
    case 'YEAR':
      return addYears(date, amount);
  }
};

const subUnit = (
  date: Date,
  amount: number,
  unit: VariableDateViewFilterValueUnit,
) => {
  switch (unit) {
    case 'DAY':
      return subDays(date, amount);
    case 'WEEK':
      return subWeeks(date, amount);
    case 'MONTH':
      return subMonths(date, amount);
    case 'YEAR':
      return subYears(date, amount);
  }
};

const startOfUnit = (date: Date, unit: VariableDateViewFilterValueUnit) => {
  switch (unit) {
    case 'DAY':
      return startOfDay(date);
    case 'WEEK':
      return startOfWeek(date);
    case 'MONTH':
      return startOfMonth(date);
    case 'YEAR':
      return startOfYear(date);
  }
};

const endOfUnit = (date: Date, unit: VariableDateViewFilterValueUnit) => {
  switch (unit) {
    case 'DAY':
      return endOfDay(date);
    case 'WEEK':
      return endOfWeek(date);
    case 'MONTH':
      return endOfMonth(date);
    case 'YEAR':
      return endOfYear(date);
  }
};

const resolveVariableDateViewFilterValueFromRelativeDate = (relativeDate: {
  direction: VariableDateViewFilterValueDirection;
  amount?: number;
  unit: VariableDateViewFilterValueUnit;
}) => {
  const { direction, amount, unit } = relativeDate;
  const now = roundToNearestMinutes(new Date());

  switch (direction) {
    case 'NEXT':
      if (amount === undefined) throw new Error('Amount is required');
      return {
        start: now,
        end: addUnit(now, amount, unit),
        ...relativeDate,
      };
    case 'PAST':
      if (amount === undefined) throw new Error('Amount is required');
      return {
        start: subUnit(now, amount, unit),
        end: now,
        ...relativeDate,
      };
    case 'THIS':
      return {
        start: startOfUnit(now, unit),
        end: endOfUnit(now, unit),
        ...relativeDate,
      };
  }
};

/**
 * Checks if a value is a relative date string (e.g., "NEXT_7_DAY", "THIS_MONTH")
 */
const isRelativeDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  const relativeDatePattern = /^(NEXT|THIS|PAST)_(\d+|undefined)_(DAY|WEEK|MONTH|YEAR)$/;
  return relativeDatePattern.test(value);
};

/**
 * Resolves a single date value that might be a relative date string
 * For operators like gte/gt, use the start of the range
 * For operators like lte/lt, use the end of the range
 */
const resolveDateValue = (
  value: FilterValue,
  operator: string,
): FilterValue => {
  if (!isRelativeDateString(value)) {
    return value;
  }

  try {
    const relativeDate = variableDateViewFilterValueSchema.parse(value);
    const resolved =
      resolveVariableDateViewFilterValueFromRelativeDate(relativeDate);

    // For greater-than operators, use the start of the range
    // For less-than operators, use the end of the range
    // For equality, use the start (could be expanded to a range in the future if needed)
    if (operator === 'gt' || operator === 'gte' || operator === 'eq') {
      return resolved.start.toISOString();
    } else if (operator === 'lt' || operator === 'lte' || operator === 'neq') {
      return resolved.end.toISOString();
    }

    // Default to start for unknown operators
    return resolved.start.toISOString();
  } catch {
    // If parsing fails, return the original value
    return value;
  }
};

/**
 * Checks if an object looks like a DateFilter
 */
const isDateFilter = (obj: unknown): obj is DateFilterOperators => {
  if (!obj || typeof obj !== 'object') return false;

  const dateFilterKeys = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is'];
  const keys = Object.keys(obj);

  return keys.length > 0 && keys.every((key) => dateFilterKeys.includes(key));
};

/**
 * Resolves date filters by converting relative date strings to ISO date strings
 */
const resolveDateFilter = (filter: DateFilterOperators): DateFilterOperators => {
  const resolved: Record<string, FilterValue | FilterValue[]> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null) {
      resolved[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      // Handle 'in' operator which takes an array
      resolved[key] = value.map((v) => resolveDateValue(v, 'in'));
    } else {
      resolved[key] = resolveDateValue(value, key);
    }
  }

  return resolved as DateFilterOperators;
};

/**
 * Recursively resolves relative dates in ObjectRecordFilterInput
 * Converts relative date strings (e.g., "NEXT_7_DAY", "THIS_MONTH") to ISO date strings
 */
export const resolveObjectRecordFilterDates = (
  filter: ObjectRecordFilter | null | undefined,
): ObjectRecordFilter | null | undefined => {
  if (!filter || typeof filter !== 'object') {
    return filter;
  }

  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    // Handle logical operators recursively
    if (key === 'and' || key === 'or') {
      if (Array.isArray(value)) {
        resolved[key] = value
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return resolveObjectRecordFilterDates(item as ObjectRecordFilter);
            }
            return item;
          })
          .filter((item): item is ObjectRecordFilter => item !== null && item !== undefined);
      }
      continue;
    }

    if (key === 'not') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        resolved.not = resolveObjectRecordFilterDates(
          value as ObjectRecordFilter,
        ) as ObjectRecordFilter;
      }
      continue;
    }

    // Check if the value is a DateFilter object
    if (isDateFilter(value)) {
      resolved[key] = resolveDateFilter(value);
      continue;
    }

    // Otherwise, keep the value as-is
    resolved[key] = value;
  }

  return resolved as ObjectRecordFilter;
};
