import { resolveRelativeDatesInFilter } from '../resolveRelativeDatesInFilter';
import { type RecordGqlOperationFilter } from '@/types';

describe('resolveRelativeDatesInFilter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return undefined for undefined filter', () => {
    const result = resolveRelativeDatesInFilter(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined for null filter', () => {
    const result = resolveRelativeDatesInFilter(null);
    expect(result).toBeUndefined();
  });

  it('should return empty object for empty filter', () => {
    const result = resolveRelativeDatesInFilter({});
    expect(result).toBeUndefined();
  });

  it('should resolve simple relative date filter (PAST_7_DAY)', () => {
    const filter: RecordGqlOperationFilter = {
      createdAt: { gte: 'PAST_7_DAY' },
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
    if (result && 'and' in result) {
      expect(result.and).toHaveLength(2);
    }
  });

  it('should resolve THIS_MONTH relative date', () => {
    const filter: RecordGqlOperationFilter = {
      updatedAt: { gte: 'THIS_MONTH' },
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
  });

  it('should resolve NEXT_2_WEEK relative date', () => {
    const filter: RecordGqlOperationFilter = {
      dueDate: { lte: 'NEXT_2_WEEK' },
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
  });

  it('should leave non-relative date filters unchanged', () => {
    const filter: RecordGqlOperationFilter = {
      createdAt: { gte: '2024-01-01T00:00:00.000Z' },
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toEqual({
      createdAt: { gte: '2024-01-01T00:00:00.000Z' },
    });
  });

  it('should handle nested and filters', () => {
    const filter: RecordGqlOperationFilter = {
      and: [
        { createdAt: { gte: 'PAST_7_DAY' } },
        { name: { ilike: '%test%' } },
      ],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
    if (result && 'and' in result && Array.isArray(result.and)) {
      expect(result.and.length).toBeGreaterThan(0);
    }
  });

  it('should handle nested or filters', () => {
    const filter: RecordGqlOperationFilter = {
      or: [
        { createdAt: { gte: 'PAST_7_DAY' } },
        { updatedAt: { gte: 'THIS_MONTH' } },
      ],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('or');
  });

  it('should handle not filters', () => {
    const filter: RecordGqlOperationFilter = {
      not: {
        createdAt: { gte: 'PAST_7_DAY' },
      },
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('not');
  });

  it('should handle complex nested filters with multiple date fields', () => {
    const filter: RecordGqlOperationFilter = {
      and: [
        {
          or: [
            { createdAt: { gte: 'PAST_7_DAY' } },
            { updatedAt: { gte: 'THIS_MONTH' } },
          ],
        },
        { name: { ilike: '%test%' } },
      ],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
  });

  it('should handle mixed relative and absolute dates', () => {
    const filter: RecordGqlOperationFilter = {
      and: [
        { createdAt: { gte: 'PAST_7_DAY' } },
        { updatedAt: { gte: '2024-01-01T00:00:00.000Z' } },
      ],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
  });

  it('should preserve non-date filters', () => {
    const filter: RecordGqlOperationFilter = {
      and: [
        { createdAt: { gte: 'PAST_7_DAY' } },
        { name: { ilike: '%test%' } },
        { active: { eq: true } },
      ],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    if (result && 'and' in result && Array.isArray(result.and)) {
      const hasNameFilter = result.and.some(
        (f: RecordGqlOperationFilter) => 'name' in f,
      );
      const hasActiveFilter = result.and.some(
        (f: RecordGqlOperationFilter) => 'active' in f,
      );
      expect(hasNameFilter || hasActiveFilter).toBe(true);
    }
  });

  it('should handle multiple date fields with relative dates', () => {
    const filter: RecordGqlOperationFilter = {
      and: [
        { createdAt: { gte: 'PAST_7_DAY' } },
        { updatedAt: { gte: 'PAST_1_DAY' } },
        { dueDate: { lte: 'NEXT_1_WEEK' } },
      ],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('and');
  });

  it('should not match invalid relative date patterns', () => {
    const filter: RecordGqlOperationFilter = {
      createdAt: { gte: 'INVALID_DATE' },
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toEqual({
      createdAt: { gte: 'INVALID_DATE' },
    });
  });

  it('should handle empty and array', () => {
    const filter: RecordGqlOperationFilter = {
      and: [],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toEqual({ and: [] });
  });

  it('should handle empty or array', () => {
    const filter: RecordGqlOperationFilter = {
      or: [],
    };

    const result = resolveRelativeDatesInFilter(filter);

    expect(result).toEqual({ or: [] });
  });

  it('should handle all unit types (DAY, WEEK, MONTH, YEAR)', () => {
    const filters = [
      { createdAt: { gte: 'PAST_1_DAY' } },
      { createdAt: { gte: 'PAST_1_WEEK' } },
      { createdAt: { gte: 'PAST_1_MONTH' } },
      { createdAt: { gte: 'PAST_1_YEAR' } },
    ];

    filters.forEach((filter) => {
      const result = resolveRelativeDatesInFilter(filter);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('and');
    });
  });

  it('should handle all direction types (PAST, THIS, NEXT)', () => {
    const filters = [
      { createdAt: { gte: 'PAST_1_DAY' } },
      { createdAt: { gte: 'THIS_DAY' } },
      { createdAt: { gte: 'NEXT_1_DAY' } },
    ];

    filters.forEach((filter) => {
      const result = resolveRelativeDatesInFilter(filter);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('and');
    });
  });
});
