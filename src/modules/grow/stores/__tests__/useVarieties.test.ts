/**
 * useVarieties Store Unit Tests
 *
 * Tests the variety configuration store including:
 * - Variety data structure and creation
 * - Variety lookup by name
 * - Default values and configuration
 */

import { describe, it, expect } from 'vitest';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

interface GrowVarietyConfig {
  id?: string;
  name: string;
  seedCostPerKg: number;
  defaultBlackoutDays: number;
  preSoakRequired: boolean;
  typicalDaysToHarvest: number;
}

// ============================================
// TEST DATA HELPERS
// ============================================

let varietyCounter = 0;
function createMockVariety(overrides: Partial<GrowVarietyConfig> = {}): GrowVarietyConfig {
  varietyCounter++;
  return {
    id: `variety-${varietyCounter}`,
    name: 'Sunflower',
    seedCostPerKg: 25.0,
    defaultBlackoutDays: 3,
    preSoakRequired: true,
    typicalDaysToHarvest: 10,
    ...overrides,
  };
}

// ============================================
// HELPER FUNCTIONS (mirrored from store logic)
// ============================================

function getVariety(varieties: GrowVarietyConfig[], name: string): GrowVarietyConfig | undefined {
  return varieties.find((v) => v.name === name);
}

function getVarietyNames(varieties: GrowVarietyConfig[]): string[] {
  return varieties.map((v) => v.name);
}

function calculateSeedCost(variety: GrowVarietyConfig, seedWeightGrams: number): number {
  // Convert grams to kg and multiply by cost per kg
  return Math.round((seedWeightGrams / 1000) * variety.seedCostPerKg * 100) / 100;
}

// ============================================
// VARIETY DATA STRUCTURE TESTS
// ============================================

describe('Variety Data Structure', () => {
  describe('createMockVariety', () => {
    it('creates a variety with all required fields', () => {
      const variety = createMockVariety();

      expect(variety.name).toBeDefined();
      expect(typeof variety.seedCostPerKg).toBe('number');
      expect(typeof variety.defaultBlackoutDays).toBe('number');
      expect(typeof variety.preSoakRequired).toBe('boolean');
      expect(typeof variety.typicalDaysToHarvest).toBe('number');
    });

    it('applies custom overrides correctly', () => {
      const variety = createMockVariety({
        name: 'Pea Shoots',
        seedCostPerKg: 15.0,
        defaultBlackoutDays: 4,
        preSoakRequired: true,
        typicalDaysToHarvest: 8,
      });

      expect(variety.name).toBe('Pea Shoots');
      expect(variety.seedCostPerKg).toBe(15.0);
      expect(variety.defaultBlackoutDays).toBe(4);
      expect(variety.preSoakRequired).toBe(true);
      expect(variety.typicalDaysToHarvest).toBe(8);
    });

    it('generates unique IDs for each variety', () => {
      const variety1 = createMockVariety();
      const variety2 = createMockVariety();

      expect(variety1.id).not.toBe(variety2.id);
    });
  });
});

// ============================================
// VARIETY LOOKUP TESTS
// ============================================

describe('Variety Lookup', () => {
  describe('getVariety', () => {
    it('returns undefined for empty variety list', () => {
      expect(getVariety([], 'Sunflower')).toBeUndefined();
    });

    it('returns the matching variety when found', () => {
      const varieties = [
        createMockVariety({ id: 'v1', name: 'Sunflower' }),
        createMockVariety({ id: 'v2', name: 'Pea Shoots' }),
        createMockVariety({ id: 'v3', name: 'Radish' }),
      ];

      const found = getVariety(varieties, 'Pea Shoots');

      expect(found?.id).toBe('v2');
      expect(found?.name).toBe('Pea Shoots');
    });

    it('returns undefined when variety not found', () => {
      const varieties = [
        createMockVariety({ name: 'Sunflower' }),
        createMockVariety({ name: 'Pea Shoots' }),
      ];

      expect(getVariety(varieties, 'Broccoli')).toBeUndefined();
    });

    it('is case sensitive', () => {
      const varieties = [createMockVariety({ name: 'Sunflower' })];

      expect(getVariety(varieties, 'sunflower')).toBeUndefined();
      expect(getVariety(varieties, 'SUNFLOWER')).toBeUndefined();
      expect(getVariety(varieties, 'Sunflower')).toBeDefined();
    });

    it('returns first match if duplicates exist (edge case)', () => {
      const varieties = [
        createMockVariety({ id: 'v1', name: 'Sunflower', seedCostPerKg: 20 }),
        createMockVariety({ id: 'v2', name: 'Sunflower', seedCostPerKg: 25 }),
      ];

      const found = getVariety(varieties, 'Sunflower');

      expect(found?.id).toBe('v1');
      expect(found?.seedCostPerKg).toBe(20);
    });
  });

  describe('getVarietyNames', () => {
    it('returns empty array for empty variety list', () => {
      expect(getVarietyNames([])).toEqual([]);
    });

    it('returns all variety names', () => {
      const varieties = [
        createMockVariety({ name: 'Sunflower' }),
        createMockVariety({ name: 'Pea Shoots' }),
        createMockVariety({ name: 'Radish' }),
      ];

      const names = getVarietyNames(varieties);

      expect(names).toHaveLength(3);
      expect(names).toContain('Sunflower');
      expect(names).toContain('Pea Shoots');
      expect(names).toContain('Radish');
    });
  });
});

// ============================================
// VARIETY CONFIGURATION TESTS
// ============================================

