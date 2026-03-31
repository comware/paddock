import { describe, it, expect } from 'vitest';
import { getAverageCostPerPropagule } from '../analyticsCosts';
import type { PropBatch, PropBatchCost } from '../../types';

function makeBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  return {
    id: '1',
    quantityStarted: 10,
    quantitySurviving: 8,
    stage: 'graduated',
    ...overrides,
  } as PropBatch;
}

function makeCost(batchId: string, amount: number): PropBatchCost {
  return {
    batchId,
    calculatedCost: amount,
    manualCost: undefined,
  } as PropBatchCost;
}

describe('analyticsCosts', () => {
  describe('getAverageCostPerPropagule', () => {
    it('returns zeros for empty arrays', () => {
      const result = getAverageCostPerPropagule([], []);
      expect(result.perStarted).toBe(0);
      expect(result.perSurviving).toBe(0);
    });

    it('calculates cost per started propagule', () => {
      const batches = [makeBatch({ id: 'b1', quantityStarted: 10, quantitySurviving: 8 })];
      const costs = [makeCost('b1', 20)];
      const result = getAverageCostPerPropagule(batches, costs);
      expect(result.perStarted).toBe(2); // 20/10
    });

    it('calculates cost per surviving propagule', () => {
      const batches = [makeBatch({ id: 'b1', quantityStarted: 10, quantitySurviving: 5 })];
      const costs = [makeCost('b1', 20)];
      const result = getAverageCostPerPropagule(batches, costs);
      expect(result.perSurviving).toBe(4); // 20/5
    });

    it('aggregates multiple costs per batch', () => {
      const batches = [makeBatch({ id: 'b1', quantityStarted: 10, quantitySurviving: 10 })];
      const costs = [makeCost('b1', 10), makeCost('b1', 15)];
      const result = getAverageCostPerPropagule(batches, costs);
      expect(result.perStarted).toBe(2.5); // 25/10
    });

    it('handles batches with no costs', () => {
      const batches = [makeBatch({ id: 'b1', quantityStarted: 10, quantitySurviving: 10 })];
      const result = getAverageCostPerPropagule(batches, []);
      expect(result.perStarted).toBe(0);
    });
  });
});
