/**
 * costCalculations - Unit Tests
 *
 * Tests batch cost totals, per-propagule costs, cost breakdowns,
 * aggregate cost analytics, and display formatters.
 */

import { describe, it, expect } from 'vitest';
import type { PropBatchCost, PropBatchCostWithSupply, SupplyCategory } from '../../types';
import {
  getTotalBatchCost,
  getCostPerPropaguleStarted,
  getCostPerPropaguleSurviving,
  getCostPerPropaguleGraduated,
  getBatchCostBreakdown,
  getTotalCostAcrossBatches,
  getCostsBySupply,
  getTotalSpentOnSupplies,
  getTotalManualCosts,
  formatCost,
  formatCostPerUnit,
  getCategoryDisplayName,
  sortBreakdownByCategory,
} from '../costCalculations';

// ============================================
// TOTAL BATCH COST
// ============================================

describe('getTotalBatchCost', () => {
  it('sums supply-linked costs (calculatedCost)', () => {
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1', calculatedCost: 10.50 } as PropBatchCost,
      { id: 'c2', batchId: 'b1', calculatedCost: 5.25 } as PropBatchCost,
    ];
    expect(getTotalBatchCost(costs)).toBeCloseTo(15.75);
  });

  it('sums manual costs (manualCost)', () => {
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1', manualCost: 20 } as PropBatchCost,
      { id: 'c2', batchId: 'b1', manualCost: 15 } as PropBatchCost,
    ];
    expect(getTotalBatchCost(costs)).toBe(35);
  });

  it('sums mixed cost types', () => {
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1', calculatedCost: 10 } as PropBatchCost,
      { id: 'c2', batchId: 'b1', manualCost: 5 } as PropBatchCost,
    ];
    expect(getTotalBatchCost(costs)).toBe(15);
  });

  it('returns 0 for empty array', () => {
    expect(getTotalBatchCost([])).toBe(0);
  });

  it('handles costs with neither calculatedCost nor manualCost', () => {
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1' } as PropBatchCost,
    ];
    expect(getTotalBatchCost(costs)).toBe(0);
  });
});

// ============================================
// PER-PROPAGULE COSTS
// ============================================

describe('getCostPerPropaguleStarted', () => {
  it('divides total by quantity started', () => {
    expect(getCostPerPropaguleStarted(100, 20)).toBe(5);
  });

  it('returns 0 when quantity is 0', () => {
    expect(getCostPerPropaguleStarted(100, 0)).toBe(0);
  });

  it('returns 0 when quantity is negative', () => {
    expect(getCostPerPropaguleStarted(100, -1)).toBe(0);
  });
});

describe('getCostPerPropaguleSurviving', () => {
  it('divides total by surviving count', () => {
    expect(getCostPerPropaguleSurviving(100, 10)).toBe(10);
  });

  it('returns 0 when no survivors', () => {
    expect(getCostPerPropaguleSurviving(100, 0)).toBe(0);
  });
});

describe('getCostPerPropaguleGraduated', () => {
  it('divides total by graduated count', () => {
    expect(getCostPerPropaguleGraduated(100, 5)).toBe(20);
  });

  it('returns 0 when none graduated', () => {
    expect(getCostPerPropaguleGraduated(100, 0)).toBe(0);
  });
});

// ============================================
// BATCH COST BREAKDOWN
// ============================================

