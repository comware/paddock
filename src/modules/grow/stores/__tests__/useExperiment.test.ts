/**
 * useExperiment Store Unit Tests
 *
 * Tests the experiment/analytics store including:
 * - Experiment metrics computation (success rate, yield, totals)
 * - Per-variety statistics aggregation
 * - Criteria pass/fail evaluation
 * - Fit score calculation
 */

import { describe, it, expect } from 'vitest';
import { createMockTray, daysAgo } from '@/test/mocks/db';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

interface TrayForMetrics {
  variety: string;
  dateSown: Date;
  dateHarvested?: Date;
  qualityGrade?: 'A' | 'B' | 'C' | 'F';
  harvestWeight?: number;
  seedWeight: number;
}

interface ExperimentMetrics {
  totalTrays: number;
  harvestedTrays: number;
  failedTrays: number;
  overallSuccessRate: number;
  avgYieldRatio: number;
  totalHarvestWeight: number;
}

interface VarietyStats {
  variety: string;
  traysGrown: number;
  traysHarvested: number;
  successRate: number;
  avgYieldRatio: number;
  avgDaysToHarvest: number;
  gradeDistribution: Record<string, number>;
  totalHarvestWeight: number;
}

// ============================================
// HELPER FUNCTIONS (mirrored from store)
// ============================================

function computeExperimentMetrics(trays: TrayForMetrics[]): ExperimentMetrics {
  const harvestedTrays = trays.filter((t) => t.dateHarvested);
  const successfulTrays = harvestedTrays.filter((t) => t.qualityGrade !== 'F');
  const failedTrays = harvestedTrays.filter((t) => t.qualityGrade === 'F');

  const totalHarvestWeight = harvestedTrays.reduce(
    (sum, t) => sum + (t.harvestWeight || 0),
    0
  );
  const totalSeedWeight = harvestedTrays.reduce((sum, t) => sum + t.seedWeight, 0);

  return {
    totalTrays: trays.length,
    harvestedTrays: harvestedTrays.length,
    failedTrays: failedTrays.length,
    overallSuccessRate:
      harvestedTrays.length > 0
        ? Math.round((successfulTrays.length / harvestedTrays.length) * 100)
        : 0,
    avgYieldRatio:
      totalSeedWeight > 0
        ? Math.round((totalHarvestWeight / totalSeedWeight) * 100) / 100
        : 0,
    totalHarvestWeight,
  };
}

function computeVarietyStats(trays: TrayForMetrics[]): VarietyStats[] {
  const varietyMap = new Map<string, VarietyStats>();

  for (const tray of trays) {
    if (!varietyMap.has(tray.variety)) {
      varietyMap.set(tray.variety, {
        variety: tray.variety,
        traysGrown: 0,
        traysHarvested: 0,
        successRate: 0,
        avgYieldRatio: 0,
        avgDaysToHarvest: 0,
        gradeDistribution: { A: 0, B: 0, C: 0, F: 0 },
        totalHarvestWeight: 0,
      });
    }

    const stats = varietyMap.get(tray.variety)!;
    stats.traysGrown++;

    if (tray.dateHarvested) {
      stats.traysHarvested++;
      stats.totalHarvestWeight += tray.harvestWeight || 0;

      if (tray.qualityGrade) {
        stats.gradeDistribution[tray.qualityGrade] =
          (stats.gradeDistribution[tray.qualityGrade] || 0) + 1;
      }
    }
  }

  // Calculate averages
  for (const stats of varietyMap.values()) {
    const harvestedTrays = trays.filter(
      (t) => t.variety === stats.variety && t.dateHarvested
    );
    const successfulTrays = harvestedTrays.filter((t) => t.qualityGrade !== 'F');

    stats.successRate =
      harvestedTrays.length > 0
        ? Math.round((successfulTrays.length / harvestedTrays.length) * 100)
        : 0;

    const totalSeedWeight = harvestedTrays.reduce((sum, t) => sum + t.seedWeight, 0);
    stats.avgYieldRatio =
      totalSeedWeight > 0
        ? Math.round((stats.totalHarvestWeight / totalSeedWeight) * 100) / 100
        : 0;

    const daysToHarvest = harvestedTrays.map(
      (t) =>
        Math.floor(
          (t.dateHarvested!.getTime() - t.dateSown.getTime()) / (1000 * 60 * 60 * 24)
        )
    );
    stats.avgDaysToHarvest =
      daysToHarvest.length > 0
        ? Math.round(daysToHarvest.reduce((a, b) => a + b, 0) / daysToHarvest.length)
        : 0;
  }

  return Array.from(varietyMap.values()).sort(
    (a, b) => b.traysHarvested - a.traysHarvested
  );
}

