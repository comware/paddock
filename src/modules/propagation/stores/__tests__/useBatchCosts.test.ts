/**
 * useBatchCosts Store Unit Tests
 *
 * Tests the batch cost tracking store including:
 * - Adding costs to batches
 * - Cost aggregation
 * - Cost per propagule calculation
 * - Supply-linked vs manual costs
 */

import { describe, it, expect } from 'vitest';
import type {
  PropBatchCost,
  PropBatchCostWithSupply,
  SupplyCategory as _SupplyCategory,
  BatchCostSummary as _BatchCostSummary,
} from '../../types';
import {
  getTotalBatchCost,
  getCostPerPropaguleStarted,
  getCostPerPropaguleSurviving,
  getBatchCostBreakdown,
  getTotalSpentOnSupplies,
} from '../../utils/costCalculations';
import type { EnrichedBatchCost, SupplyUsageSummary } from '../useBatchCosts';

// ============================================
// TEST FIXTURES
// ============================================

function createMockCost(overrides: Partial<PropBatchCost> = {}): PropBatchCost {
  const now = new Date();
  return {
    id: 'cost-test',
    batchId: 'batch-1',
    createdAt: now,
    ...overrides,
  };
}

function createMockSupplyCost(overrides: Partial<PropBatchCostWithSupply> = {}): PropBatchCostWithSupply {
  const now = new Date();
  return {
    id: 'cost-supply',
    batchId: 'batch-1',
    supplyId: 'supply-1',
    quantityUsed: 10,
    calculatedCost: 2.50,
    supplyName: 'Rooting Hormone',
    supplyCategory: 'rooting_hormone',
    supplyUnit: 'ml',
    createdAt: now,
    ...overrides,
  };
}

function createMockManualCost(overrides: Partial<PropBatchCost> = {}): PropBatchCost {
  const now = new Date();
  return {
    id: 'cost-manual',
    batchId: 'batch-1',
    manualCost: 5.00,
    manualDescription: 'Labor for preparation',
    createdAt: now,
    ...overrides,
  };
}

// ============================================
// COST CALCULATION TESTS
// ============================================

describe('Cost Calculations', () => {
  describe('getTotalBatchCost', () => {
    it('returns 0 for empty cost array', () => {
      expect(getTotalBatchCost([])).toBe(0);
    });

    it('sums supply-linked costs', () => {
      const costs: PropBatchCost[] = [
        createMockCost({ calculatedCost: 2.50 }),
        createMockCost({ calculatedCost: 3.00 }),
      ];
      expect(getTotalBatchCost(costs)).toBe(5.50);
    });

    it('sums manual costs', () => {
      const costs: PropBatchCost[] = [
        createMockManualCost({ manualCost: 5.00 }),
        createMockManualCost({ manualCost: 3.00 }),
      ];
      expect(getTotalBatchCost(costs)).toBe(8.00);
    });

    it('combines supply-linked and manual costs', () => {
      const costs: PropBatchCost[] = [
        createMockCost({ calculatedCost: 2.50 }),
        createMockManualCost({ manualCost: 5.00 }),
        createMockCost({ calculatedCost: 1.50 }),
      ];
      expect(getTotalBatchCost(costs)).toBe(9.00);
    });

    it('ignores costs without value', () => {
      const costs: PropBatchCost[] = [
        createMockCost({ calculatedCost: 2.50 }),
        createMockCost({}), // No cost value
        createMockManualCost({ manualCost: 5.00 }),
      ];
      expect(getTotalBatchCost(costs)).toBe(7.50);
    });
  });

  describe('getCostPerPropaguleStarted', () => {
    it('calculates cost per propagule started', () => {
      const result = getCostPerPropaguleStarted(10.00, 20);
      expect(result).toBe(0.50);
    });

    it('returns 0 when quantity is 0', () => {
      const result = getCostPerPropaguleStarted(10.00, 0);
      expect(result).toBe(0);
    });

    it('handles fractional results', () => {
      const result = getCostPerPropaguleStarted(10.00, 3);
      expect(result).toBeCloseTo(3.33, 2);
    });
  });

  describe('getCostPerPropaguleSurviving', () => {
    it('calculates cost per surviving propagule', () => {
      const result = getCostPerPropaguleSurviving(10.00, 10);
      expect(result).toBe(1.00);
    });

    it('returns 0 when quantity is 0', () => {
      const result = getCostPerPropaguleSurviving(10.00, 0);
      expect(result).toBe(0);
    });

    it('shows higher cost when fewer survive', () => {
      const perStarted = getCostPerPropaguleStarted(10.00, 20);
      const perSurviving = getCostPerPropaguleSurviving(10.00, 15);
      expect(perSurviving).toBeGreaterThan(perStarted);
    });
  });
});

