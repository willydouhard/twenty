import { FieldMetadataType } from '@/types/FieldMetadataType';
import { type PartialFieldMetadataItem } from '@/types/PartialFieldMetadataItem';
import { resolveRelativeDatesInObjectRecordFilter } from '../resolveRelativeDatesInObjectRecordFilter';

describe('resolveRelativeDatesInObjectRecordFilter', () => {
  const mockFieldMetadataItems: PartialFieldMetadataItem[] = [
    {
      id: '1',
      name: 'createdAt',
      type: FieldMetadataType.DATE_TIME,
      label: 'Created At',
    },
    {
      id: '2',
      name: 'dueDate',
      type: FieldMetadataType.DATE,
      label: 'Due Date',
    },
    {
      id: '3',
      name: 'name',
      type: FieldMetadataType.TEXT,
      label: 'Name',
    },
  ];

  it('should return filter unchanged if filter is null or undefined', () => {
    expect(
      resolveRelativeDatesInObjectRecordFilter(null, mockFieldMetadataItems),
    ).toBeNull();
    expect(
      resolveRelativeDatesInObjectRecordFilter(undefined, mockFieldMetadataItems),
    ).toBeUndefined();
  });

  it('should return filter unchanged if fieldMetadataItems is empty', () => {
    const filter = { createdAt: { gte: 'PAST_7_DAY' } };
    expect(resolveRelativeDatesInObjectRecordFilter(filter, [])).toEqual(
      filter,
    );
  });

  it('should resolve a simple relative date filter for a date field', () => {
    const filter = {
      createdAt: {
        gte: 'PAST_7_DAY',
      },
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('and');
    expect(Array.isArray(result?.and)).toBe(true);
    expect(result?.and).toHaveLength(2);
    expect((result?.and as any)?.[0]).toHaveProperty('createdAt.gte');
    expect((result?.and as any)?.[1]).toHaveProperty('createdAt.lte');
    expect(typeof (result?.and as any)?.[0]?.createdAt?.gte).toBe('string');
    expect(typeof (result?.and as any)?.[1]?.createdAt?.lte).toBe('string');
  });

  it('should not transform non-date fields', () => {
    const filter = {
      name: {
        eq: 'PAST_7_DAY',
      },
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toEqual(filter);
  });

  it('should not transform date fields without relative date values', () => {
    const filter = {
      createdAt: {
        gte: '2023-01-01T00:00:00.000Z',
      },
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toEqual(filter);
  });

  it('should handle nested and/or/not operators', () => {
    const filter = {
      and: [
        {
          createdAt: {
            gte: 'PAST_7_DAY',
          },
        },
        {
          name: {
            eq: 'Test',
          },
        },
      ],
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('and');
    expect(Array.isArray(result?.and)).toBe(true);
    // First element should be expanded into and conditions
    // Second element should remain unchanged
    expect((result?.and as any)?.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle or operator with relative dates', () => {
    const filter = {
      or: [
        {
          createdAt: {
            gte: 'PAST_7_DAY',
          },
        },
        {
          dueDate: {
            lte: 'NEXT_30_DAY',
          },
        },
      ],
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('or');
    expect(Array.isArray(result?.or)).toBe(true);
    expect(result?.or).toHaveLength(2);
  });

  it('should handle not operator with relative dates', () => {
    const filter = {
      not: {
        createdAt: {
          gte: 'PAST_7_DAY',
        },
      },
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('not');
  });

  it('should handle THIS_1_MONTH relative date', () => {
    const filter = {
      createdAt: {
        gte: 'THIS_1_MONTH',
      },
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('and');
    expect(Array.isArray(result?.and)).toBe(true);
    expect(result?.and).toHaveLength(2);
  });

  it('should handle NEXT_X_YEAR relative date', () => {
    const filter = {
      dueDate: {
        lte: 'NEXT_1_YEAR',
      },
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('and');
    expect(Array.isArray(result?.and)).toBe(true);
    expect(result?.and).toHaveLength(2);
  });

  it('should handle complex nested filters with mixed relative and absolute dates', () => {
    const filter = {
      and: [
        {
          or: [
            {
              createdAt: {
                gte: 'PAST_7_DAY',
              },
            },
            {
              createdAt: {
                gte: '2023-01-01T00:00:00.000Z',
              },
            },
          ],
        },
        {
          name: {
            eq: 'Test',
          },
        },
      ],
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('and');
    expect(Array.isArray(result?.and)).toBe(true);
  });

  it('should handle empty filter object', () => {
    const filter = {};

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toEqual({});
  });

  it('should transform all operator types (gt, lt, eq) to range filters consistently', () => {
    const filterWithGt = {
      createdAt: {
        gt: 'PAST_7_DAY',
      },
    };

    const resultGt = resolveRelativeDatesInObjectRecordFilter(
      filterWithGt,
      mockFieldMetadataItems,
    );

    expect(resultGt).toHaveProperty('and');
    expect(Array.isArray(resultGt?.and)).toBe(true);
    expect(resultGt?.and).toHaveLength(2);

    const filterWithLt = {
      createdAt: {
        lt: 'PAST_7_DAY',
      },
    };

    const resultLt = resolveRelativeDatesInObjectRecordFilter(
      filterWithLt,
      mockFieldMetadataItems,
    );

    expect(resultLt).toHaveProperty('and');
    expect(Array.isArray(resultLt?.and)).toBe(true);
    expect(resultLt?.and).toHaveLength(2);

    const filterWithEq = {
      createdAt: {
        eq: 'THIS_1_MONTH',
      },
    };

    const resultEq = resolveRelativeDatesInObjectRecordFilter(
      filterWithEq,
      mockFieldMetadataItems,
    );

    expect(resultEq).toHaveProperty('and');
    expect(Array.isArray(resultEq?.and)).toBe(true);
    expect(resultEq?.and).toHaveLength(2);
  });

  it('should handle mixed relative and non-relative values in separate filters', () => {
    const filter = {
      and: [
        {
          createdAt: {
            gte: 'PAST_7_DAY',
          },
        },
        {
          dueDate: {
            lte: '2023-12-31T00:00:00.000Z',
          },
        },
      ],
    };

    const result = resolveRelativeDatesInObjectRecordFilter(
      filter,
      mockFieldMetadataItems,
    );

    expect(result).toHaveProperty('and');
    expect(Array.isArray(result?.and)).toBe(true);
  });
});