interface CriterionStatus {
  id: string;
  passed: boolean;
}

function computeCriteriaStatus(
  metrics: ExperimentMetrics,
  weeklyHours: number,
  targets: { trays: number; successRate: number; hoursPerWeek: number }
): CriterionStatus[] {
  return [
    {
      id: 'trays',
      passed: metrics.harvestedTrays >= targets.trays,
    },
    {
      id: 'success',
      passed: metrics.overallSuccessRate >= targets.successRate,
    },
    {
      id: 'yield',
      passed: metrics.avgYieldRatio >= 6,
    },
    {
      id: 'time',
      passed: weeklyHours <= targets.hoursPerWeek,
    },
    {
      id: 'sellable',
      passed: metrics.overallSuccessRate >= 70,
    },
  ];
}

function computeFitScore(scores: (number | undefined | null)[]): number | null {
  const validScores = scores.filter(
    (s) => s !== undefined && s !== null
  ) as number[];
  if (validScores.length === 0) return null;
  return Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10;
}

// ============================================
// TEST DATA HELPERS
// ============================================

function createHarvestedTray(
  overrides: Partial<TrayForMetrics> = {}
): TrayForMetrics {
  const base = createMockTray({
    dateHarvested: daysAgo(1),
    harvestWeight: 200,
    qualityGrade: 'A',
    ...overrides,
  });
  return {
    variety: base.variety,
    dateSown: base.dateSown,
    dateHarvested: base.dateHarvested,
    qualityGrade: base.qualityGrade as 'A' | 'B' | 'C' | 'F' | undefined,
    harvestWeight: base.harvestWeight,
    seedWeight: base.seedWeight,
  };
}

function createActiveTray(
  overrides: Partial<TrayForMetrics> = {}
): TrayForMetrics {
  const base = createMockTray({
    dateHarvested: undefined,
    ...overrides,
  });
  return {
    variety: base.variety,
    dateSown: base.dateSown,
    dateHarvested: undefined,
    qualityGrade: undefined,
    harvestWeight: undefined,
    seedWeight: base.seedWeight,
  };
}

// ============================================
// EXPERIMENT METRICS TESTS
// ============================================

