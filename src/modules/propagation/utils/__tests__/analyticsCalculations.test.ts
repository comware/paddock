/**
 * analyticsCalculations - Unit Tests
 *
 * Tests the barrel re-exports and core analytics functions:
 * success rate, cost analytics, outcome distribution, failure analysis,
 * and shared date filtering/display helpers.
 */

import { describe, it, expect } from 'vitest';
import type { PropBatch, PropBatchCost, PropGraduation, PropStageTransition } from '../../types';

// Test barrel re-exports
import {
  // Success rate
  calculateSuccessRate,
  calculateSuccessRateBySpecies,
  calculateSuccessRateByMethod,
  calculateSuccessRateBySeason,
  // Failures
  getFailuresByStage,
  getFailureReasonDistribution,
  getMostProblematicStage,
  // Outcomes
  getOutcomeDistribution,
  getOutcomesByMonth,
  getTotalGraduated,
  // Costs
  getAverageCostPerPropagule,
  getCostBySupplyCategory,
  getMostExpensiveSpecies,
  // Shared helpers
  getTimePeriodCutoff,
  filterBatchesByPeriod,
  getFailureReasonDisplayName,
  getOutcomeDisplayName,
  getMethodDisplayName,
  getTimePeriodDisplayName,
} from '../analyticsCalculations';