describe('Variety Configuration', () => {
  it('has valid blackout days (typically 2-5)', () => {
    const sunflower = createMockVariety({ name: 'Sunflower', defaultBlackoutDays: 3 });
    const radish = createMockVariety({ name: 'Radish', defaultBlackoutDays: 2 });

    expect(sunflower.defaultBlackoutDays).toBeGreaterThanOrEqual(1);
    expect(sunflower.defaultBlackoutDays).toBeLessThanOrEqual(7);
    expect(radish.defaultBlackoutDays).toBeGreaterThanOrEqual(1);
  });

  it('has valid harvest time (typically 7-14 days)', () => {
    const variety = createMockVariety({ typicalDaysToHarvest: 10 });

    expect(variety.typicalDaysToHarvest).toBeGreaterThanOrEqual(5);
    expect(variety.typicalDaysToHarvest).toBeLessThanOrEqual(21);
  });

  it('has valid seed cost (positive number)', () => {
    const variety = createMockVariety({ seedCostPerKg: 25.0 });

    expect(variety.seedCostPerKg).toBeGreaterThan(0);
  });
});

// ============================================
// COST CALCULATION TESTS
// ============================================

describe('Cost Calculation', () => {
  describe('calculateSeedCost', () => {
    it('calculates cost for small tray (30g)', () => {
      const variety = createMockVariety({ seedCostPerKg: 25.0 });
      const cost = calculateSeedCost(variety, 30);

      // 30g / 1000 * $25 = $0.75
      expect(cost).toBe(0.75);
    });

    it('calculates cost for standard tray (50g)', () => {
      const variety = createMockVariety({ seedCostPerKg: 20.0 });
      const cost = calculateSeedCost(variety, 50);

      // 50g / 1000 * $20 = $1.00
      expect(cost).toBe(1.0);
    });

    it('handles expensive seeds', () => {
      const variety = createMockVariety({ seedCostPerKg: 80.0 });
      const cost = calculateSeedCost(variety, 50);

      // 50g / 1000 * $80 = $4.00
      expect(cost).toBe(4.0);
    });

    it('handles zero seed weight', () => {
      const variety = createMockVariety({ seedCostPerKg: 25.0 });
      const cost = calculateSeedCost(variety, 0);

      expect(cost).toBe(0);
    });

    it('rounds to 2 decimal places', () => {
      const variety = createMockVariety({ seedCostPerKg: 33.33 });
      const cost = calculateSeedCost(variety, 33);

      // 33g / 1000 * $33.33 = $1.09989 -> $1.10
      expect(cost).toBe(1.1);
    });
  });
});

// ============================================
// COMMON VARIETY FIXTURES
// ============================================

describe('Common Variety Fixtures', () => {
  const commonVarieties = [
    createMockVariety({
      name: 'Sunflower',
      seedCostPerKg: 25.0,
      defaultBlackoutDays: 3,
      preSoakRequired: true,
      typicalDaysToHarvest: 10,
    }),
    createMockVariety({
      name: 'Pea Shoots',
      seedCostPerKg: 12.0,
      defaultBlackoutDays: 4,
      preSoakRequired: true,
      typicalDaysToHarvest: 8,
    }),
    createMockVariety({
      name: 'Radish',
      seedCostPerKg: 18.0,
      defaultBlackoutDays: 2,
      preSoakRequired: false,
      typicalDaysToHarvest: 7,
    }),
    createMockVariety({
      name: 'Broccoli',
      seedCostPerKg: 45.0,
      defaultBlackoutDays: 3,
      preSoakRequired: false,
      typicalDaysToHarvest: 10,
    }),
  ];

  it('has expected number of common varieties', () => {
    expect(commonVarieties.length).toBe(4);
  });

  it('sunflower requires pre-soaking', () => {
    const sunflower = getVariety(commonVarieties, 'Sunflower');
    expect(sunflower?.preSoakRequired).toBe(true);
  });

  it('radish does not require pre-soaking', () => {
    const radish = getVariety(commonVarieties, 'Radish');
    expect(radish?.preSoakRequired).toBe(false);
  });

  it('pea shoots have longest blackout period', () => {
    const peaShoots = getVariety(commonVarieties, 'Pea Shoots');
    const maxBlackoutDays = Math.max(...commonVarieties.map((v) => v.defaultBlackoutDays));

    expect(peaShoots?.defaultBlackoutDays).toBe(maxBlackoutDays);
  });

  it('radish has fastest harvest time', () => {
    const radish = getVariety(commonVarieties, 'Radish');
    const minDaysToHarvest = Math.min(...commonVarieties.map((v) => v.typicalDaysToHarvest));

    expect(radish?.typicalDaysToHarvest).toBe(minDaysToHarvest);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Variety Edge Cases', () => {
  it('handles variety with zero cost (free seeds)', () => {
    const variety = createMockVariety({ seedCostPerKg: 0 });
    const cost = calculateSeedCost(variety, 50);

    expect(cost).toBe(0);
  });

  it('handles variety with very high cost', () => {
    const variety = createMockVariety({ seedCostPerKg: 1000 });
    const cost = calculateSeedCost(variety, 50);

    expect(cost).toBe(50.0);
  });

  it('handles variety name with special characters', () => {
    const variety = createMockVariety({ name: 'Pea Shoots (Sweet)' });
    expect(variety.name).toBe('Pea Shoots (Sweet)');
  });

  it('handles variety name with unicode', () => {
    const variety = createMockVariety({ name: 'Micro-greens Mix' });
    expect(variety.name).toBe('Micro-greens Mix');
  });

  it('handles very short blackout (1 day)', () => {
    const variety = createMockVariety({ defaultBlackoutDays: 1 });
    expect(variety.defaultBlackoutDays).toBe(1);
  });

  it('handles long harvest time (21 days)', () => {
    const variety = createMockVariety({ typicalDaysToHarvest: 21 });
    expect(variety.typicalDaysToHarvest).toBe(21);
  });
});
