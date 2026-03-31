import { describe, it, expect } from 'vitest';
import { extendedVarieties } from '../seed-varieties-extended';

describe('seed-varieties-extended', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(extendedVarieties)).toBe(true);
    expect(extendedVarieties.length).toBeGreaterThan(20);
  });

  it('each variety has required fields', () => {
    for (const v of extendedVarieties) {
      expect(v.name).toBeTruthy();
      expect(typeof v.seedCostPerKg).toBe('number');
      expect(typeof v.defaultBlackoutDays).toBe('number');
      expect(typeof v.preSoakRequired).toBe('boolean');
      expect(typeof v.typicalDaysToHarvest).toBe('number');
    }
  });

  it('no duplicate names within extended', () => {
    const names = extendedVarieties.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes lettuce varieties', () => {
    const names = extendedVarieties.map((v) => v.name);
    expect(names.some((n) => n.startsWith('Lettuce'))).toBe(true);
  });

  it('includes herb varieties', () => {
    const names = extendedVarieties.map((v) => v.name);
    expect(names.some((n) => n.startsWith('Basil'))).toBe(true);
  });

  it('includes specialty varieties', () => {
    const names = extendedVarieties.map((v) => v.name);
    expect(names).toContain('Corn Shoots');
  });
});