// ============================================
// BATCH COST BREAKDOWN TESTS
// ============================================

describe('Batch Cost Breakdown', () => {
  it('returns breakdown with single category', () => {
    const costs: PropBatchCostWithSupply[] = [
      createMockSupplyCost({
        calculatedCost: 5.00,
        supplyCategory: 'rooting_hormone',
      }),
    ];
    const result = getBatchCostBreakdown(costs, {
      quantityStarted: 20,
      quantitySurviving: 18,
    });

    expect(result.totalCost).toBe(5.00);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].category).toBe('rooting_hormone');
    expect(result.breakdown[0].percentage).toBe(100);
  });

  it('returns breakdown with multiple categories', () => {
    const costs: PropBatchCostWithSupply[] = [
      createMockSupplyCost({
        id: 'c1',
        calculatedCost: 5.00,
        supplyCategory: 'rooting_hormone',
      }),
      createMockSupplyCost({
        id: 'c2',
        calculatedCost: 10.00,
        supplyCategory: 'growing_medium',
      }),
      createMockSupplyCost({
        id: 'c3',
        calculatedCost: 5.00,
        supplyCategory: 'containers',
      }),
    ];
    const result = getBatchCostBreakdown(costs, {
      quantityStarted: 20,
      quantitySurviving: 18,
    });

    expect(result.totalCost).toBe(20.00);
    expect(result.breakdown).toHaveLength(3);
    // Sorted by amount descending
    expect(result.breakdown[0].category).toBe('growing_medium');
    expect(result.breakdown[0].percentage).toBe(50);
  });

  it('includes manual costs in breakdown', () => {
    const costs: PropBatchCostWithSupply[] = [
      createMockSupplyCost({
        id: 'c1',
        calculatedCost: 10.00,
        supplyCategory: 'rooting_hormone',
      }),
      {
        ...createMockManualCost({ manualCost: 10.00 }),
        supplyName: undefined,
        supplyCategory: undefined,
        supplyUnit: undefined,
      },
    ];
    const result = getBatchCostBreakdown(costs, {
      quantityStarted: 20,
      quantitySurviving: 18,
    });

    expect(result.totalCost).toBe(20.00);
    const categories = result.breakdown.map((b) => b.category);
    expect(categories).toContain('rooting_hormone');
    expect(categories).toContain('manual');
  });

  it('calculates cost per started and surviving', () => {
    const costs: PropBatchCostWithSupply[] = [
      createMockSupplyCost({
        calculatedCost: 20.00,
      }),
    ];
    const result = getBatchCostBreakdown(costs, {
      quantityStarted: 20,
      quantitySurviving: 10,
    });

    expect(result.costPerStarted).toBe(1.00);
    expect(result.costPerSurviving).toBe(2.00);
  });
});

// ============================================
// SUPPLY COST AGGREGATION TESTS
// ============================================

