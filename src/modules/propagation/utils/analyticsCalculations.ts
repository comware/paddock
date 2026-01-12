/**
 * Analytics Calculations - Utility functions for propagation analytics
 *
 * Provides aggregated analytics calculations for success rates, failure analysis,
 * outcome distributions, and cost metrics. Used by useAnalytics store.
 *
 * Following patterns from costCalculations.ts and motherPlantMetrics.ts
 */

import type {
  PropBatch,
  PropGraduation,
  PropBatchCost,
  PropStageTransition,
  PropagationStage,
  PropagationMethod,
  GraduationOutcome,
  FailureReason,
  SupplyCategory,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Time period filter options.
 */
export type TimePeriod = '30d' | '90d' | '1y' | 'all';

/**
 * Success rate result with breakdown details.
 */
export interface SuccessRateResult {
  dimension: string; // species, method, station, etc.
  graduated: number;
  failed: number;
  active: number;
  total: number;
  successRate: number; // percentage (graduated / (graduated + failed))
  completionRate: number; // percentage of batches that reached terminal state
}

/**
 * Failure analysis by stage.
 */
export interface FailureByStage {
  stage: PropagationStage;
  count: number;
  percentage: number;
}

/**
 * Outcome distribution for graduated batches.
 */
export interface OutcomeDistribution {
  outcome: GraduationOutcome;
  count: number;
  quantity: number; // total propagules
  percentage: number;
}

/**
 * Monthly outcome data for trends.
 */
export interface MonthlyOutcome {
  month: string; // YYYY-MM format
  graduated: number;
  failed: number;
  quantity: number;
}

/**
 * Cost by category aggregation.
 */
export interface CostByCategory {
  category: SupplyCategory | 'manual';
  totalCost: number;
  percentage: number;
}

/**
 * Species cost ranking.
 */
export interface SpeciesCostRanking {
  species: string;
  totalCost: number;
  batchCount: number;
  avgCostPerBatch: number;
  avgCostPerPropagule: number;
}

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
// SUCCESS RATE CALCULATIONS
// ============================================

/**
 * Calculate success rate for a group of batches.
 * Success rate = graduated / (graduated + failed)
 */
export function calculateSuccessRate(batches: PropBatch[]): number {
  const graduated = batches.filter((b) => b.stage === 'graduated').length;
  const failed = batches.filter((b) => b.stage === 'failed').length;
  const total = graduated + failed;

  if (total === 0) return 0;
  return Math.round((graduated / total) * 100);
}

/**
 * Calculate success rates grouped by a dimension (species, method, etc).
 */
export function calculateSuccessRateByDimension<K extends string>(
  batches: PropBatch[],
  getDimension: (batch: PropBatch) => K
): SuccessRateResult[] {
  // Group batches by dimension
  const groups = new Map<K, PropBatch[]>();

  for (const batch of batches) {
    const key = getDimension(batch);
    const existing = groups.get(key) ?? [];
    existing.push(batch);
    groups.set(key, existing);
  }

  // Calculate metrics for each group
  const results: SuccessRateResult[] = [];

  for (const [dimension, groupBatches] of groups) {
    const graduated = groupBatches.filter((b) => b.stage === 'graduated').length;
    const failed = groupBatches.filter((b) => b.stage === 'failed').length;
    const active = groupBatches.filter(
      (b) => b.stage !== 'graduated' && b.stage !== 'failed'
    ).length;
    const total = groupBatches.length;
    const completed = graduated + failed;

    results.push({
      dimension,
      graduated,
      failed,
      active,
      total,
      successRate: completed > 0 ? Math.round((graduated / completed) * 100) : 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  // Sort by total batches descending
  return results.sort((a, b) => b.total - a.total);
}

/**
 * Calculate success rate by species.
 */
export function calculateSuccessRateBySpecies(
  batches: PropBatch[]
): SuccessRateResult[] {
  return calculateSuccessRateByDimension(batches, (b) => b.species);
}

/**
 * Calculate success rate by propagation method.
 */
export function calculateSuccessRateByMethod(
  batches: PropBatch[]
): SuccessRateResult[] {
  return calculateSuccessRateByDimension(batches, (b) => b.method);
}

/**
 * Calculate success rate by station.
 */
export function calculateSuccessRateByStation(
  batches: PropBatch[],
  stationNames: Map<string, string>
): SuccessRateResult[] {
  return calculateSuccessRateByDimension(batches, (b) =>
    stationNames.get(b.stationId) ?? b.stationId
  );
}

/**
 * Calculate success rate by mother plant.
 */
export function calculateSuccessRateByMotherPlant(
  batches: PropBatch[],
  motherPlantLabels: Map<string, string>
): SuccessRateResult[] {
  // Filter to batches with mother plant reference
  const batchesWithMother = batches.filter((b) => b.motherPlantId);

  return calculateSuccessRateByDimension(batchesWithMother, (b) =>
    motherPlantLabels.get(b.motherPlantId!) ?? b.motherPlantId!
  );
}

/**
 * Get season from date (Southern Hemisphere).
 */
function getSeasonFromDate(date: Date): string {
  const month = new Date(date).getMonth();
  if (month === 11 || month === 0 || month === 1) return 'Summer';
  if (month >= 2 && month <= 4) return 'Autumn';
  if (month >= 5 && month <= 7) return 'Winter';
  return 'Spring';
}

/**
 * Calculate success rate by season.
 */
export function calculateSuccessRateBySeason(
  batches: PropBatch[]
): SuccessRateResult[] {
  return calculateSuccessRateByDimension(batches, (b) =>
    getSeasonFromDate(b.dateTaken)
  );
}

// ============================================
// FAILURE ANALYSIS
// ============================================

/**
 * Get the stage at which each batch failed.
 * Uses the fromStage of the failure transition.
 */
export function getFailuresByStage(
  batches: PropBatch[],
  transitions: PropStageTransition[]
): FailureByStage[] {
  const failedBatches = batches.filter((b) => b.stage === 'failed');

  if (failedBatches.length === 0) {
    return [];
  }

  // Build a map of batchId -> fromStage for failed transitions
  const failureStages = new Map<string, PropagationStage>();
  for (const transition of transitions) {
    if (transition.toStage === 'failed' && transition.batchId && transition.fromStage) {
      failureStages.set(transition.batchId, transition.fromStage);
    }
  }

  // Count failures by stage
  const stageCounts = new Map<PropagationStage, number>();
  for (const batch of failedBatches) {
    const failedAt = failureStages.get(batch.id!) ?? 'taken'; // Default if no transition found
    const count = stageCounts.get(failedAt) ?? 0;
    stageCounts.set(failedAt, count + 1);
  }

  // Convert to array with percentages
  const totalFailures = failedBatches.length;
  const results: FailureByStage[] = [];

  for (const [stage, count] of stageCounts) {
    results.push({
      stage,
      count,
      percentage: Math.round((count / totalFailures) * 100),
    });
  }

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get failure reason distribution.
 */
export function getFailureReasonDistribution(
  transitions: PropStageTransition[]
): { reason: FailureReason; count: number; percentage: number }[] {
  const failedTransitions = transitions.filter(
    (t) => t.toStage === 'failed' && t.failureReason
  );

  if (failedTransitions.length === 0) {
    return [];
  }

  // Count by reason
  const reasonCounts = new Map<FailureReason, number>();
  for (const t of failedTransitions) {
    if (t.failureReason) {
      const count = reasonCounts.get(t.failureReason) ?? 0;
      reasonCounts.set(t.failureReason, count + 1);
    }
  }

  // Convert to array with percentages
  const total = failedTransitions.length;
  const results: { reason: FailureReason; count: number; percentage: number }[] = [];

  for (const [reason, count] of reasonCounts) {
    results.push({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    });
  }

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get the most problematic stage (highest failure rate).
 */
export function getMostProblematicStage(
  failuresByStage: FailureByStage[]
): PropagationStage | null {
  if (failuresByStage.length === 0) return null;
  return failuresByStage[0].stage;
}

// ============================================
// OUTCOME ANALYTICS
// ============================================

/**
 * Calculate outcome distribution from graduations.
 */
export function getOutcomeDistribution(
  graduations: PropGraduation[]
): OutcomeDistribution[] {
  if (graduations.length === 0) {
    return [];
  }

  // Group by outcome
  const outcomeTotals = new Map<
    GraduationOutcome,
    { count: number; quantity: number }
  >();

  for (const graduation of graduations) {
    const existing = outcomeTotals.get(graduation.outcome) ?? {
      count: 0,
      quantity: 0,
    };
    existing.count++;
    existing.quantity += graduation.quantity;
    outcomeTotals.set(graduation.outcome, existing);
  }

  // Calculate totals for percentages
  const totalCount = graduations.length;

  // Convert to array with percentages
  const results: OutcomeDistribution[] = [];

  for (const [outcome, totals] of outcomeTotals) {
    results.push({
      outcome,
      count: totals.count,
      quantity: totals.quantity,
      percentage: Math.round((totals.count / totalCount) * 100),
    });
  }

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get outcomes aggregated by month for trend analysis.
 */
export function getOutcomesByMonth(
  batches: PropBatch[],
  graduations: PropGraduation[]
): MonthlyOutcome[] {
  // Get all unique months from batches
  const monthlyData = new Map<
    string,
    { graduated: number; failed: number; quantity: number }
  >();

  // Count failures by month (using the most recent transition date or batch dateTaken)
  for (const batch of batches) {
    if (batch.stage === 'failed') {
      // Use dateTaken as approximation for when it failed
      const monthKey = formatMonthKey(new Date(batch.dateTaken));
      const existing = monthlyData.get(monthKey) ?? {
        graduated: 0,
        failed: 0,
        quantity: 0,
      };
      existing.failed++;
      monthlyData.set(monthKey, existing);
    }
  }

  // Add graduation data
  for (const graduation of graduations) {
    const monthKey = formatMonthKey(new Date(graduation.graduationDate));
    const existing = monthlyData.get(monthKey) ?? {
      graduated: 0,
      failed: 0,
      quantity: 0,
    };
    existing.graduated++;
    existing.quantity += graduation.quantity;
    monthlyData.set(monthKey, existing);
  }

  // Convert to array and sort by month
  const results: MonthlyOutcome[] = [];

  for (const [month, data] of monthlyData) {
    results.push({
      month,
      graduated: data.graduated,
      failed: data.failed,
      quantity: data.quantity,
    });
  }

  // Sort chronologically
  return results.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Format date to YYYY-MM string.
 */
function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get total graduated count and quantity.
 */
export function getTotalGraduated(graduations: PropGraduation[]): {
  count: number;
  quantity: number;
} {
  return {
    count: graduations.length,
    quantity: graduations.reduce((sum, g) => sum + g.quantity, 0),
  };
}

// ============================================
// COST ANALYTICS
// ============================================

/**
 * Calculate average cost per propagule across all batches.
 */
export function getAverageCostPerPropagule(
  batches: PropBatch[],
  costs: PropBatchCost[]
): { perStarted: number; perSurviving: number } {
  // Group costs by batch
  const costsByBatch = new Map<string, number>();
  for (const cost of costs) {
    const existing = costsByBatch.get(cost.batchId) ?? 0;
    const amount = cost.calculatedCost ?? cost.manualCost ?? 0;
    costsByBatch.set(cost.batchId, existing + amount);
  }

  // Calculate totals
  let totalCost = 0;
  let totalStarted = 0;
  let totalSurviving = 0;

  for (const batch of batches) {
    const batchCost = costsByBatch.get(batch.id!) ?? 0;
    totalCost += batchCost;
    totalStarted += batch.quantityStarted;
    totalSurviving += batch.quantitySurviving;
  }

  return {
    perStarted: totalStarted > 0 ? totalCost / totalStarted : 0,
    perSurviving: totalSurviving > 0 ? totalCost / totalSurviving : 0,
  };
}

/**
 * Get costs grouped by supply category.
 */
export function getCostBySupplyCategory(
  costs: PropBatchCost[],
  supplyCategoryMap: Map<string, SupplyCategory>
): CostByCategory[] {
  const categoryTotals = new Map<SupplyCategory | 'manual', number>();

  for (const cost of costs) {
    if (cost.manualCost !== undefined && cost.manualCost > 0) {
      const existing = categoryTotals.get('manual') ?? 0;
      categoryTotals.set('manual', existing + cost.manualCost);
    } else if (cost.supplyId && cost.calculatedCost !== undefined) {
      const category = supplyCategoryMap.get(cost.supplyId) ?? 'other';
      const existing = categoryTotals.get(category) ?? 0;
      categoryTotals.set(category, existing + cost.calculatedCost);
    }
  }

  // Calculate total for percentages
  let totalCost = 0;
  for (const amount of categoryTotals.values()) {
    totalCost += amount;
  }

  // Convert to array
  const results: CostByCategory[] = [];

  for (const [category, amount] of categoryTotals) {
    results.push({
      category,
      totalCost: amount,
      percentage: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0,
    });
  }

  // Sort by total cost descending
  return results.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Get cost ranking by species.
 */
export function getMostExpensiveSpecies(
  batches: PropBatch[],
  costs: PropBatchCost[]
): SpeciesCostRanking[] {
  // Group costs by batch
  const costsByBatch = new Map<string, number>();
  for (const cost of costs) {
    const existing = costsByBatch.get(cost.batchId) ?? 0;
    const amount = cost.calculatedCost ?? cost.manualCost ?? 0;
    costsByBatch.set(cost.batchId, existing + amount);
  }

  // Aggregate by species
  const speciesData = new Map<
    string,
    { totalCost: number; batchCount: number; totalPropagules: number }
  >();

  for (const batch of batches) {
    const batchCost = costsByBatch.get(batch.id!) ?? 0;
    const existing = speciesData.get(batch.species) ?? {
      totalCost: 0,
      batchCount: 0,
      totalPropagules: 0,
    };
    existing.totalCost += batchCost;
    existing.batchCount++;
    existing.totalPropagules += batch.quantityStarted;
    speciesData.set(batch.species, existing);
  }

  // Convert to array
  const results: SpeciesCostRanking[] = [];

  for (const [species, data] of speciesData) {
    results.push({
      species,
      totalCost: data.totalCost,
      batchCount: data.batchCount,
      avgCostPerBatch: data.batchCount > 0 ? data.totalCost / data.batchCount : 0,
      avgCostPerPropagule:
        data.totalPropagules > 0 ? data.totalCost / data.totalPropagules : 0,
    });
  }

  // Sort by total cost descending
  return results.sort((a, b) => b.totalCost - a.totalCost);
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
