import { describe, it, expect } from 'vitest';
import { OUTCOME_OPTIONS, QUICK_QUANTITIES } from '../GraduationModalParts';

describe('GraduationModalParts', () => {
  describe('OUTCOME_OPTIONS', () => {
    it('has 5 outcome options', () => {
      expect(OUTCOME_OPTIONS).toHaveLength(5);
    });

    it('each option has value, label, icon, and description', () => {
      for (const opt of OUTCOME_OPTIONS) {
        expect(opt.value).toBeTruthy();
        expect(opt.label).toBeTruthy();
        expect(opt.icon).toBeTruthy();
        expect(opt.description).toBeTruthy();
      }
    });

    it('no duplicate values', () => {
      const values = OUTCOME_OPTIONS.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('QUICK_QUANTITIES', () => {
    it('contains expected quick quantities', () => {
      expect(QUICK_QUANTITIES).toContain(1);
      expect(QUICK_QUANTITIES).toContain(5);
      expect(QUICK_QUANTITIES).toContain(10);
    });

    it('is sorted ascending', () => {
      for (let i = 1; i < QUICK_QUANTITIES.length; i++) {
        expect(QUICK_QUANTITIES[i]).toBeGreaterThan(QUICK_QUANTITIES[i - 1]);
      }
    });
  });
});
