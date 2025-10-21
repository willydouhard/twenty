import { resolveObjectRecordFilterDates } from '../resolveObjectRecordFilterDates';

describe('resolveObjectRecordFilterDates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('simple date filters', () => {
    it('should resolve relative date string in gte operator', () => {
      const filter = {
        createdAt: {
          gte: 'NEXT_7_DAY',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt).toBeDefined();
      expect(typeof result?.createdAt?.gte).toBe('string');
      expect(result?.createdAt?.gte).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should resolve relative date string in lte operator', () => {
      const filter = {
        updatedAt: {
          lte: 'PAST_30_DAY',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.updatedAt).toBeDefined();
      expect(typeof result?.updatedAt?.lte).toBe('string');
      expect(result?.updatedAt?.lte).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should resolve THIS_MONTH in eq operator', () => {
      const filter = {
        createdAt: {
          eq: 'THIS_undefined_MONTH',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt).toBeDefined();
      expect(typeof result?.createdAt?.eq).toBe('string');
      expect(result?.createdAt?.eq).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should preserve non-relative date strings', () => {
      const filter = {
        createdAt: {
          gte: '2024-01-01T00:00:00.000Z',
          lte: '2024-12-31T23:59:59.999Z',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.gte).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.createdAt?.lte).toBe('2024-12-31T23:59:59.999Z');
    });

    it('should handle gt operator with relative date', () => {
      const filter = {
        createdAt: {
          gt: 'PAST_1_WEEK',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt).toBeDefined();
      expect(typeof result?.createdAt?.gt).toBe('string');
    });

    it('should handle lt operator with relative date', () => {
      const filter = {
        createdAt: {
          lt: 'NEXT_1_YEAR',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt).toBeDefined();
      expect(typeof result?.createdAt?.lt).toBe('string');
    });
  });

  describe('nested and/or/not operators', () => {
    it('should resolve dates in and operator', () => {
      const filter = {
        and: [
          {
            createdAt: {
              gte: 'PAST_7_DAY',
            },
          },
          {
            updatedAt: {
              lte: 'NEXT_30_DAY',
            },
          },
        ],
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.and).toBeDefined();
      expect(result?.and).toHaveLength(2);
      expect(typeof result?.and?.[0]?.createdAt?.gte).toBe('string');
      expect(typeof result?.and?.[1]?.updatedAt?.lte).toBe('string');
    });

    it('should resolve dates in or operator', () => {
      const filter = {
        or: [
          {
            createdAt: {
              gte: 'THIS_undefined_WEEK',
            },
          },
          {
            updatedAt: {
              lte: 'THIS_undefined_MONTH',
            },
          },
        ],
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.or).toBeDefined();
      expect(result?.or).toHaveLength(2);
      expect(typeof result?.or?.[0]?.createdAt?.gte).toBe('string');
      expect(typeof result?.or?.[1]?.updatedAt?.lte).toBe('string');
    });

    it('should resolve dates in not operator', () => {
      const filter = {
        not: {
          createdAt: {
            gte: 'PAST_1_YEAR',
          },
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.not).toBeDefined();
      expect(typeof result?.not?.createdAt?.gte).toBe('string');
    });

    it('should handle deeply nested operators', () => {
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
                updatedAt: {
                  lte: 'NEXT_7_DAY',
                },
              },
            ],
          },
          {
            not: {
              deletedAt: {
                eq: 'THIS_undefined_DAY',
              },
            },
          },
        ],
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.and?.[0]?.or?.[0]?.createdAt?.gte).toBeDefined();
      expect(typeof result?.and?.[0]?.or?.[0]?.createdAt?.gte).toBe('string');
      expect(result?.and?.[0]?.or?.[1]?.updatedAt?.lte).toBeDefined();
      expect(typeof result?.and?.[0]?.or?.[1]?.updatedAt?.lte).toBe('string');
      expect(result?.and?.[1]?.not?.deletedAt?.eq).toBeDefined();
      expect(typeof result?.and?.[1]?.not?.deletedAt?.eq).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle null filter', () => {
      const result = resolveObjectRecordFilterDates(null);
      expect(result).toBeNull();
    });

    it('should handle undefined filter', () => {
      const result = resolveObjectRecordFilterDates(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle empty filter object', () => {
      const filter = {};
      const result = resolveObjectRecordFilterDates(filter);
      expect(result).toEqual({});
    });

    it('should handle filter with no date fields', () => {
      const filter = {
        id: {
          eq: 'some-uuid',
        },
        name: {
          ilike: '%test%',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);
      expect(result).toEqual(filter);
    });

    it('should handle invalid relative date strings gracefully', () => {
      const filter = {
        createdAt: {
          gte: 'INVALID_DATE_STRING',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.gte).toBe('INVALID_DATE_STRING');
    });

    it('should handle malformed relative date strings', () => {
      const filter = {
        createdAt: {
          gte: 'NEXT_ABC_DAY',
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.gte).toBe('NEXT_ABC_DAY');
    });

    it('should preserve null values in date filters', () => {
      const filter = {
        createdAt: {
          gte: null,
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.gte).toBeNull();
    });

    it('should preserve undefined values in date filters', () => {
      const filter = {
        createdAt: {
          gte: undefined,
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.gte).toBeUndefined();
    });
  });

  describe('in operator with arrays', () => {
    it('should resolve array of relative dates in in operator', () => {
      const filter = {
        createdAt: {
          in: ['PAST_7_DAY', 'NEXT_7_DAY'],
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.in).toBeDefined();
      expect(Array.isArray(result?.createdAt?.in)).toBe(true);
      expect(result?.createdAt?.in).toHaveLength(2);
      expect(typeof result?.createdAt?.in?.[0]).toBe('string');
      expect(typeof result?.createdAt?.in?.[1]).toBe('string');
      expect(result?.createdAt?.in?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result?.createdAt?.in?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle mixed array with relative and absolute dates', () => {
      const filter = {
        createdAt: {
          in: ['PAST_7_DAY', '2024-01-01T00:00:00.000Z', 'NEXT_7_DAY'],
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.in).toBeDefined();
      expect(result?.createdAt?.in).toHaveLength(3);
      expect(result?.createdAt?.in?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result?.createdAt?.in?.[1]).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.createdAt?.in?.[2]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should preserve empty arrays', () => {
      const filter = {
        createdAt: {
          in: [],
        },
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.createdAt?.in).toEqual([]);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle complex filter with multiple date fields and operators', () => {
      const filter = {
        and: [
          {
            createdAt: {
              gte: 'PAST_30_DAY',
            },
          },
          {
            or: [
              {
                updatedAt: {
                  lte: 'NEXT_7_DAY',
                },
              },
              {
                deletedAt: {
                  eq: null,
                },
              },
            ],
          },
        ],
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.and?.[0]?.createdAt?.gte).toBeDefined();
      expect(typeof result?.and?.[0]?.createdAt?.gte).toBe('string');
      expect(result?.and?.[1]?.or?.[0]?.updatedAt?.lte).toBeDefined();
      expect(typeof result?.and?.[1]?.or?.[0]?.updatedAt?.lte).toBe('string');
      expect(result?.and?.[1]?.or?.[1]?.deletedAt?.eq).toBeNull();
    });

    it('should handle filter combining date and non-date fields', () => {
      const filter = {
        and: [
          {
            createdAt: {
              gte: 'THIS_undefined_MONTH',
            },
          },
          {
            name: {
              ilike: '%test%',
            },
          },
          {
            status: {
              eq: 'active',
            },
          },
        ],
      };

      const result = resolveObjectRecordFilterDates(filter);

      expect(result?.and?.[0]?.createdAt?.gte).toBeDefined();
      expect(typeof result?.and?.[0]?.createdAt?.gte).toBe('string');
      expect(result?.and?.[1]?.name?.ilike).toBe('%test%');
      expect(result?.and?.[2]?.status?.eq).toBe('active');
    });
  });

  describe('all relative date formats', () => {
    it('should resolve NEXT_X_DAY format', () => {
      const filter = { createdAt: { gte: 'NEXT_7_DAY' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.gte).toBe('string');
    });

    it('should resolve NEXT_X_WEEK format', () => {
      const filter = { createdAt: { gte: 'NEXT_2_WEEK' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.gte).toBe('string');
    });

    it('should resolve NEXT_X_MONTH format', () => {
      const filter = { createdAt: { gte: 'NEXT_3_MONTH' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.gte).toBe('string');
    });

    it('should resolve NEXT_X_YEAR format', () => {
      const filter = { createdAt: { gte: 'NEXT_1_YEAR' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.gte).toBe('string');
    });

    it('should resolve PAST_X_DAY format', () => {
      const filter = { createdAt: { lte: 'PAST_7_DAY' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.lte).toBe('string');
    });

    it('should resolve PAST_X_WEEK format', () => {
      const filter = { createdAt: { lte: 'PAST_2_WEEK' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.lte).toBe('string');
    });

    it('should resolve PAST_X_MONTH format', () => {
      const filter = { createdAt: { lte: 'PAST_6_MONTH' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.lte).toBe('string');
    });

    it('should resolve PAST_X_YEAR format', () => {
      const filter = { createdAt: { lte: 'PAST_1_YEAR' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.lte).toBe('string');
    });

    it('should resolve THIS_DAY format', () => {
      const filter = { createdAt: { eq: 'THIS_undefined_DAY' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.eq).toBe('string');
    });

    it('should resolve THIS_WEEK format', () => {
      const filter = { createdAt: { eq: 'THIS_undefined_WEEK' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.eq).toBe('string');
    });

    it('should resolve THIS_MONTH format', () => {
      const filter = { createdAt: { eq: 'THIS_undefined_MONTH' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.eq).toBe('string');
    });

    it('should resolve THIS_YEAR format', () => {
      const filter = { createdAt: { eq: 'THIS_undefined_YEAR' } };
      const result = resolveObjectRecordFilterDates(filter);
      expect(typeof result?.createdAt?.eq).toBe('string');
    });
  });
});