// ============================================
// HELPERS
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  const now = new Date();
  return {
    id: `batch-${Math.random().toString(36).slice(2, 9)}`,
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    variety: 'English',
    method: 'cutting_softwood',
    quantityStarted: 20,
    quantitySurviving: 18,
    dateTaken: daysAgo(30),
    stage: 'rooting',
    daysInStage: 14,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================
// BARREL RE-EXPORTS
// ============================================

describe('analyticsCalculations barrel re-exports', () => {
  it('exports success rate functions', () => {
    expect(typeof calculateSuccessRate).toBe('function');
    expect(typeof calculateSuccessRateBySpecies).toBe('function');
    expect(typeof calculateSuccessRateByMethod).toBe('function');
    expect(typeof calculateSuccessRateBySeason).toBe('function');
  });

  it('exports failure analysis functions', () => {
    expect(typeof getFailuresByStage).toBe('function');
    expect(typeof getFailureReasonDistribution).toBe('function');
    expect(typeof getMostProblematicStage).toBe('function');
  });

  it('exports outcome functions', () => {
    expect(typeof getOutcomeDistribution).toBe('function');
    expect(typeof getOutcomesByMonth).toBe('function');
    expect(typeof getTotalGraduated).toBe('function');
  });

  it('exports cost functions', () => {
    expect(typeof getAverageCostPerPropagule).toBe('function');
    expect(typeof getCostBySupplyCategory).toBe('function');
    expect(typeof getMostExpensiveSpecies).toBe('function');
  });
});

// ============================================
// SUCCESS RATE
// ============================================

describe('calculateSuccessRate', () => {
  it('returns 0 for empty batches', () => {
    expect(calculateSuccessRate([])).toBe(0);
  });

  it('returns 0 when no batches reached terminal state', () => {
    const batches = [
      createBatch({ stage: 'rooting' }),
      createBatch({ stage: 'potted_up' }),
    ];
    expect(calculateSuccessRate(batches)).toBe(0);
  });

  it('calculates correct rate for mixed outcomes', () => {
    const batches = [
      createBatch({ stage: 'graduated' }),
      createBatch({ stage: 'graduated' }),
      createBatch({ stage: 'failed' }),
      createBatch({ stage: 'rooting' }), // active, not counted
    ];
    // 2 graduated / (2 graduated + 1 failed) = 67%
    expect(calculateSuccessRate(batches)).toBe(67);
  });

  it('returns 100 when all completed batches graduated', () => {
    const batches = [
      createBatch({ stage: 'graduated' }),
      createBatch({ stage: 'graduated' }),
    ];
    expect(calculateSuccessRate(batches)).toBe(100);
  });
});

describe('calculateSuccessRateBySpecies', () => {
  it('groups batches by species', () => {
    const batches = [
      createBatch({ species: 'Lavender', stage: 'graduated' }),
      createBatch({ species: 'Lavender', stage: 'failed' }),
      createBatch({ species: 'Rosemary', stage: 'graduated' }),
    ];
    const results = calculateSuccessRateBySpecies(batches);
    expect(results.length).toBe(2);

    const lavender = results.find((r) => r.dimension === 'Lavender');
    expect(lavender).toBeDefined();
    expect(lavender!.successRate).toBe(50);

    const rosemary = results.find((r) => r.dimension === 'Rosemary');
    expect(rosemary).toBeDefined();
    expect(rosemary!.successRate).toBe(100);
  });
});

// ============================================
// FAILURE ANALYSIS
// ============================================

describe('getFailuresByStage', () => {
  it('returns empty array when no failures', () => {
    const batches = [createBatch({ stage: 'rooting' })];
    expect(getFailuresByStage(batches, [])).toEqual([]);
  });

  it('groups failures by the stage they failed at', () => {
    const batches = [
      createBatch({ id: 'b1', stage: 'failed' }),
      createBatch({ id: 'b2', stage: 'failed' }),
    ];
    const transitions: PropStageTransition[] = [
      { id: 't1', batchId: 'b1', fromStage: 'rooting', toStage: 'failed', transitionDate: new Date(), createdAt: new Date() } as PropStageTransition,
      { id: 't2', batchId: 'b2', fromStage: 'rooting', toStage: 'failed', transitionDate: new Date(), createdAt: new Date() } as PropStageTransition,
    ];
    const result = getFailuresByStage(batches, transitions);
    expect(result.length).toBe(1);
    expect(result[0].stage).toBe('rooting');
    expect(result[0].count).toBe(2);
  });
});

describe('getFailureReasonDistribution', () => {
  it('returns empty array when no failure transitions', () => {
    expect(getFailureReasonDistribution([])).toEqual([]);
  });

  it('counts failure reasons correctly', () => {
    const transitions = [
      { id: 't1', toStage: 'failed', failureReason: 'rot', fromStage: 'rooting', transitionDate: new Date() },
      { id: 't2', toStage: 'failed', failureReason: 'rot', fromStage: 'rooting', transitionDate: new Date() },
      { id: 't3', toStage: 'failed', failureReason: 'dried_out', fromStage: 'rooting', transitionDate: new Date() },
    ] as PropStageTransition[];
    const result = getFailureReasonDistribution(transitions);
    expect(result.length).toBe(2);
    const rot = result.find((r) => r.reason === 'rot');
    expect(rot!.count).toBe(2);
  });
});

describe('getMostProblematicStage', () => {
  it('returns null for empty input', () => {
    expect(getMostProblematicStage([])).toBeNull();
  });

  it('returns the stage with most failures', () => {
    const failures = [
      { stage: 'rooting' as const, count: 5, percentage: 50 },
      { stage: 'potted_up' as const, count: 3, percentage: 30 },
    ];
    expect(getMostProblematicStage(failures)).toBe('rooting');
  });
});

// ============================================
// OUTCOMES
// ============================================

describe('getOutcomeDistribution', () => {
  it('returns empty array for no graduations', () => {
    expect(getOutcomeDistribution([])).toEqual([]);
  });

  it('calculates outcome percentages', () => {
    const graduations = [
      { outcome: 'personal_use', quantity: 5 },
      { outcome: 'gifted', quantity: 3 },
      { outcome: 'personal_use', quantity: 2 },
    ] as PropGraduation[];
    const result = getOutcomeDistribution(graduations);
    const personalUse = result.find((r) => r.outcome === 'personal_use');
    expect(personalUse).toBeDefined();
    expect(personalUse!.count).toBe(2);
    expect(personalUse!.quantity).toBe(7);
  });
});

describe('getTotalGraduated', () => {
  it('sums graduation counts and quantities', () => {
    const graduations = [
      { quantity: 5 },
      { quantity: 10 },
    ] as PropGraduation[];
    const result = getTotalGraduated(graduations);
    expect(result.count).toBe(2);
    expect(result.quantity).toBe(15);
  });

  it('handles empty input', () => {
    const result = getTotalGraduated([]);
    expect(result.count).toBe(0);
    expect(result.quantity).toBe(0);
  });
});

// ============================================
// COST ANALYTICS
// ============================================

describe('getAverageCostPerPropagule', () => {
  it('returns zeros for empty inputs', () => {
    const result = getAverageCostPerPropagule([], []);
    expect(result.perStarted).toBe(0);
    expect(result.perSurviving).toBe(0);
  });

  it('calculates per-started and per-surviving costs', () => {
    const batches = [
      createBatch({ id: 'b1', quantityStarted: 10, quantitySurviving: 8 }),
    ];
    const costs: PropBatchCost[] = [
      { id: 'c1', batchId: 'b1', calculatedCost: 50 } as PropBatchCost,
    ];
    const result = getAverageCostPerPropagule(batches, costs);
    expect(result.perStarted).toBe(5); // 50 / 10
    expect(result.perSurviving).toBe(6.25); // 50 / 8
  });
});

describe('getCostBySupplyCategory', () => {
  it('groups costs by category', () => {
    const supplyCategoryMap = new Map([
      ['supply-1', 'rooting_hormone' as const],
      ['supply-2', 'containers' as const],
    ]);
    const costs = [
      { id: 'c1', batchId: 'b1', supplyId: 'supply-1', calculatedCost: 20 },
      { id: 'c2', batchId: 'b1', supplyId: 'supply-2', calculatedCost: 30 },
      { id: 'c3', batchId: 'b1', manualCost: 10 },
    ] as PropBatchCost[];
    const result = getCostBySupplyCategory(costs, supplyCategoryMap);
    expect(result.length).toBe(3);
    const total = result.reduce((sum, r) => sum + r.totalCost, 0);
    expect(total).toBe(60);
  });
});

describe('getMostExpensiveSpecies', () => {
  it('ranks species by total cost', () => {
    const batches = [
      createBatch({ id: 'b1', species: 'Lavender', quantityStarted: 10 }),
      createBatch({ id: 'b2', species: 'Rosemary', quantityStarted: 5 }),
    ];
    const costs = [
      { id: 'c1', batchId: 'b1', calculatedCost: 100 } as PropBatchCost,
      { id: 'c2', batchId: 'b2', calculatedCost: 200 } as PropBatchCost,
    ];
    const result = getMostExpensiveSpecies(batches, costs);
    expect(result[0].species).toBe('Rosemary');
    expect(result[0].totalCost).toBe(200);
  });
});

// ============================================
// DATE FILTERING
// ============================================

describe('getTimePeriodCutoff', () => {
  it('returns null for "all"', () => {
    expect(getTimePeriodCutoff('all')).toBeNull();
  });

  it('returns a date for "30d"', () => {
    const cutoff = getTimePeriodCutoff('30d');
    expect(cutoff).toBeInstanceOf(Date);
    const daysBack = Math.round((Date.now() - cutoff!.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysBack).toBe(30);
  });
});

describe('filterBatchesByPeriod', () => {
  it('returns all batches for "all" period', () => {
    const batches = [createBatch({ dateTaken: daysAgo(500) })];
    expect(filterBatchesByPeriod(batches, 'all')).toHaveLength(1);
  });

  it('filters out old batches for "30d"', () => {
    const batches = [
      createBatch({ dateTaken: daysAgo(10) }),
      createBatch({ dateTaken: daysAgo(60) }),
    ];
    const filtered = filterBatchesByPeriod(batches, '30d');
    expect(filtered).toHaveLength(1);
  });
});

// ============================================
// DISPLAY HELPERS
// ============================================

describe('display name helpers', () => {
  it('getFailureReasonDisplayName returns readable names', () => {
    expect(getFailureReasonDisplayName('dried_out')).toBe('Dried Out');
    expect(getFailureReasonDisplayName('rot')).toBe('Rot');
  });

  it('getOutcomeDisplayName returns readable names', () => {
    expect(getOutcomeDisplayName('personal_use')).toBe('Personal Use');
    expect(getOutcomeDisplayName('planted_garden')).toBe('Planted in Garden');
  });

  it('getMethodDisplayName returns readable names', () => {
    expect(getMethodDisplayName('cutting_softwood')).toBe('Softwood Cutting');
    expect(getMethodDisplayName('layering_air')).toBe('Air Layering');
  });

  it('getTimePeriodDisplayName returns readable names', () => {
    expect(getTimePeriodDisplayName('30d')).toBe('Last 30 Days');
    expect(getTimePeriodDisplayName('all')).toBe('All Time');
  });
});
