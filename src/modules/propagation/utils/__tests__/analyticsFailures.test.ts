import { describe, it, expect } from 'vitest';
import { getFailuresByStage } from '../analyticsFailures';
import type { PropBatch, PropStageTransition } from '../../types';

function makeBatch(id: string, stage: string): PropBatch {
  return { id, stage } as PropBatch;
}

function makeTransition(batchId: string, fromStage: string, toStage: string): PropStageTransition {
  return { batchId, fromStage, toStage } as PropStageTransition;
}

describe('analyticsFailures', () => {
  describe('getFailuresByStage', () => {
    it('returns empty array when no failed batches', () => {
      const batches = [makeBatch('1', 'rooting')];
      const result = getFailuresByStage(batches, []);
      expect(result).toEqual([]);
    });

    it('identifies failure stage from transitions', () => {
      const batches = [makeBatch('1', 'failed')];
      const transitions = [makeTransition('1', 'rooting', 'failed')];
      const result = getFailuresByStage(batches, transitions);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].stage).toBe('rooting');
      expect(result[0].count).toBe(1);
    });

    it('counts multiple failures at same stage', () => {
      const batches = [makeBatch('1', 'failed'), makeBatch('2', 'failed')];
      const transitions = [
        makeTransition('1', 'rooting', 'failed'),
        makeTransition('2', 'rooting', 'failed'),
      ];
      const result = getFailuresByStage(batches, transitions);
      const rootingFailure = result.find((r) => r.stage === 'rooting');
      expect(rootingFailure?.count).toBe(2);
    });

    it('calculates percentages', () => {
      const batches = [makeBatch('1', 'failed'), makeBatch('2', 'failed')];
      const transitions = [
        makeTransition('1', 'rooting', 'failed'),
        makeTransition('2', 'potted_up', 'failed'),
      ];
      const result = getFailuresByStage(batches, transitions);
      const totalPct = result.reduce((sum, r) => sum + r.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });
  });
});
