/**
 * useExperiment - Zustand store for experiment config and analytics
 *
 * Manages experiment settings, computes analytics from other stores,
 * and handles Week 6 decision data.
 */

import { create } from 'zustand';
import { growDb, type GrowExperiment, type GrowDecision } from '@/lib/db';
import { differenceInDays } from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface VarietyStats {
  variety: string;
  traysGrown: number;
  traysHarvested: number;
  successRate: number;
  avgYieldRatio: number;
  avgDaysToHarvest: number;
  gradeDistribution: Record<string, number>;
  totalHarvestWeight: number;
}

export interface ExperimentMetrics {
  totalTrays: number;
  harvestedTrays: number;
  failedTrays: number;
  overallSuccessRate: number;
  avgYieldRatio: number;
  totalHarvestWeight: number;
  daysElapsed: number;
  weeksElapsed: number;
  weeksRemaining: number;
  isComplete: boolean;
}

export interface CriterionStatus {
  id: string;
  label: string;
  target: string;
  actual: string | number;
  passed: boolean;
}

export interface ExperimentState {
  experiment: GrowExperiment | null;
  decision: GrowDecision | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadExperiment: () => Promise<void>;
  saveExperiment: (data: Partial<GrowExperiment>) => Promise<void>;
  loadDecision: () => Promise<void>;
  saveDecision: (data: Partial<GrowDecision>) => Promise<void>;

  // Computed
  getExperimentMetrics: (trays: { dateHarvested?: Date; qualityGrade?: string; harvestWeight?: number; seedWeight: number }[]) => ExperimentMetrics;
  getVarietyStats: (trays: { variety: string; dateHarvested?: Date; qualityGrade?: string; harvestWeight?: number; seedWeight: number; dateSown: Date }[]) => VarietyStats[];
  getCriteriaStatus: (metrics: ExperimentMetrics, weeklyHours: number) => CriterionStatus[];
  getFitScore: () => number | null;
}

// Default experiment config
const DEFAULT_EXPERIMENT: Omit<GrowExperiment, 'id'> = {
  startDate: new Date(),
  targetTrays: 20,
  targetSuccessRate: 80,
  targetHoursPerWeek: 9, // 8-10 hour range middle
};

// ============================================
// STORE
// ============================================