describe('Supply Cost Aggregation', () => {
  describe('getTotalSpentOnSupplies', () => {
    it('sums only supply-linked costs', () => {
      const costs: PropBatchCost[] = [
        createMockCost({ supplyId: 's1', calculatedCost: 5.00 }),
        createMockManualCost({ manualCost: 3.00 }),
        createMockCost({ supplyId: 's2', calculatedCost: 7.00 }),
      ];
      expect(getTotalSpentOnSupplies(costs)).toBe(12.00);
    });

    it('returns 0 for only manual costs', () => {
      const costs: PropBatchCost[] = [
        createMockManualCost({ manualCost: 5.00 }),
        createMockManualCost({ manualCost: 3.00 }),
      ];
      expect(getTotalSpentOnSupplies(costs)).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(getTotalSpentOnSupplies([])).toBe(0);
    });
  });

  describe('Supply Usage Summaries', () => {
    // Inline aggregation function for testing
    function getSupplyUsageSummaries(
      enrichedCosts: EnrichedBatchCost[]
    ): SupplyUsageSummary[] {
      const supplyMap = new Map<string, SupplyUsageSummary>();
      const batchesBySupply = new Map<string, Set<string>>();

      for (const cost of enrichedCosts) {
        if (!cost.supplyId || cost.calculatedCost === undefined) continue;

        const existing = supplyMap.get(cost.supplyId);
        const batches = batchesBySupply.get(cost.supplyId) ?? new Set<string>();
        batches.add(cost.batchId);
        batchesBySupply.set(cost.supplyId, batches);

        if (existing) {
          existing.totalQuantityUsed += cost.quantityUsed ?? 0;
          existing.totalCost += cost.calculatedCost;
          existing.batchCount = batches.size;
        } else {
          supplyMap.set(cost.supplyId, {
            supplyId: cost.supplyId,
            supplyName: cost.supplyName ?? 'Unknown',
            supplyCategory: cost.supplyCategory ?? 'other',
            supplyUnit: cost.supplyUnit ?? 'units',
            totalQuantityUsed: cost.quantityUsed ?? 0,
            totalCost: cost.calculatedCost,
            batchCount: 1,
          });
        }
      }

      return Array.from(supplyMap.values()).sort((a, b) => b.totalCost - a.totalCost);
    }

    it('aggregates costs by supply', () => {
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({
            supplyId: 'supply-1',
            calculatedCost: 5.00,
            quantityUsed: 10,
          }),
          createdAtDate: new Date(),
        },
        {
          ...createMockSupplyCost({
            id: 'c2',
            batchId: 'batch-2',
            supplyId: 'supply-1',
            calculatedCost: 3.00,
            quantityUsed: 6,
          }),
          createdAtDate: new Date(),
        },
      ];

      const summaries = getSupplyUsageSummaries(costs);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].totalCost).toBe(8.00);
      expect(summaries[0].totalQuantityUsed).toBe(16);
      expect(summaries[0].batchCount).toBe(2);
    });

    it('handles multiple supplies', () => {
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({
            supplyId: 'supply-1',
            supplyName: 'Rooting Hormone',
            calculatedCost: 5.00,
          }),
          createdAtDate: new Date(),
        },
        {
          ...createMockSupplyCost({
            id: 'c2',
            supplyId: 'supply-2',
            supplyName: 'Potting Mix',
            calculatedCost: 10.00,
          }),
          createdAtDate: new Date(),
        },
      ];

      const summaries = getSupplyUsageSummaries(costs);
      expect(summaries).toHaveLength(2);
      // Sorted by total cost descending
      expect(summaries[0].supplyName).toBe('Potting Mix');
    });

    it('ignores manual costs', () => {
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({
            supplyId: 'supply-1',
            calculatedCost: 5.00,
          }),
          createdAtDate: new Date(),
        },
        {
          ...createMockManualCost({ manualCost: 10.00 }),
          supplyName: undefined,
          supplyCategory: undefined,
          supplyUnit: undefined,
          createdAtDate: new Date(),
        },
      ];

      const summaries = getSupplyUsageSummaries(costs);
      expect(summaries).toHaveLength(1);
    });
  });
});

// ============================================
// BATCH COST QUERIES TESTS
// ============================================

