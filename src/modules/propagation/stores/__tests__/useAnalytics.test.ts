/**
 * useAnalytics Store Unit Tests
 *
 * Tests the analytics aggregations store including:
 * - Success rate calculations
 * - Stage distribution metrics
 * - Time-based analytics
 * - Cost analytics
 */

import { describe, it, expect } from 'vitest';
import type {
  PropBatch,
  PropGraduation,
  PropBatchCost,
  PropStageTransition,
  PropagationStage as _PropagationStage,
  GraduationOutcome as _GraduationOutcome,
  SupplyCategory,
} from '../../types';
import {
  type TimePeriod as _TimePeriod,
  type SuccessRateResult as _SuccessRateResult,
  type FailureByStage,
  type OutcomeDistribution as _OutcomeDistribution,
  type MonthlyOutcome as _MonthlyOutcome,
  type CostByCategory as _CostByCategory,
  type SpeciesCostRanking as _SpeciesCostRanking,
  filterBatchesByPeriod,
  filterGraduationsByPeriod,
  filterTransitionsByPeriod,
  calculateSuccessRate,
  calculateSuccessRateBySpecies,
  calculateSuccessRateByMethod,
  calculateSuccessRateBySeason,
  getFailuresByStage,
  getFailureReasonDistribution,
  getMostProblematicStage,
  getOutcomeDistribution,
  getOutcomesByMonth,
  getTotalGraduated,
  getAverageCostPerPropagule,
  getCostBySupplyCategory,
  getMostExpensiveSpecies,
} from '../../utils/analyticsCalculations';

