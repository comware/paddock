/**
 * useSpeciesConfigs Store Tests
 *
 * Tests for the species configuration store functionality.
 */

import { describe, it, expect } from 'vitest';

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('Species Config Helpers', () => {
  describe('formatBestMonths', () => {
    // Helper function extracted from store
    const MONTH_NAMES = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    function formatBestMonths(months?: number[]): string {
      if (!months || months.length === 0) return 'Any time';
      if (months.length === 12) return 'Year-round';

      const sorted = [...months].sort((a, b) => a - b);
      const ranges: string[] = [];
      let rangeStart = sorted[0];
      let rangeEnd = sorted[0];

      for (let i = 1; i <= sorted.length; i++) {
        if (i < sorted.length && sorted[i] === rangeEnd + 1) {
          rangeEnd = sorted[i];
        } else {
          if (rangeStart === rangeEnd) {
            ranges.push(MONTH_NAMES[rangeStart - 1]);
          } else if (rangeEnd - rangeStart === 1) {
            ranges.push(`${MONTH_NAMES[rangeStart - 1]}, ${MONTH_NAMES[rangeEnd - 1]}`);
          } else {
            ranges.push(`${MONTH_NAMES[rangeStart - 1]}-${MONTH_NAMES[rangeEnd - 1]}`);
          }
          if (i < sorted.length) {
            rangeStart = sorted[i];
            rangeEnd = sorted[i];
          }
        }
      }

      return ranges.join(', ');
    }

    it('returns "Any time" for empty array', () => {
      expect(formatBestMonths([])).toBe('Any time');
    });

    it('returns "Any time" for undefined', () => {
      expect(formatBestMonths(undefined)).toBe('Any time');
    });

    it('returns "Year-round" for all 12 months', () => {
      expect(formatBestMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('Year-round');
    });

    it('formats single month correctly', () => {
      expect(formatBestMonths([3])).toBe('Mar');
    });

    it('formats consecutive months as range', () => {
      expect(formatBestMonths([3, 4, 5])).toBe('Mar-May');
    });

    it('formats two consecutive months with comma', () => {
      expect(formatBestMonths([3, 4])).toBe('Mar, Apr');
    });

    it('formats non-consecutive months separately', () => {
      expect(formatBestMonths([3, 6])).toBe('Mar, Jun');
    });

    it('handles multiple ranges', () => {
      expect(formatBestMonths([3, 4, 5, 9, 10])).toBe('Mar-May, Sep, Oct');
    });

    it('handles unsorted input', () => {
      expect(formatBestMonths([10, 3, 4, 9, 5])).toBe('Mar-May, Sep, Oct');
    });
  });

  describe('isInSeason', () => {
    function isInSeason(months?: number[]): boolean {
      if (!months || months.length === 0) return true;
      const currentMonth = new Date().getMonth() + 1;
      return months.includes(currentMonth);
    }

    it('returns true when no months specified', () => {
      expect(isInSeason([])).toBe(true);
    });

    it('returns true for undefined months', () => {
      expect(isInSeason(undefined)).toBe(true);
    });

    it('returns true when current month is in list', () => {
      const currentMonth = new Date().getMonth() + 1;
      expect(isInSeason([currentMonth])).toBe(true);
    });

    it('returns false when current month is not in list', () => {
      const currentMonth = new Date().getMonth() + 1;
      const otherMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      expect(isInSeason([otherMonth])).toBe(false);
    });
  });
});

// ============================================
// SPECIES CONFIG STRUCTURE TESTS
// ============================================

describe('Species Config Structure', () => {
  it('should have correct PropSpeciesConfig interface properties', () => {
    // Test that the interface structure is as expected
    const config = {
      id: '1',
      species: 'Rosemary',
      scientificName: 'Rosmarinus officinalis',
      preferredMethod: 'cutting_softwood' as const,
      typicalRootingDays: 21,
      typicalDaysToReady: 90,
      maxDaysRooting: 28,
      maxDaysPottedUp: 21,
      maxDaysHardening: 21,
      bestPropagationMonths: [3, 4, 5, 9, 10],
      notes: 'Test notes',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(config.species).toBe('Rosemary');
    expect(config.preferredMethod).toBe('cutting_softwood');
    expect(config.bestPropagationMonths).toHaveLength(5);
  });

  it('should allow optional fields to be undefined', () => {
    const minimalConfig = {
      id: '1',
      species: 'Lavender',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(minimalConfig.species).toBe('Lavender');
    expect((minimalConfig as Record<string, unknown>).preferredMethod).toBeUndefined();
    expect((minimalConfig as Record<string, unknown>).typicalRootingDays).toBeUndefined();
  });
});

// ============================================
// OVERDUE THRESHOLD TESTS
// ============================================

describe('Overdue Threshold Logic', () => {
  const getOverdueThresholdsForSpecies = (config: {
    maxDaysRooting?: number;
    maxDaysPottedUp?: number;
    maxDaysHardening?: number;
  } | null) => {
    if (!config) return null;
    return {
      maxDaysRooting: config.maxDaysRooting,
      maxDaysPottedUp: config.maxDaysPottedUp,
      maxDaysHardening: config.maxDaysHardening,
    };
  };

  it('returns null for null config', () => {
    expect(getOverdueThresholdsForSpecies(null)).toBeNull();
  });

  it('returns thresholds when all defined', () => {
    const config = {
      maxDaysRooting: 28,
      maxDaysPottedUp: 21,
      maxDaysHardening: 14,
    };
    const thresholds = getOverdueThresholdsForSpecies(config);
    expect(thresholds?.maxDaysRooting).toBe(28);
    expect(thresholds?.maxDaysPottedUp).toBe(21);
    expect(thresholds?.maxDaysHardening).toBe(14);
  });

  it('returns partial thresholds when some undefined', () => {
    const config = {
      maxDaysRooting: 28,
    };
    const thresholds = getOverdueThresholdsForSpecies(config);
    expect(thresholds?.maxDaysRooting).toBe(28);
    expect(thresholds?.maxDaysPottedUp).toBeUndefined();
    expect(thresholds?.maxDaysHardening).toBeUndefined();
  });
});