export const useExperiment = create<ExperimentState>((set, get) => ({
  experiment: null,
  decision: null,
  isLoading: true,
  error: null,

  // Load experiment config (create default if none exists)
  loadExperiment: async () => {
    try {
      let experiments = await growDb.experiments.toArray();

      if (experiments.length === 0) {
        // Create default experiment
        const id = await growDb.experiments.add(DEFAULT_EXPERIMENT as GrowExperiment);
        experiments = [{ ...DEFAULT_EXPERIMENT, id: String(id) } as GrowExperiment];
      }

      set({ experiment: experiments[0], isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Save experiment config
  saveExperiment: async (data) => {
    const { experiment } = get();

    try {
      if (experiment?.id) {
        await growDb.experiments.update(experiment.id, data);
        set({ experiment: { ...experiment, ...data } });
      } else {
        const id = await growDb.experiments.add({ ...DEFAULT_EXPERIMENT, ...data } as GrowExperiment);
        set({ experiment: { ...DEFAULT_EXPERIMENT, ...data, id: String(id) } as GrowExperiment });
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Load decision data
  loadDecision: async () => {
    try {
      const decisions = await growDb.decisions.toArray();
      set({ decision: decisions[0] || null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Save decision data
  saveDecision: async (data) => {
    const { decision } = get();
    const now = new Date();

    try {
      if (decision?.id) {
        const updated = { ...data, updatedAt: now };
        await growDb.decisions.update(decision.id, updated);
        set({ decision: { ...decision, ...updated } });
      } else {
        const newDecision: Omit<GrowDecision, 'id'> = {
          completedDate: now,
          enjoyedRoutine: data.enjoyedRoutine ?? 5,
          satisfiedGrowing: data.satisfiedGrowing ?? 5,
          comfortableFailures: data.comfortableFailures ?? 5,
          maintainedConsistency: data.maintainedConsistency ?? 5,
          familySupportive: data.familySupportive ?? 5,
          willingToScale: data.willingToScale ?? 5,
          decision: data.decision,
          surprises: data.surprises ?? '',
          harderThanExpected: data.harderThanExpected ?? '',
          easierThanExpected: data.easierThanExpected ?? '',
          wouldDoDifferently: data.wouldDoDifferently ?? '',
          neededForConfidence: data.neededForConfidence ?? '',
          createdAt: now,
          updatedAt: now,
        };
        const id = await growDb.decisions.add(newDecision as GrowDecision);
        set({ decision: { ...newDecision, id: String(id) } as GrowDecision });
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Compute experiment-wide metrics
  getExperimentMetrics: (trays) => {
    const { experiment } = get();
    const startDate = experiment?.startDate ? new Date(experiment.startDate) : new Date();

    const harvestedTrays = trays.filter((t) => t.dateHarvested);
    const successfulTrays = harvestedTrays.filter((t) => t.qualityGrade !== 'F');
    const failedTrays = harvestedTrays.filter((t) => t.qualityGrade === 'F');

    const totalHarvestWeight = harvestedTrays.reduce((sum, t) => sum + (t.harvestWeight || 0), 0);
    const totalSeedWeight = harvestedTrays.reduce((sum, t) => sum + t.seedWeight, 0);

    const daysElapsed = differenceInDays(new Date(), startDate);
    const weeksElapsed = Math.floor(daysElapsed / 7);
    const weeksRemaining = Math.max(0, 6 - weeksElapsed);

    return {
      totalTrays: trays.length,
      harvestedTrays: harvestedTrays.length,
      failedTrays: failedTrays.length,
      overallSuccessRate: harvestedTrays.length > 0
        ? Math.round((successfulTrays.length / harvestedTrays.length) * 100)
        : 0,
      avgYieldRatio: totalSeedWeight > 0
        ? Math.round((totalHarvestWeight / totalSeedWeight) * 100) / 100
        : 0,
      totalHarvestWeight,
      daysElapsed,
      weeksElapsed,
      weeksRemaining,
      isComplete: weeksElapsed >= 6,
    };
  },

  // Compute per-variety statistics
  getVarietyStats: (trays) => {
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

      stats.successRate = harvestedTrays.length > 0
        ? Math.round((successfulTrays.length / harvestedTrays.length) * 100)
        : 0;

      const totalSeedWeight = harvestedTrays.reduce((sum, t) => sum + t.seedWeight, 0);
      stats.avgYieldRatio = totalSeedWeight > 0
        ? Math.round((stats.totalHarvestWeight / totalSeedWeight) * 100) / 100
        : 0;

      const daysToHarvest = harvestedTrays.map((t) =>
        differenceInDays(new Date(t.dateHarvested!), new Date(t.dateSown))
      );
      stats.avgDaysToHarvest = daysToHarvest.length > 0
        ? Math.round(daysToHarvest.reduce((a, b) => a + b, 0) / daysToHarvest.length)
        : 0;
    }

    return Array.from(varietyMap.values()).sort((a, b) => b.traysHarvested - a.traysHarvested);
  },

  // Get pass/fail status for each criterion
  getCriteriaStatus: (metrics, weeklyHours) => {
    const { experiment } = get();
    const targetTrays = experiment?.targetTrays ?? 20;
    const targetSuccessRate = experiment?.targetSuccessRate ?? 80;
    const targetHoursPerWeek = experiment?.targetHoursPerWeek ?? 9;

    return [
      {
        id: 'trays',
        label: 'Trays Completed',
        target: `≥${targetTrays}`,
        actual: metrics.harvestedTrays,
        passed: metrics.harvestedTrays >= targetTrays,
      },
      {
        id: 'success',
        label: 'Success Rate',
        target: `≥${targetSuccessRate}%`,
        actual: `${metrics.overallSuccessRate}%`,
        passed: metrics.overallSuccessRate >= targetSuccessRate,
      },
      {
        id: 'yield',
        label: 'Yield Ratio',
        target: '≥6x',
        actual: `${metrics.avgYieldRatio}x`,
        passed: metrics.avgYieldRatio >= 6,
      },
      {
        id: 'time',
        label: 'Weekly Hours',
        target: `≤${targetHoursPerWeek}h`,
        actual: `${Math.round(weeklyHours * 10) / 10}h`,
        passed: weeklyHours <= targetHoursPerWeek,
      },
      {
        id: 'sellable',
        label: 'Sellable Quality',
        target: '≥70% A/B grade',
        actual: `${metrics.overallSuccessRate}%`,
        passed: metrics.overallSuccessRate >= 70,
      },
    ];
  },

  // Calculate total fit score (average of 6 personal fit scores)
  getFitScore: () => {
    const { decision } = get();
    if (!decision) return null;

    const scores = [
      decision.enjoyedRoutine,
      decision.satisfiedGrowing,
      decision.comfortableFailures,
      decision.maintainedConsistency,
      decision.familySupportive,
      decision.willingToScale,
    ].filter((s) => s !== undefined && s !== null);

    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  },
}));
