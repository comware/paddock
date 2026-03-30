/**
 * useAnalytics - Zustand store for propagation analytics
 *
 * Provides aggregated analytics calculations for success rates, failure analysis,
 * outcome tracking, and cost metrics. All calculations are derived from the
 * batch, graduation, transition, and cost stores.
 *
 * Following patterns from useBatches.ts and useBatchCosts.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropBatch,
  PropGraduation,
  PropBatchCost,
  PropStageTransition,
  PropagationStage,
  FailureReason,
  SupplyCategory,
} from '../types';
import { useBatches } from './useBatches';
import { useStageTransitions } from './useStageTransitions';
import { useSupplies } from './useSupplies';
import { useStations } from './useStations';
import { useMotherPlants } from './useMotherPlants';
import { useBatchCosts } from './useBatchCosts';
import {
  type TimePeriod,
  type SuccessRateResult,
  type FailureByStage,
  type OutcomeDistribution,
  type MonthlyOutcome,
  type CostByCategory,
  type SpeciesCostRanking,
  filterBatchesByPeriod,
  filterGraduationsByPeriod,
  filterTransitionsByPeriod,
  calculateSuccessRate,
  calculateSuccessRateBySpecies,
  calculateSuccessRateByMethod,
  calculateSuccessRateByStation,
  calculateSuccessRateByMotherPlant,
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
} from '../utils/analyticsCalculations';

// ============================================
// TYPES
// ============================================

/**
 * Analytics state with derived data.
 */
export interface AnalyticsState {
  // Data from DB (loaded separately from other stores for graduations)
  graduations: PropGraduation[];
  isLoading: boolean;
  error: string | null;

  // Current time period filter
  timePeriod: TimePeriod;

  // Actions
  loadGraduations: () => Promise<void>;
  setTimePeriod: (period: TimePeriod) => void;

  // Success Rate Selectors
  getOverallSuccessRate: () => number;
  getSuccessRateBySpecies: () => SuccessRateResult[];
  getSuccessRateByMethod: () => SuccessRateResult[];
  getSuccessRateByStation: () => SuccessRateResult[];
  getSuccessRateByMotherPlant: () => SuccessRateResult[];
  getSuccessRateBySeason: () => SuccessRateResult[];

  // Failure Analysis Selectors
  getFailuresByStage: () => FailureByStage[];
  getFailureReasonDistribution: () => {
    reason: FailureReason;
    count: number;
    percentage: number;
  }[];
  getMostProblematicStage: () => PropagationStage | null;
  getTotalFailures: () => number;

  // Outcome Selectors
  getOutcomeDistribution: () => OutcomeDistribution[];
  getOutcomesByMonth: () => MonthlyOutcome[];
  getTotalGraduated: () => { count: number; quantity: number };

  // Cost Analytics Selectors
  getAverageCostPerPropagule: () => { perStarted: number; perSurviving: number };
  getCostBySupplyCategory: () => CostByCategory[];
  getMostExpensiveSpecies: () => SpeciesCostRanking[];
  getTotalCosts: () => number;