describe('Experiment Metrics Computation', () => {
  describe('computeExperimentMetrics', () => {
    it('returns zeros for empty tray list', () => {
      const metrics = computeExperimentMetrics([]);

      expect(metrics.totalTrays).toBe(0);
      expect(metrics.harvestedTrays).toBe(0);
      expect(metrics.failedTrays).toBe(0);
      expect(metrics.overallSuccessRate).toBe(0);
      expect(metrics.avgYieldRatio).toBe(0);
      expect(metrics.totalHarvestWeight).toBe(0);
    });

    it('counts total and harvested trays correctly', () => {
      const trays = [
        createHarvestedTray(),
        createHarvestedTray(),
        createActiveTray(),
        createActiveTray(),
        createActiveTray(),
      ];

      const metrics = computeExperimentMetrics(trays);

      expect(metrics.totalTrays).toBe(5);
      expect(metrics.harvestedTrays).toBe(2);
    });

    it('counts failed trays (F grade) correctly', () => {
      const trays = [
        createHarvestedTray({ qualityGrade: 'A' }),
        createHarvestedTray({ qualityGrade: 'B' }),
        createHarvestedTray({ qualityGrade: 'F' }),
        createHarvestedTray({ qualityGrade: 'F' }),
      ];

      const metrics = computeExperimentMetrics(trays);

      expect(metrics.harvestedTrays).toBe(4);
      expect(metrics.failedTrays).toBe(2);
    });

    it('calculates success rate correctly (non-F grades)', () => {
      const trays = [
        createHarvestedTray({ qualityGrade: 'A' }),
        createHarvestedTray({ qualityGrade: 'B' }),
        createHarvestedTray({ qualityGrade: 'C' }), // C is still "successful"
        createHarvestedTray({ qualityGrade: 'F' }),
      ];

      const metrics = computeExperimentMetrics(trays);

      // 3 successful out of 4 harvested = 75%
      expect(metrics.overallSuccessRate).toBe(75);
    });

    it('calculates 100% success rate when all are successful', () => {
      const trays = [
        createHarvestedTray({ qualityGrade: 'A' }),
        createHarvestedTray({ qualityGrade: 'A' }),
        createHarvestedTray({ qualityGrade: 'B' }),
      ];

      const metrics = computeExperimentMetrics(trays);

      expect(metrics.overallSuccessRate).toBe(100);
    });

    it('calculates average yield ratio from harvested trays', () => {
      const trays = [
        createHarvestedTray({ seedWeight: 50, harvestWeight: 200 }), // 4x
        createHarvestedTray({ seedWeight: 50, harvestWeight: 300 }), // 6x
        createActiveTray({ seedWeight: 50 }), // Not counted
      ];

      const metrics = computeExperimentMetrics(trays);

      // Total harvest: 500, Total seed: 100 = 5x
      expect(metrics.avgYieldRatio).toBe(5);
    });

    it('sums total harvest weight correctly', () => {
      const trays = [
        createHarvestedTray({ harvestWeight: 150 }),
        createHarvestedTray({ harvestWeight: 250 }),
        createHarvestedTray({ harvestWeight: 100 }),
      ];

      const metrics = computeExperimentMetrics(trays);

      expect(metrics.totalHarvestWeight).toBe(500);
    });

    it('excludes active trays from harvest calculations', () => {
      const trays = [
        createHarvestedTray({ harvestWeight: 200, seedWeight: 50 }),
        createActiveTray({ seedWeight: 100 }), // Has seed weight but not harvested
      ];

      const metrics = computeExperimentMetrics(trays);

      expect(metrics.harvestedTrays).toBe(1);
      expect(metrics.totalHarvestWeight).toBe(200);
      // Yield ratio should only consider harvested tray
      expect(metrics.avgYieldRatio).toBe(4); // 200/50
    });
  });
});

// ============================================
// VARIETY STATISTICS TESTS
// ============================================

