import { describe, it, expect } from 'vitest';
import { defaultVarieties } from '../seed-varieties';

describe('seed-varieties', () => {
  it('exports a non-empty array of varieties', () => {
    expect(Array.isArray(defaultVarieties)).toBe(true);
    expect(defaultVarieties.length).toBeGreaterThan(50);
  });

  it('each variety has required fields', () => {
    for (const v of defaultVarieties) {
      expect(v.name).toBeTruthy();
      expect(typeof v.seedCostPerKg).toBe('number');
      expect(typeof v.defaultBlackoutDays).toBe('number');
      expect(typeof v.preSoakRequired).toBe('boolean');
      expect(typeof v.typicalDaysToHarvest).toBe('number');
    }
  });

  it('no duplicate variety names', () => {
    const names = defaultVarieties.map((v) => v.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('all costs are positive', () => {
    for (const v of defaultVarieties) {
      expect(v.seedCostPerKg).toBeGreaterThan(0);
    }
  });

  it('all days to harvest are reasonable', () => {
    for (const v of defaultVarieties) {
      expect(v.typicalDaysToHarvest).toBeGreaterThanOrEqual(7);
      expect(v.typicalDaysToHarvest).toBeLessThanOrEqual(25);
    }
  });

  it('all blackout days are positive', () => {
    for (const v of defaultVarieties) {
      expect(v.defaultBlackoutDays).toBeGreaterThanOrEqual(2);
      expect(v.defaultBlackoutDays).toBeLessThanOrEqual(6);
    }
  });
});