  // Summary Statistics
  getSummaryStats: () => {
    totalBatches: number;
    activeBatches: number;
    graduatedBatches: number;
    failedBatches: number;
    successRate: number;
    totalPropagulesStarted: number;
    totalPropagulesSurviving: number;
    averageSurvivalRate: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get batches from useBatches store filtered by current time period.
 */
function getFilteredBatches(period: TimePeriod): PropBatch[] {
  const batches = useBatches.getState().rawBatches;
  return filterBatchesByPeriod(batches, period);
}

/**
 * Get transitions from useStageTransitions store filtered by current time period.
 */
function getFilteredTransitions(period: TimePeriod): PropStageTransition[] {
  const transitions = useStageTransitions.getState().transitions;
  return filterTransitionsByPeriod(transitions, period);
}

/**
 * Get station name map for lookups.
 */
function getStationNameMap(): Map<string, string> {
  const stations = useStations.getState().stations;
  return new Map(stations.map((s) => [s.id as string, s.name]));
}

/**
 * Get mother plant label map for lookups.
 */
function getMotherPlantLabelMap(): Map<string, string> {
  const motherPlants = useMotherPlants.getState().motherPlants;
  return new Map(motherPlants.map((m) => [m.id as string, m.label]));
}

/**
 * Get supply category map for cost lookups.
 */
function getSupplyCategoryMap(): Map<string, SupplyCategory> {
  const supplies = useSupplies.getState().rawSupplies;
  return new Map(supplies.map((s) => [s.id as string, s.category]));
}

/**
 * Get all costs from useBatchCosts store.
 */
function getAllCosts(): PropBatchCost[] {
  return useBatchCosts.getState().rawCosts;
}

// ============================================
// STORE
// ============================================

export const useAnalytics = create<AnalyticsState>((set, get) => ({
  graduations: [],
  isLoading: true,
  error: null,
  timePeriod: 'all',

  // Load graduations from database
  loadGraduations: async () => {
    try {
      set({ isLoading: true, error: null });
      const graduations = await propDb.graduations.toArray();
      set({ graduations, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Set time period filter
  setTimePeriod: (period: TimePeriod) => {
    set({ timePeriod: period });
  },

  // ============================================
  // SUCCESS RATE SELECTORS
  // ============================================

  // Get overall success rate for the current time period
  getOverallSuccessRate: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    return calculateSuccessRate(batches);
  },

  // Get success rate grouped by species
  getSuccessRateBySpecies: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    return calculateSuccessRateBySpecies(batches);
  },

  // Get success rate grouped by propagation method
  getSuccessRateByMethod: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    return calculateSuccessRateByMethod(batches);
  },

  // Get success rate grouped by station
  getSuccessRateByStation: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const stationNames = getStationNameMap();
    return calculateSuccessRateByStation(batches, stationNames);
  },

  // Get success rate grouped by mother plant
  getSuccessRateByMotherPlant: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const motherPlantLabels = getMotherPlantLabelMap();
    return calculateSuccessRateByMotherPlant(batches, motherPlantLabels);
  },

  // Get success rate grouped by season
  getSuccessRateBySeason: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    return calculateSuccessRateBySeason(batches);
  },

  // ============================================
  // FAILURE ANALYSIS SELECTORS
  // ============================================

  // Get failures grouped by stage where they occurred
  getFailuresByStage: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const transitions = getFilteredTransitions(timePeriod);
    return getFailuresByStage(batches, transitions);
  },

  // Get failure reason distribution
  getFailureReasonDistribution: () => {
    const { timePeriod } = get();
    const transitions = getFilteredTransitions(timePeriod);
    return getFailureReasonDistribution(transitions);
  },

  // Get the stage with the most failures
  getMostProblematicStage: () => {
    const failuresByStage = get().getFailuresByStage();
    return getMostProblematicStage(failuresByStage);
  },

  // Get total number of failures
  getTotalFailures: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    return batches.filter((b) => b.stage === 'failed').length;
  },

  // ============================================
  // OUTCOME SELECTORS
  // ============================================

  // Get outcome distribution for graduated batches
  getOutcomeDistribution: () => {
    const { graduations, timePeriod } = get();
    const filteredGraduations = filterGraduationsByPeriod(graduations, timePeriod);
    return getOutcomeDistribution(filteredGraduations);
  },

  // Get outcomes aggregated by month for trend charts
  getOutcomesByMonth: () => {
    const { graduations, timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const filteredGraduations = filterGraduationsByPeriod(graduations, timePeriod);
    return getOutcomesByMonth(batches, filteredGraduations);
  },

  // Get total graduated count and quantity
  getTotalGraduated: () => {
    const { graduations, timePeriod } = get();
    const filteredGraduations = filterGraduationsByPeriod(graduations, timePeriod);
    return getTotalGraduated(filteredGraduations);
  },

  // ============================================
  // COST ANALYTICS SELECTORS
  // ============================================

  // Get average cost per propagule
  getAverageCostPerPropagule: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const costs = getAllCosts();

    // Filter costs to batches in the current period
    const batchIds = new Set(batches.map((b) => b.id));
    const filteredCosts = costs.filter((c) => batchIds.has(c.batchId));

    return getAverageCostPerPropagule(batches, filteredCosts);
  },

  // Get costs grouped by supply category
  getCostBySupplyCategory: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const costs = getAllCosts();
    const supplyCategoryMap = getSupplyCategoryMap();

    // Filter costs to batches in the current period
    const batchIds = new Set(batches.map((b) => b.id));
    const filteredCosts = costs.filter((c) => batchIds.has(c.batchId));

    return getCostBySupplyCategory(filteredCosts, supplyCategoryMap);
  },

  // Get species ranked by total cost
  getMostExpensiveSpecies: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const costs = getAllCosts();

    // Filter costs to batches in the current period
    const batchIds = new Set(batches.map((b) => b.id));
    const filteredCosts = costs.filter((c) => batchIds.has(c.batchId));

    return getMostExpensiveSpecies(batches, filteredCosts);
  },

  // Get total costs for the current period
  getTotalCosts: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);
    const costs = getAllCosts();

    // Filter costs to batches in the current period
    const batchIds = new Set(batches.map((b) => b.id));
    const filteredCosts = costs.filter((c) => batchIds.has(c.batchId));

    return filteredCosts.reduce((total, cost) => {
      const amount = cost.calculatedCost ?? cost.manualCost ?? 0;
      return total + amount;
    }, 0);
  },

  // ============================================
  // SUMMARY STATISTICS
  // ============================================

  // Get comprehensive summary stats for dashboard
  getSummaryStats: () => {
    const { timePeriod } = get();
    const batches = getFilteredBatches(timePeriod);

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
  },
}));