describe('Variety Statistics Computation', () => {
  describe('computeVarietyStats', () => {
    it('returns empty array for no trays', () => {
      const stats = computeVarietyStats([]);
      expect(stats).toEqual([]);
    });

    it('groups trays by variety', () => {
      const trays = [
        createHarvestedTray({ variety: 'Sunflower' }),
        createHarvestedTray({ variety: 'Sunflower' }),
        createHarvestedTray({ variety: 'Pea Shoots' }),
        createActiveTray({ variety: 'Radish' }),
      ];

      const stats = computeVarietyStats(trays);

      expect(stats.length).toBe(3);
      expect(stats.find((s) => s.variety === 'Sunflower')?.traysGrown).toBe(2);
      expect(stats.find((s) => s.variety === 'Pea Shoots')?.traysGrown).toBe(1);
      expect(stats.find((s) => s.variety === 'Radish')?.traysGrown).toBe(1);
    });

    it('counts harvested vs grown correctly per variety', () => {
      const trays = [
        createHarvestedTray({ variety: 'Sunflower' }),
        createActiveTray({ variety: 'Sunflower' }),
        createActiveTray({ variety: 'Sunflower' }),
      ];

      const stats = computeVarietyStats(trays);
      const sunflower = stats.find((s) => s.variety === 'Sunflower')!;

      expect(sunflower.traysGrown).toBe(3);
      expect(sunflower.traysHarvested).toBe(1);
    });

    it('calculates success rate per variety', () => {
      const trays = [
        createHarvestedTray({ variety: 'Sunflower', qualityGrade: 'A' }),
        createHarvestedTray({ variety: 'Sunflower', qualityGrade: 'F' }),
        createHarvestedTray({ variety: 'Pea Shoots', qualityGrade: 'A' }),
        createHarvestedTray({ variety: 'Pea Shoots', qualityGrade: 'A' }),
      ];

      const stats = computeVarietyStats(trays);

      expect(stats.find((s) => s.variety === 'Sunflower')?.successRate).toBe(50);
      expect(stats.find((s) => s.variety === 'Pea Shoots')?.successRate).toBe(100);
    });

    it('calculates average yield ratio per variety', () => {
      const trays = [
        createHarvestedTray({ variety: 'Sunflower', seedWeight: 50, harvestWeight: 200 }),
        createHarvestedTray({ variety: 'Sunflower', seedWeight: 50, harvestWeight: 300 }),
      ];

      const stats = computeVarietyStats(trays);
      const sunflower = stats.find((s) => s.variety === 'Sunflower')!;

      // Total: 500g harvest / 100g seed = 5x
      expect(sunflower.avgYieldRatio).toBe(5);
    });

    it('calculates average days to harvest per variety', () => {
      const trays = [
        createHarvestedTray({
          variety: 'Sunflower',
          dateSown: daysAgo(14),
          dateHarvested: daysAgo(0),
        }), // 14 days
        createHarvestedTray({
          variety: 'Sunflower',
          dateSown: daysAgo(10),
          dateHarvested: daysAgo(0),
        }), // 10 days
      ];

      const stats = computeVarietyStats(trays);
      const sunflower = stats.find((s) => s.variety === 'Sunflower')!;

      // Average: (14 + 10) / 2 = 12 days
      expect(sunflower.avgDaysToHarvest).toBe(12);
    });

    it('tracks grade distribution per variety', () => {
      const trays = [
        createHarvestedTray({ variety: 'Sunflower', qualityGrade: 'A' }),
        createHarvestedTray({ variety: 'Sunflower', qualityGrade: 'A' }),
        createHarvestedTray({ variety: 'Sunflower', qualityGrade: 'B' }),
        createHarvestedTray({ variety: 'Sunflower', qualityGrade: 'F' }),
      ];

      const stats = computeVarietyStats(trays);
      const sunflower = stats.find((s) => s.variety === 'Sunflower')!;

      expect(sunflower.gradeDistribution.A).toBe(2);
      expect(sunflower.gradeDistribution.B).toBe(1);
      expect(sunflower.gradeDistribution.C).toBe(0);
      expect(sunflower.gradeDistribution.F).toBe(1);
    });

    it('sorts varieties by trays harvested (descending)', () => {
      const trays = [
        createHarvestedTray({ variety: 'Sunflower' }),
        createHarvestedTray({ variety: 'Pea Shoots' }),
        createHarvestedTray({ variety: 'Pea Shoots' }),
        createHarvestedTray({ variety: 'Pea Shoots' }),
        createHarvestedTray({ variety: 'Radish' }),
        createHarvestedTray({ variety: 'Radish' }),
      ];

      const stats = computeVarietyStats(trays);

      expect(stats[0].variety).toBe('Pea Shoots');
      expect(stats[0].traysHarvested).toBe(3);
      expect(stats[1].variety).toBe('Radish');
      expect(stats[1].traysHarvested).toBe(2);
      expect(stats[2].variety).toBe('Sunflower');
      expect(stats[2].traysHarvested).toBe(1);
    });

    it('handles variety with no harvested trays', () => {
      const trays = [
        createActiveTray({ variety: 'Sunflower' }),
        createActiveTray({ variety: 'Sunflower' }),
      ];

      const stats = computeVarietyStats(trays);
      const sunflower = stats.find((s) => s.variety === 'Sunflower')!;

      expect(sunflower.traysGrown).toBe(2);
      expect(sunflower.traysHarvested).toBe(0);
      expect(sunflower.successRate).toBe(0);
      expect(sunflower.avgYieldRatio).toBe(0);
      expect(sunflower.avgDaysToHarvest).toBe(0);
    });
  });
});