describe('getBatchCostBreakdown', () => {
  it('calculates complete breakdown', () => {
    const costs: PropBatchCostWithSupply[] = [
      { id: 'c1', batchId: 'b1', calculatedCost: 30, supplyCategory: 'rooting_hormone' as SupplyCategory } as PropBatchCostWithSupply,
      { id: 'c2', batchId: 'b1', manualCost: 20 } as PropBatchCostWithSupply,
    ];
    const batch = { quantityStarted: 10, quantitySurviving: 8 };
    const result = getBatchCostBreakdown(costs, batch);
    expect(result.totalCost).toBe(50);
    expect(result.costPerStarted).toBe(5);
    expect(result.costPerSurviving).toBe(6.25);
    expect(result.breakdown.length).toBe(2);
  });

  it('handles empty costs', () => {
    const result = getBatchCostBreakdown([], { quantityStarted: 10, quantitySurviving: 8 });
    expect(result.totalCost).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('sorts breakdown by amount descending', () => {
    const costs: PropBatchCostWithSupply[] = [
      { id: 'c1', batchId: 'b1', calculatedCost: 10, supplyCategory: 'labels' as SupplyCategory } as PropBatchCostWithSupply,
      { id: 'c2', batchId: 'b1', calculatedCost: 50, supplyCategory: 'containers' as SupplyCategory } as PropBatchCostWithSupply,
    ];
    const result = getBatchCostBreakdown(costs, { quantityStarted: 10, quantitySurviving: 10 });
    expect(result.breakdown[0].category).toBe('containers');
  });
});

// ============================================
// AGGREGATE COST ANALYTICS
// ============================================

describe('getTotalCostAcrossBatches', () => {
  it('sums costs across all batches', () => {
    const map = new Map<string, PropBatchCost[]>();
    map.set('b1', [{ id: 'c1', batchId: 'b1', calculatedCost: 25 } as PropBatchCost]);
    map.set('b2', [{ id: 'c2', batchId: 'b2', manualCost: 15 } as PropBatchCost]);
    expect(getTotalCostAcrossBatches(map)).toBe(40);
  });

  it('returns 0 for empty map', () => {
    expect(getTotalCostAcrossBatches(new Map())).toBe(0);
  });
});

describe('getCostsBySupply', () => {
  it('groups costs by supply ID', () => {
    const costs: PropBatchCostWithSupply[] = [
      { id: 'c1', batchId: 'b1', supplyId: 's1', supplyName: 'Hormone A', calculatedCost: 10, quantityUsed: 2 } as PropBatchCostWithSupply,
      { id: 'c2', batchId: 'b2', supplyId: 's1', supplyName: 'Hormone A', calculatedCost: 15, quantityUsed: 3 } as PropBatchCostWithSupply,
    ];
    const result = getCostsBySupply(costs);
    expect(result.size).toBe(1);
    const supply = result.get('s1')!;
    expect(supply.totalCost).toBe(25);
    expect(supply.totalQuantity).toBe(5);
  });
});

describe('getTotalSpentOnSupplies', () => {
  it('sums only supply-linked costs', () => {
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1', supplyId: 's1', calculatedCost: 20 } as PropBatchCost,
      { id: 'c2', batchId: 'b1', manualCost: 10 } as PropBatchCost,
    ];
    expect(getTotalSpentOnSupplies(costs)).toBe(20);
  });
});

describe('getTotalManualCosts', () => {
  it('sums only manual costs without supplyId', () => {
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1', manualCost: 15 } as PropBatchCost,
      { id: 'c2', batchId: 'b1', supplyId: 's1', calculatedCost: 20 } as PropBatchCost,
    ];
    expect(getTotalManualCosts(costs)).toBe(15);
  });
});

// ============================================
// DISPLAY HELPERS
// ============================================

describe('formatCost', () => {
  it('formats with 2 decimal places by default', () => {
    expect(formatCost(12.5)).toBe('$12.50');
  });

  it('supports custom decimals', () => {
    expect(formatCost(12.5, 0)).toBe('$13');
  });
});

describe('formatCostPerUnit', () => {
  it('returns $0.00 for zero', () => {
    expect(formatCostPerUnit(0)).toBe('$0.00');
  });

  it('shows 4 decimals for very small amounts', () => {
    expect(formatCostPerUnit(0.005)).toBe('$0.0050');
  });

  it('shows 3 decimals for sub-dollar amounts', () => {
    expect(formatCostPerUnit(0.5)).toBe('$0.500');
  });

  it('shows 2 decimals for normal amounts', () => {
    expect(formatCostPerUnit(5.5)).toBe('$5.50');
  });
});

describe('getCategoryDisplayName', () => {
  it('returns display names for supply categories', () => {
    expect(getCategoryDisplayName('rooting_hormone')).toBe('Rooting Hormone');
    expect(getCategoryDisplayName('manual')).toBe('Manual Costs');
  });
});

describe('sortBreakdownByCategory', () => {
  it('sorts by CATEGORY_SORT_ORDER', () => {
    const breakdown = [
      { category: 'manual' as const, amount: 10, percentage: 50 },
      { category: 'rooting_hormone' as const, amount: 10, percentage: 50 },
    ];
    const sorted = sortBreakdownByCategory(breakdown);
    expect(sorted[0].category).toBe('rooting_hormone');
    expect(sorted[1].category).toBe('manual');
  });
});