// ============================================
// TEST FIXTURES
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createMockBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  const now = new Date();
  return {
    id: 'batch-test',
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    method: 'cutting_softwood',
    quantityStarted: 20,
    quantitySurviving: 18,
    dateTaken: now,
    stage: 'rooting',
    daysInStage: 7,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockGraduation(overrides: Partial<PropGraduation> = {}): PropGraduation {
  const now = new Date();
  return {
    id: 'grad-test',
    batchId: 'batch-1',
    quantity: 5,
    outcome: 'planted_garden',
    graduationDate: now,
    createdAt: now,
    ...overrides,
  };
}

function createMockTransition(overrides: Partial<PropStageTransition> = {}): PropStageTransition {
  const now = new Date();
  return {
    id: 'transition-test',
    batchId: 'batch-1',
    fromStage: 'taken',
    toStage: 'rooting',
    transitionDate: now,
    createdAt: now,
    ...overrides,
  };
}

function createMockCost(overrides: Partial<PropBatchCost> = {}): PropBatchCost {
  const now = new Date();
  return {
    id: 'cost-test',
    batchId: 'batch-1',
    createdAt: now,
    ...overrides,
  };
}

// ============================================
// TIME PERIOD FILTERING TESTS
// ============================================

describe('Time Period Filtering', () => {
  describe('filterBatchesByPeriod', () => {
    const batches = [
      createMockBatch({ id: 'b1', dateTaken: daysAgo(10) }),
      createMockBatch({ id: 'b2', dateTaken: daysAgo(60) }),
      createMockBatch({ id: 'b3', dateTaken: daysAgo(120) }),
      createMockBatch({ id: 'b4', dateTaken: daysAgo(400) }),
    ];

    it('returns all batches for "all" period', () => {
      const result = filterBatchesByPeriod(batches, 'all');
      expect(result).toHaveLength(4);
    });

    it('filters batches for 30d period', () => {
      const result = filterBatchesByPeriod(batches, '30d');
      expect(result).toHaveLength(1);
    });

    it('filters batches for 90d period', () => {
      const result = filterBatchesByPeriod(batches, '90d');
      expect(result).toHaveLength(2);
    });

    it('filters batches for 1y period', () => {
      const result = filterBatchesByPeriod(batches, '1y');
      expect(result).toHaveLength(3);
    });
  });

  describe('filterGraduationsByPeriod', () => {
    const graduations = [
      createMockGraduation({ id: 'g1', graduationDate: daysAgo(10) }),
      createMockGraduation({ id: 'g2', graduationDate: daysAgo(100) }),
    ];

    it('filters graduations by period', () => {
      const result = filterGraduationsByPeriod(graduations, '30d');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterTransitionsByPeriod', () => {
    const transitions = [
      createMockTransition({ id: 't1', transitionDate: daysAgo(10) }),
      createMockTransition({ id: 't2', transitionDate: daysAgo(100) }),
    ];

    it('filters transitions by period', () => {
      const result = filterTransitionsByPeriod(transitions, '30d');
      expect(result).toHaveLength(1);
    });
  });
});

// ============================================
// SUCCESS RATE TESTS
// ============================================

describe('Success Rate Calculations', () => {
  describe('calculateSuccessRate', () => {
    it('returns 0 for no completed batches', () => {
      const batches = [
        createMockBatch({ stage: 'rooting' }),
        createMockBatch({ stage: 'potted_up' }),
      ];
      expect(calculateSuccessRate(batches)).toBe(0);
    });

    it('calculates rate from graduated and failed', () => {
      const batches = [
        createMockBatch({ id: 'b1', stage: 'graduated' }),
        createMockBatch({ id: 'b2', stage: 'graduated' }),
        createMockBatch({ id: 'b3', stage: 'graduated' }),
        createMockBatch({ id: 'b4', stage: 'failed' }),
      ];
      // 3 graduated / 4 completed = 75%
      expect(calculateSuccessRate(batches)).toBe(75);
    });

    it('returns 100% when all graduated', () => {
      const batches = [
        createMockBatch({ id: 'b1', stage: 'graduated' }),
        createMockBatch({ id: 'b2', stage: 'graduated' }),
      ];
      expect(calculateSuccessRate(batches)).toBe(100);
    });

    it('returns 0% when all failed', () => {
      const batches = [
        createMockBatch({ id: 'b1', stage: 'failed' }),
        createMockBatch({ id: 'b2', stage: 'failed' }),
      ];
      expect(calculateSuccessRate(batches)).toBe(0);
    });
  });

  describe('calculateSuccessRateBySpecies', () => {
    it('groups by species', () => {
      const batches = [
        createMockBatch({ id: 'b1', species: 'Lavender', stage: 'graduated' }),
        createMockBatch({ id: 'b2', species: 'Lavender', stage: 'graduated' }),
        createMockBatch({ id: 'b3', species: 'Rosemary', stage: 'failed' }),
        createMockBatch({ id: 'b4', species: 'Rosemary', stage: 'graduated' }),
      ];
      const result = calculateSuccessRateBySpecies(batches);

      const lavender = result.find((r) => r.dimension === 'Lavender');
      expect(lavender?.successRate).toBe(100);

      const rosemary = result.find((r) => r.dimension === 'Rosemary');
      expect(rosemary?.successRate).toBe(50);
    });

    it('sorts by total batches descending', () => {
      const batches = [
        createMockBatch({ id: 'b1', species: 'Lavender', stage: 'graduated' }),
        createMockBatch({ id: 'b2', species: 'Rosemary', stage: 'graduated' }),
        createMockBatch({ id: 'b3', species: 'Rosemary', stage: 'graduated' }),
      ];
      const result = calculateSuccessRateBySpecies(batches);
      expect(result[0].dimension).toBe('Rosemary');
    });
  });

  describe('calculateSuccessRateByMethod', () => {
    it('groups by propagation method', () => {
      const batches = [
        createMockBatch({ id: 'b1', method: 'cutting_softwood', stage: 'graduated' }),
        createMockBatch({ id: 'b2', method: 'cutting_softwood', stage: 'failed' }),
        createMockBatch({ id: 'b3', method: 'cutting_hardwood', stage: 'graduated' }),
      ];
      const result = calculateSuccessRateByMethod(batches);

      const softwood = result.find((r) => r.dimension === 'cutting_softwood');
      expect(softwood?.successRate).toBe(50);

      const hardwood = result.find((r) => r.dimension === 'cutting_hardwood');
      expect(hardwood?.successRate).toBe(100);
    });
  });

  describe('calculateSuccessRateBySeason', () => {
    it('groups by season', () => {
      // Southern hemisphere seasons
      const summerDate = new Date(2026, 0, 15); // January (summer)
      const winterDate = new Date(2026, 6, 15); // July (winter)

      const batches = [
        createMockBatch({ id: 'b1', dateTaken: summerDate, stage: 'graduated' }),
        createMockBatch({ id: 'b2', dateTaken: winterDate, stage: 'failed' }),
      ];
      const result = calculateSuccessRateBySeason(batches);

      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// FAILURE ANALYSIS TESTS
// ============================================

describe('Failure Analysis', () => {
  describe('getFailuresByStage', () => {
    const batches = [
      createMockBatch({ id: 'b1', stage: 'failed' }),
      createMockBatch({ id: 'b2', stage: 'failed' }),
      createMockBatch({ id: 'b3', stage: 'failed' }),
      createMockBatch({ id: 'b4', stage: 'graduated' }),
    ];

    const transitions = [
      createMockTransition({ batchId: 'b1', fromStage: 'rooting', toStage: 'failed' }),
      createMockTransition({ batchId: 'b2', fromStage: 'rooting', toStage: 'failed' }),
      createMockTransition({ batchId: 'b3', fromStage: 'potted_up', toStage: 'failed' }),
    ];

    it('counts failures by stage', () => {
      const result = getFailuresByStage(batches, transitions);
      const rootingFailures = result.find((r) => r.stage === 'rooting');
      expect(rootingFailures?.count).toBe(2);
    });

    it('calculates percentages', () => {
      const result = getFailuresByStage(batches, transitions);
      // 2 rooting failures / 3 total = 67%
      const rootingFailures = result.find((r) => r.stage === 'rooting');
      expect(rootingFailures?.percentage).toBe(67);
    });

    it('sorts by count descending', () => {
      const result = getFailuresByStage(batches, transitions);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });

    it('returns empty array when no failures', () => {
      const noFailures = [createMockBatch({ stage: 'graduated' })];
      const result = getFailuresByStage(noFailures, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFailureReasonDistribution', () => {
    const transitions = [
      createMockTransition({ id: 't1', toStage: 'failed', failureReason: 'rot' }),
      createMockTransition({ id: 't2', toStage: 'failed', failureReason: 'rot' }),
      createMockTransition({ id: 't3', toStage: 'failed', failureReason: 'dried_out' }),
      createMockTransition({ id: 't4', toStage: 'rooted' }), // Not a failure
    ];

    it('counts failures by reason', () => {
      const result = getFailureReasonDistribution(transitions);
      const rotFailures = result.find((r) => r.reason === 'rot');
      expect(rotFailures?.count).toBe(2);
    });

    it('excludes non-failure transitions', () => {
      const result = getFailureReasonDistribution(transitions);
      const totalCount = result.reduce((sum, r) => sum + r.count, 0);
      expect(totalCount).toBe(3);
    });
  });

  describe('getMostProblematicStage', () => {
    it('returns stage with most failures', () => {
      const failuresByStage: FailureByStage[] = [
        { stage: 'rooting', count: 5, percentage: 50 },
        { stage: 'potted_up', count: 3, percentage: 30 },
      ];
      const result = getMostProblematicStage(failuresByStage);
      expect(result).toBe('rooting');
    });

    it('returns null when no failures', () => {
      const result = getMostProblematicStage([]);
      expect(result).toBeNull();
    });
  });
});

// ============================================
// OUTCOME DISTRIBUTION TESTS
// ============================================

describe('Outcome Distribution', () => {
  describe('getOutcomeDistribution', () => {
    const graduations = [
      createMockGraduation({ id: 'g1', outcome: 'planted_garden', quantity: 5 }),
      createMockGraduation({ id: 'g2', outcome: 'planted_garden', quantity: 3 }),
      createMockGraduation({ id: 'g3', outcome: 'gifted', quantity: 2 }),
      createMockGraduation({ id: 'g4', outcome: 'sold', quantity: 10 }),
    ];

    it('groups by outcome', () => {
      const result = getOutcomeDistribution(graduations);
      const planted = result.find((r) => r.outcome === 'planted_garden');
      expect(planted?.count).toBe(2);
      expect(planted?.quantity).toBe(8);
    });

    it('calculates percentages', () => {
      const result = getOutcomeDistribution(graduations);
      // 2 planted / 4 total = 50%
      const planted = result.find((r) => r.outcome === 'planted_garden');
      expect(planted?.percentage).toBe(50);
    });

    it('returns empty array for no graduations', () => {
      const result = getOutcomeDistribution([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getOutcomesByMonth', () => {
    it('aggregates by month', () => {
      const batches = [
        createMockBatch({ id: 'b1', stage: 'failed', dateTaken: new Date(2026, 0, 15) }),
      ];
      const graduations = [
        createMockGraduation({ id: 'g1', graduationDate: new Date(2026, 0, 20), quantity: 5 }),
      ];
      const result = getOutcomesByMonth(batches, graduations);
      expect(result.length).toBeGreaterThan(0);
    });

    it('sorts chronologically', () => {
      const batches: PropBatch[] = [];
      const graduations = [
        createMockGraduation({ id: 'g1', graduationDate: new Date(2026, 2, 1), quantity: 5 }),
        createMockGraduation({ id: 'g2', graduationDate: new Date(2026, 0, 1), quantity: 3 }),
      ];
      const result = getOutcomesByMonth(batches, graduations);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].month.localeCompare(result[i].month)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('getTotalGraduated', () => {
    it('counts graduations and sums quantity', () => {
      const graduations = [
        createMockGraduation({ id: 'g1', quantity: 5 }),
        createMockGraduation({ id: 'g2', quantity: 10 }),
      ];
      const result = getTotalGraduated(graduations);
      expect(result.count).toBe(2);
      expect(result.quantity).toBe(15);
    });
  });
});

// ============================================
// COST ANALYTICS TESTS
// ============================================

describe('Cost Analytics', () => {
  describe('getAverageCostPerPropagule', () => {
    const batches = [
      createMockBatch({ id: 'b1', quantityStarted: 20, quantitySurviving: 15 }),
      createMockBatch({ id: 'b2', quantityStarted: 10, quantitySurviving: 8 }),
    ];
    const costs = [
      createMockCost({ batchId: 'b1', calculatedCost: 10.00 }),
      createMockCost({ batchId: 'b2', calculatedCost: 5.00 }),
    ];

    it('calculates cost per propagule started', () => {
      const result = getAverageCostPerPropagule(batches, costs);
      // Total cost: 15, Total started: 30
      expect(result.perStarted).toBe(0.5);
    });

    it('calculates cost per propagule surviving', () => {
      const result = getAverageCostPerPropagule(batches, costs);
      // Total cost: 15, Total surviving: 23
      expect(result.perSurviving).toBeCloseTo(0.65, 1);
    });

    it('handles batches without costs', () => {
      const noCostBatches = [
        createMockBatch({ id: 'b1', quantityStarted: 20 }),
      ];
      const result = getAverageCostPerPropagule(noCostBatches, []);
      expect(result.perStarted).toBe(0);
    });
  });

  describe('getCostBySupplyCategory', () => {
    const costs = [
      createMockCost({ id: 'c1', supplyId: 's1', calculatedCost: 10.00 }),
      createMockCost({ id: 'c2', supplyId: 's2', calculatedCost: 20.00 }),
      createMockCost({ id: 'c3', manualCost: 5.00 }),
    ];
    const supplyCategoryMap = new Map<string, SupplyCategory>([
      ['s1', 'rooting_hormone'],
      ['s2', 'growing_medium'],
    ]);

    it('groups by category', () => {
      const result = getCostBySupplyCategory(costs, supplyCategoryMap);
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes manual costs', () => {
      const result = getCostBySupplyCategory(costs, supplyCategoryMap);
      const manual = result.find((r) => r.category === 'manual');
      expect(manual?.totalCost).toBe(5.00);
    });

    it('calculates percentages', () => {
      const result = getCostBySupplyCategory(costs, supplyCategoryMap);
      // Total: 35, growing_medium: 20 = 57%
      const medium = result.find((r) => r.category === 'growing_medium');
      expect(medium?.percentage).toBe(57);
    });
  });

  describe('getMostExpensiveSpecies', () => {
    const batches = [
      createMockBatch({ id: 'b1', species: 'Lavender', quantityStarted: 20 }),
      createMockBatch({ id: 'b2', species: 'Lavender', quantityStarted: 10 }),
      createMockBatch({ id: 'b3', species: 'Rosemary', quantityStarted: 15 }),
    ];
    const costs = [
      createMockCost({ batchId: 'b1', calculatedCost: 20.00 }),
      createMockCost({ batchId: 'b2', calculatedCost: 10.00 }),
      createMockCost({ batchId: 'b3', calculatedCost: 25.00 }),
    ];

    it('aggregates costs by species', () => {
      const result = getMostExpensiveSpecies(batches, costs);
      const lavender = result.find((r) => r.species === 'Lavender');
      expect(lavender?.totalCost).toBe(30.00);
      expect(lavender?.batchCount).toBe(2);
    });

    it('calculates average cost per batch', () => {
      const result = getMostExpensiveSpecies(batches, costs);
      const lavender = result.find((r) => r.species === 'Lavender');
      expect(lavender?.avgCostPerBatch).toBe(15.00);
    });

    it('calculates average cost per propagule', () => {
      const result = getMostExpensiveSpecies(batches, costs);
      const lavender = result.find((r) => r.species === 'Lavender');
      // 30 / 30 propagules = 1.00
      expect(lavender?.avgCostPerPropagule).toBe(1.00);
    });

    it('sorts by total cost descending', () => {
      const result = getMostExpensiveSpecies(batches, costs);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].totalCost).toBeGreaterThanOrEqual(result[i].totalCost);
      }
    });
  });
});

// ============================================
// SUMMARY STATISTICS TESTS
// ============================================

describe('Summary Statistics', () => {
  // Inline function for testing
  function getSummaryStats(batches: PropBatch[]) {
    const totalBatches = batches.length;
    const activeBatches = batches.filter(
      (b) => b.stage !== 'graduated' && b.stage !== 'failed'
    ).length;
    const graduatedBatches = batches.filter((b) => b.stage === 'graduated').length;
    const failedBatches = batches.filter((b) => b.stage === 'failed').length;

    const completedBatches = graduatedBatches + failedBatches;
    const successRate =
      completedBatches > 0
        ? Math.round((graduatedBatches / completedBatches) * 100)
        : 0;

    const totalPropagulesStarted = batches.reduce(
      (sum, b) => sum + b.quantityStarted,
      0
    );
    const totalPropagulesSurviving = batches.reduce(
      (sum, b) => sum + b.quantitySurviving,
      0
    );

    const averageSurvivalRate =
      totalPropagulesStarted > 0
        ? Math.round((totalPropagulesSurviving / totalPropagulesStarted) * 100)
        : 0;

    return {
      totalBatches,
      activeBatches,
      graduatedBatches,
      failedBatches,
      successRate,
      totalPropagulesStarted,
      totalPropagulesSurviving,
      averageSurvivalRate,
    };
  }

  const batches = [
    createMockBatch({ id: 'b1', stage: 'rooting', quantityStarted: 20, quantitySurviving: 18 }),
    createMockBatch({ id: 'b2', stage: 'graduated', quantityStarted: 15, quantitySurviving: 12 }),
    createMockBatch({ id: 'b3', stage: 'graduated', quantityStarted: 10, quantitySurviving: 8 }),
    createMockBatch({ id: 'b4', stage: 'failed', quantityStarted: 20, quantitySurviving: 0 }),
  ];

  it('counts batches by status', () => {
    const stats = getSummaryStats(batches);
    expect(stats.totalBatches).toBe(4);
    expect(stats.activeBatches).toBe(1);
    expect(stats.graduatedBatches).toBe(2);
    expect(stats.failedBatches).toBe(1);
  });

  it('calculates success rate', () => {
    const stats = getSummaryStats(batches);
    // 2 graduated / 3 completed = 67%
    expect(stats.successRate).toBe(67);
  });

  it('sums propagule counts', () => {
    const stats = getSummaryStats(batches);
    expect(stats.totalPropagulesStarted).toBe(65);
    expect(stats.totalPropagulesSurviving).toBe(38);
  });

  it('calculates survival rate', () => {
    const stats = getSummaryStats(batches);
    // 38 / 65 = 58%
    expect(stats.averageSurvivalRate).toBe(58);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles empty batch list', () => {
    expect(calculateSuccessRate([])).toBe(0);
    expect(calculateSuccessRateBySpecies([])).toHaveLength(0);
  });

  it('handles all active batches (no completed)', () => {
    const batches = [
      createMockBatch({ stage: 'rooting' }),
      createMockBatch({ stage: 'potted_up' }),
    ];
    expect(calculateSuccessRate(batches)).toBe(0);
  });

  it('handles empty graduation list', () => {
    expect(getOutcomeDistribution([])).toHaveLength(0);
    expect(getTotalGraduated([]).count).toBe(0);
  });

  it('handles costs with undefined amounts', () => {
    const costs = [
      createMockCost({}), // No calculatedCost or manualCost
    ];
    const batches = [createMockBatch({ id: 'b1' })];
    const result = getAverageCostPerPropagule(batches, costs);
    expect(result.perStarted).toBe(0);
  });
});