// ============================================
// CRITERIA STATUS TESTS
// ============================================

describe('Criteria Status Evaluation', () => {
  describe('computeCriteriaStatus', () => {
    const defaultTargets = {
      trays: 20,
      successRate: 80,
      hoursPerWeek: 9,
    };

    it('all criteria pass when targets exceeded', () => {
      const metrics: ExperimentMetrics = {
        totalTrays: 25,
        harvestedTrays: 22,
        failedTrays: 1,
        overallSuccessRate: 95,
        avgYieldRatio: 7,
        totalHarvestWeight: 5000,
      };

      const criteria = computeCriteriaStatus(metrics, 6, defaultTargets);

      expect(criteria.find((c) => c.id === 'trays')?.passed).toBe(true);
      expect(criteria.find((c) => c.id === 'success')?.passed).toBe(true);
      expect(criteria.find((c) => c.id === 'yield')?.passed).toBe(true);
      expect(criteria.find((c) => c.id === 'time')?.passed).toBe(true);
      expect(criteria.find((c) => c.id === 'sellable')?.passed).toBe(true);
    });

    it('trays criterion fails when below target', () => {
      const metrics: ExperimentMetrics = {
        totalTrays: 15,
        harvestedTrays: 10, // Below 20
        failedTrays: 1,
        overallSuccessRate: 90,
        avgYieldRatio: 7,
        totalHarvestWeight: 3000,
      };

      const criteria = computeCriteriaStatus(metrics, 8, defaultTargets);

      expect(criteria.find((c) => c.id === 'trays')?.passed).toBe(false);
    });

    it('success rate criterion fails when below target', () => {
      const metrics: ExperimentMetrics = {
        totalTrays: 25,
        harvestedTrays: 22,
        failedTrays: 5,
        overallSuccessRate: 75, // Below 80%
        avgYieldRatio: 7,
        totalHarvestWeight: 4000,
      };

      const criteria = computeCriteriaStatus(metrics, 8, defaultTargets);

      expect(criteria.find((c) => c.id === 'success')?.passed).toBe(false);
    });

    it('yield criterion fails when below 6x', () => {
      const metrics: ExperimentMetrics = {
        totalTrays: 25,
        harvestedTrays: 22,
        failedTrays: 2,
        overallSuccessRate: 90,
        avgYieldRatio: 4.5, // Below 6x
        totalHarvestWeight: 3000,
      };

      const criteria = computeCriteriaStatus(metrics, 8, defaultTargets);

      expect(criteria.find((c) => c.id === 'yield')?.passed).toBe(false);
    });

    it('time criterion fails when exceeding hours target', () => {
      const metrics: ExperimentMetrics = {
        totalTrays: 25,
        harvestedTrays: 22,
        failedTrays: 2,
        overallSuccessRate: 90,
        avgYieldRatio: 7,
        totalHarvestWeight: 5000,
      };

      const criteria = computeCriteriaStatus(metrics, 12, defaultTargets); // 12 hours > 9

      expect(criteria.find((c) => c.id === 'time')?.passed).toBe(false);
    });

    it('sellable criterion fails when success rate below 70%', () => {
      const metrics: ExperimentMetrics = {
        totalTrays: 20,
        harvestedTrays: 20,
        failedTrays: 8,
        overallSuccessRate: 60, // Below 70% sellable threshold
        avgYieldRatio: 6,
        totalHarvestWeight: 3000,
      };

      const criteria = computeCriteriaStatus(metrics, 8, defaultTargets);

      expect(criteria.find((c) => c.id === 'sellable')?.passed).toBe(false);
    });

    it('uses custom targets correctly', () => {
      const customTargets = {
        trays: 10, // Lower target
        successRate: 70,
        hoursPerWeek: 12,
      };

      const metrics: ExperimentMetrics = {
        totalTrays: 12,
        harvestedTrays: 11,
        failedTrays: 2,
        overallSuccessRate: 75, // Passes 70%, fails 80%
        avgYieldRatio: 5,
        totalHarvestWeight: 2500,
      };

      const criteria = computeCriteriaStatus(metrics, 10, customTargets);

      expect(criteria.find((c) => c.id === 'trays')?.passed).toBe(true);
      expect(criteria.find((c) => c.id === 'success')?.passed).toBe(true);
      expect(criteria.find((c) => c.id === 'time')?.passed).toBe(true);
    });
  });
});

