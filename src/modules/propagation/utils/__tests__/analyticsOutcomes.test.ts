import { describe, it, expect } from 'vitest';
import { getOutcomeDistribution } from '../analyticsOutcomes';
import type { PropGraduation } from '../../types';

function makeGraduation(outcome: string, quantity: number = 1): PropGraduation {
  return { outcome, quantity } as PropGraduation;
}

describe('analyticsOutcomes', () => {
  describe('getOutcomeDistribution', () => {
    it('returns empty array for no graduations', () => {
      expect(getOutcomeDistribution([])).toEqual([]);
    });

    it('counts single outcome type', () => {
      const grads = [makeGraduation('planted_garden', 5)];
      const result = getOutcomeDistribution(grads);
      expect(result.length).toBe(1);
      expect(result[0].outcome).toBe('planted_garden');
      expect(result[0].quantity).toBe(5);
    });

    it('groups by outcome type', () => {
      const grads = [
        makeGraduation('planted_garden', 5),
        makeGraduation('planted_garden', 3),
        makeGraduation('gifted', 2),
      ];
      const result = getOutcomeDistribution(grads);
      expect(result.length).toBe(2);
    });

    it('calculates percentages', () => {
      const grads = [
        makeGraduation('planted_garden'),
        makeGraduation('gifted'),
      ];
      const result = getOutcomeDistribution(grads);
      const totalPct = result.reduce((sum, r) => sum + r.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });

    it('includes count and quantity', () => {
      const grads = [
        makeGraduation('sold', 10),
        makeGraduation('sold', 5),
      ];
      const result = getOutcomeDistribution(grads);
      expect(result[0].count).toBe(2);
      expect(result[0].quantity).toBe(15);
    });
  });
});
