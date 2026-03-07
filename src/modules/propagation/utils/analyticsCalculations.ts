/**
 * Analytics Calculations - Barrel re-export + shared utilities
 *
 * Calculation domains split into focused modules:
 * - analyticsSuccessRate.ts  (success rate by dimension)
 * - analyticsFailures.ts     (failure analysis by stage/reason)
 * - analyticsOutcomes.ts     (outcome distribution & trends)
 * - analyticsCosts.ts        (cost per propagule, by category)
 *
 * This file keeps the date filtering helpers and display helpers
 * that are shared across domains.
 */

import type {
  PropBatch,
  PropGraduation,
  PropStageTransition,
  PropagationMethod,
  GraduationOutcome,
  FailureReason,
} from '../types';

// ============================================
// RE-EXPORTS from sub-modules
// ============================================

export type { SuccessRateResult } from './analyticsSuccessRate';
export {
  calculateSuccessRate,
  calculateSuccessRateByDimension,
  calculateSuccessRateBySpecies,
  calculateSuccessRateByMethod,
  calculateSuccessRateByStation,
  calculateSuccessRateByMotherPlant,
  calculateSuccessRateBySeason,
} from './analyticsSuccessRate';

export type { FailureByStage } from './analyticsFailures';
export {
  getFailuresByStage,
  getFailureReasonDistribution,
  getMostProblematicStage,
} from './analyticsFailures';

export type { OutcomeDistribution, MonthlyOutcome } from './analyticsOutcomes';
export {
  getOutcomeDistribution,
  getOutcomesByMonth,
  getTotalGraduated,
} from './analyticsOutcomes';

export type { CostByCategory, SpeciesCostRanking } from './analyticsCosts';
export {
  getAverageCostPerPropagule,
  getCostBySupplyCategory,
  getMostExpensiveSpecies,
} from './analyticsCosts';

// ============================================
// TYPES (shared)
// ============================================

/**
 * Time period filter options.
 */
export type TimePeriod = '30d' | '90d' | '1y' | 'all';

// ============================================
// DATE FILTERING HELPERS
// ============================================

/**
 * Get the cutoff date for a time period.
 */
export function getTimePeriodCutoff(period: TimePeriod): Date | null {
  if (period === 'all') return null;

  const now = new Date();
  switch (period) {
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Filter batches by time period based on dateTaken.
 */
export function filterBatchesByPeriod(
  batches: PropBatch[],
  period: TimePeriod
): PropBatch[] {
  const cutoff = getTimePeriodCutoff(period);
  if (!cutoff) return batches;
  return batches.filter((batch) => new Date(batch.dateTaken) >= cutoff);
}

/**
 * Filter graduations by time period.
 */
export function filterGraduationsByPeriod(
  graduations: PropGraduation[],
  period: TimePeriod
): PropGraduation[] {
  const cutoff = getTimePeriodCutoff(period);
  if (!cutoff) return graduations;
  return graduations.filter((g) => new Date(g.graduationDate) >= cutoff);
}

/**
 * Filter transitions by time period.
 */
export function filterTransitionsByPeriod(
  transitions: PropStageTransition[],
  period: TimePeriod
): PropStageTransition[] {
  const cutoff = getTimePeriodCutoff(period);
  if (!cutoff) return transitions;
  return transitions.filter((t) => new Date(t.transitionDate) >= cutoff);
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get display name for failure reason.
 */
export function getFailureReasonDisplayName(reason: FailureReason): string {
  const displayNames: Record<FailureReason, string> = {
    rot: 'Rot',
    dried_out: 'Dried Out',
    disease: 'Disease',
    pest: 'Pest Damage',
    no_roots: 'No Roots',
    transplant_shock: 'Transplant Shock',
    environmental: 'Environmental',
    unknown: 'Unknown',
  };
  return displayNames[reason] ?? reason;
}

/**
 * Get display name for graduation outcome.
 */
export function getOutcomeDisplayName(outcome: GraduationOutcome): string {
  const displayNames: Record<GraduationOutcome, string> = {
    personal_use: 'Personal Use',
    planted_garden: 'Planted in Garden',
    gifted: 'Gifted',
    sold: 'Sold',
    composted: 'Composted',
  };
  return displayNames[outcome] ?? outcome;
}

/**
 * Get display name for propagation method.
 */
export function getMethodDisplayName(method: PropagationMethod): string {
  const displayNames: Record<PropagationMethod, string> = {
    cutting_softwood: 'Softwood Cutting',
    cutting_semi_hardwood: 'Semi-Hardwood Cutting',
    cutting_hardwood: 'Hardwood Cutting',
    cutting_leaf: 'Leaf Cutting',
    cutting_root: 'Root Cutting',
    division: 'Division',
    layering_simple: 'Simple Layering',
    layering_air: 'Air Layering',
    grafting_whip: 'Whip Grafting',
    grafting_cleft: 'Cleft Grafting',
    grafting_bud: 'Bud Grafting',
    seed: 'Seed',
  };
  return displayNames[method] ?? method;
}

/**
 * Get time period display name.
 */
export function getTimePeriodDisplayName(period: TimePeriod): string {
  const displayNames: Record<TimePeriod, string> = {
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
    all: 'All Time',
  };
  return displayNames[period];
}