// ============================================
// FIT SCORE TESTS
// ============================================

describe('Fit Score Calculation', () => {
  describe('computeFitScore', () => {
    it('returns null when no scores provided', () => {
      expect(computeFitScore([])).toBeNull();
    });

    it('returns null when all scores are undefined', () => {
      expect(computeFitScore([undefined, undefined, undefined])).toBeNull();
    });

    it('returns null when all scores are null', () => {
      expect(computeFitScore([null, null, null])).toBeNull();
    });

    it('calculates average of all 6 scores', () => {
      const scores = [8, 7, 6, 9, 8, 7]; // Sum: 45, Avg: 7.5
      expect(computeFitScore(scores)).toBe(7.5);
    });

    it('rounds to 1 decimal place', () => {
      const scores = [8, 7, 7, 8, 7, 6]; // Sum: 43, Avg: 7.166...
      expect(computeFitScore(scores)).toBe(7.2);
    });

    it('handles perfect scores (all 10)', () => {
      const scores = [10, 10, 10, 10, 10, 10];
      expect(computeFitScore(scores)).toBe(10);
    });

    it('handles minimum scores (all 1)', () => {
      const scores = [1, 1, 1, 1, 1, 1];
      expect(computeFitScore(scores)).toBe(1);
    });

    it('excludes undefined values from calculation', () => {
      const scores = [8, 8, undefined, 8]; // Only 3 valid scores
      expect(computeFitScore(scores)).toBe(8);
    });

    it('excludes null values from calculation', () => {
      const scores = [10, null, 8, null, 6, null]; // Only 3 valid scores
      // Sum: 24, Avg: 8.0
      expect(computeFitScore(scores)).toBe(8);
    });

    it('handles mixed valid and invalid scores', () => {
      const scores = [10, undefined, 8, null, 6];
      // Sum: 24, Avg: 8.0
      expect(computeFitScore(scores)).toBe(8);
    });

    it('handles single score', () => {
      const scores = [7];
      expect(computeFitScore(scores)).toBe(7);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Analytics Edge Cases', () => {
  it('handles trays with 0 seed weight gracefully', () => {
    const trays = [
      createHarvestedTray({ seedWeight: 0, harvestWeight: 100 }),
    ];

    const metrics = computeExperimentMetrics(trays);

    // Avoid division by zero
    expect(metrics.avgYieldRatio).toBe(0);
  });

  it('handles trays with undefined harvest weight', () => {
    const trays = [
      createHarvestedTray({ harvestWeight: undefined }),
    ];

    const metrics = computeExperimentMetrics(trays);

    expect(metrics.totalHarvestWeight).toBe(0);
  });

  it('handles very large numbers without overflow', () => {
    const trays = Array.from({ length: 100 }, (_, i) =>
      createHarvestedTray({
        seedWeight: 100,
        harvestWeight: 500,
        variety: i % 5 === 0 ? 'Sunflower' : 'Pea Shoots',
      })
    );

    const metrics = computeExperimentMetrics(trays);
    const varietyStats = computeVarietyStats(trays);

    expect(metrics.totalTrays).toBe(100);
    expect(metrics.totalHarvestWeight).toBe(50000);
    expect(varietyStats.length).toBe(2);
  });

  it('handles varieties with special characters in names', () => {
    const trays = [
      createHarvestedTray({ variety: 'Pea Shoots (Sweet)' }),
      createHarvestedTray({ variety: 'Micro-Greens Mix' }),
      createHarvestedTray({ variety: "Chef's Blend" }),
    ];

    const stats = computeVarietyStats(trays);

    expect(stats.length).toBe(3);
    expect(stats.map((s) => s.variety)).toContain('Pea Shoots (Sweet)');
    expect(stats.map((s) => s.variety)).toContain('Micro-Greens Mix');
    expect(stats.map((s) => s.variety)).toContain("Chef's Blend");
  });
});
