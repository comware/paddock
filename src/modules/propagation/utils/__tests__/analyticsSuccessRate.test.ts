import { describe, it, expect } from 'vitest';
import { calculateSuccessRate } from '../analyticsSuccessRate';
import type { PropBatch } from '../../types';

function makeBatch(stage: string): PropBatch {
  return { stage } as PropBatch;
}

describe('analyticsSuccessRate', () => {
  describe('calculateSuccessRate', () => {
    it('returns 0 for empty batches', () => {
      expect(calculateSuccessRate([])).toBe(0);
    });

    it('returns 100 for all graduated', () => {
      const batches = [makeBatch('graduated'), makeBatch('graduated')];
      expect(calculateSuccessRate(batches)).toBe(100);
    });

    it('returns 0 for all failed', () => {
      const batches = [makeBatch('failed'), makeBatch('failed')];
      expect(calculateSuccessRate(batches)).toBe(0);
    });

    it('calculates correct percentage for mixed', () => {
      const batches = [
        makeBatch('graduated'),
        makeBatch('graduated'),
        makeBatch('graduated'),
        makeBatch('failed'),
      ];
      expect(calculateSuccessRate(batches)).toBe(75);
    });

    it('ignores active batches', () => {
      const batches = [
        makeBatch('graduated'),
        makeBatch('rooting'),
        makeBatch('taken'),
      ];
      expect(calculateSuccessRate(batches)).toBe(100);
    });

    it('returns 0 when no terminal batches exist', () => {
      const batches = [makeBatch('rooting'), makeBatch('taken')];
      expect(calculateSuccessRate(batches)).toBe(0);
    });
  });
});
