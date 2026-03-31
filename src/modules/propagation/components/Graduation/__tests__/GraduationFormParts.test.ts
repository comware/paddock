import { describe, it, expect } from 'vitest';
import { OUTCOME_OPTIONS } from '../GraduationFormParts';

describe('GraduationFormParts', () => {
  describe('OUTCOME_OPTIONS', () => {
    it('has 5 outcome options', () => {
      expect(OUTCOME_OPTIONS).toHaveLength(5);
    });

    it('each option has required fields', () => {
      for (const opt of OUTCOME_OPTIONS) {
        expect(opt.value).toBeTruthy();
        expect(opt.label).toBeTruthy();
        expect(opt.description).toBeTruthy();
        expect(opt.icon).toBeTruthy();
      }
    });

    it('includes planted_garden', () => {
      expect(OUTCOME_OPTIONS.find((o) => o.value === 'planted_garden')).toBeTruthy();
    });

    it('includes gifted', () => {
      expect(OUTCOME_OPTIONS.find((o) => o.value === 'gifted')).toBeTruthy();
    });

    it('includes sold', () => {
      expect(OUTCOME_OPTIONS.find((o) => o.value === 'sold')).toBeTruthy();
    });

    it('includes composted', () => {
      expect(OUTCOME_OPTIONS.find((o) => o.value === 'composted')).toBeTruthy();
    });

    it('includes personal_use', () => {
      expect(OUTCOME_OPTIONS.find((o) => o.value === 'personal_use')).toBeTruthy();
    });
  });
});