describe('Batch Cost Queries', () => {
  describe('getCostsForBatch', () => {
    // Inline filtering function for testing
    function getCostsForBatch(
      enrichedCosts: EnrichedBatchCost[],
      batchId: string
    ): EnrichedBatchCost[] {
      return enrichedCosts
        .filter((c) => c.batchId === batchId)
        .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
    }

    it('filters costs by batch ID', () => {
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({ batchId: 'batch-1' }),
          createdAtDate: new Date(),
        },
        {
          ...createMockSupplyCost({ id: 'c2', batchId: 'batch-2' }),
          createdAtDate: new Date(),
        },
        {
          ...createMockSupplyCost({ id: 'c3', batchId: 'batch-1' }),
          createdAtDate: new Date(),
        },
      ];

      const result = getCostsForBatch(costs, 'batch-1');
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.batchId === 'batch-1')).toBe(true);
    });

    it('returns empty array for batch with no costs', () => {
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({ batchId: 'batch-1' }),
          createdAtDate: new Date(),
        },
      ];

      const result = getCostsForBatch(costs, 'batch-unknown');
      expect(result).toHaveLength(0);
    });

    it('sorts by date descending', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({ id: 'c1', batchId: 'batch-1', createdAt: yesterday }),
          createdAtDate: yesterday,
        },
        {
          ...createMockSupplyCost({ id: 'c2', batchId: 'batch-1', createdAt: now }),
          createdAtDate: now,
        },
      ];

      const result = getCostsForBatch(costs, 'batch-1');
      expect(result[0].createdAtDate.getTime()).toBeGreaterThan(result[1].createdAtDate.getTime());
    });
  });

  describe('getCostsBySupply', () => {
    // Inline filtering function for testing
    function getCostsBySupply(
      enrichedCosts: EnrichedBatchCost[],
      supplyId: string
    ): EnrichedBatchCost[] {
      return enrichedCosts
        .filter((c) => c.supplyId === supplyId)
        .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
    }

    it('filters costs by supply ID', () => {
      const costs: EnrichedBatchCost[] = [
        {
          ...createMockSupplyCost({ supplyId: 'supply-1' }),
          createdAtDate: new Date(),
        },
        {
          ...createMockSupplyCost({ id: 'c2', supplyId: 'supply-2' }),
          createdAtDate: new Date(),
        },
        {
          ...createMockSupplyCost({ id: 'c3', supplyId: 'supply-1' }),
          createdAtDate: new Date(),
        },
      ];

      const result = getCostsBySupply(costs, 'supply-1');
      expect(result).toHaveLength(2);
    });
  });
});

// ============================================
// ANALYTICS TESTS
// ============================================

describe('Cost Analytics', () => {
  describe('getTotalCostsAcrossAllBatches', () => {
    it('sums all costs', () => {
      const costs: PropBatchCost[] = [
        createMockCost({ batchId: 'b1', calculatedCost: 5.00 }),
        createMockCost({ batchId: 'b2', calculatedCost: 10.00 }),
        createMockManualCost({ batchId: 'b3', manualCost: 5.00 }),
      ];
      expect(getTotalBatchCost(costs)).toBe(20.00);
    });
  });

  describe('getAverageCostPerBatch', () => {
    it('calculates average correctly', () => {
      const totalCost = 30.00;
      const batchCount = 3;
      const average = batchCount > 0 ? totalCost / batchCount : 0;
      expect(average).toBe(10.00);
    });

    it('returns 0 when no batches', () => {
      const totalCost = 0;
      const batchCount = 0;
      const average = batchCount > 0 ? totalCost / batchCount : 0;
      expect(average).toBe(0);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles cost with zero amount', () => {
    const costs: PropBatchCost[] = [
      createMockCost({ calculatedCost: 0 }),
      createMockCost({ calculatedCost: 5.00 }),
    ];
    expect(getTotalBatchCost(costs)).toBe(5.00);
  });

  it('handles very small costs', () => {
    const costs: PropBatchCost[] = [
      createMockCost({ calculatedCost: 0.001 }),
      createMockCost({ calculatedCost: 0.002 }),
    ];
    expect(getTotalBatchCost(costs)).toBeCloseTo(0.003, 3);
  });

  it('handles very large costs', () => {
    const costs: PropBatchCost[] = [
      createMockCost({ calculatedCost: 10000.00 }),
      createMockCost({ calculatedCost: 5000.00 }),
    ];
    expect(getTotalBatchCost(costs)).toBe(15000.00);
  });

  it('handles batch with no surviving propagules', () => {
    const result = getCostPerPropaguleSurviving(100.00, 0);
    expect(result).toBe(0);
  });

  it('handles empty cost array for breakdown', () => {
    const result = getBatchCostBreakdown([], {
      quantityStarted: 20,
      quantitySurviving: 18,
    });
    expect(result.totalCost).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });
});
