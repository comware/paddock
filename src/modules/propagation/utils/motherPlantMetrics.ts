/**
 * motherPlantMetrics - Productivity calculations for mother plants
 *
 * Calculates metrics by querying batches that reference a mother plant.
 * Metrics include total batches taken, success rate, and propagation efficiency.
 *
 * Following patterns from stageHelpers.ts
 */

import { propDb } from '@/lib/db';
import type { PropBatch, MotherPlantMetrics, PropagationMethod } from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Extended metrics with additional detail.
 */
export interface ExtendedMotherPlantMetrics extends MotherPlantMetrics {
  // Additional detail
  totalFailed: number;
  totalActive: number;
  averageBatchSize: number;
  recentBatches: Pick<PropBatch, 'id' | 'batchNumber' | 'stage' | 'dateTaken' | 'quantityStarted' | 'quantitySurviving'>[];
  methodBreakdown: { method: PropagationMethod; count: number; successRate: number }[];
}

/**
 * Summary metrics for dashboard display.
 */
export interface MotherPlantSummary {
  motherPlantId: string;
  totalBatches: number;
  successRate: number;
  lastBatchDate: Date | null;
}

// ============================================
// CORE METRIC FUNCTIONS
// ============================================

/**
 * Get all batches taken from a specific mother plant.
 */
export async function getBatchesByMotherPlant(motherPlantId: string): Promise<PropBatch[]> {
  return propDb.batches
    .where('motherPlantId')
    .equals(motherPlantId)
    .toArray();
}

/**
 * Get total count of batches taken from a mother plant.
 */
export async function getTotalBatchesTaken(motherPlantId: string): Promise<number> {
  return propDb.batches
    .where('motherPlantId')
    .equals(motherPlantId)
    .count();
}

/**
 * Get total propagules started from a mother plant.
 */
export async function getTotalPropagulesStarted(motherPlantId: string): Promise<number> {
  const batches = await getBatchesByMotherPlant(motherPlantId);
  return batches.reduce((sum, batch) => sum + batch.quantityStarted, 0);
}

/**
 * Get total propagules that graduated from a mother plant.
 */
export async function getTotalPropagulesGraduated(motherPlantId: string): Promise<number> {
  const batches = await getBatchesByMotherPlant(motherPlantId);
  return batches
    .filter((b) => b.stage === 'graduated')
    .reduce((sum, batch) => sum + batch.quantitySurviving, 0);
}

/**
 * Calculate success rate for a mother plant.
 * Success rate = graduated batches / (graduated + failed batches)
 * Returns percentage (0-100).
 */
export async function getSuccessRate(motherPlantId: string): Promise<number> {
  const batches = await getBatchesByMotherPlant(motherPlantId);

  const graduated = batches.filter((b) => b.stage === 'graduated').length;
  const failed = batches.filter((b) => b.stage === 'failed').length;
  const total = graduated + failed;

  if (total === 0) return 0;
  return Math.round((graduated / total) * 100);
}

/**
 * Calculate propagule-level success rate.
 * Returns graduated propagules / started propagules as percentage.
 */
export async function getPropaguleSuccessRate(motherPlantId: string): Promise<number> {
  const batches = await getBatchesByMotherPlant(motherPlantId);

  const totalStarted = batches.reduce((sum, b) => sum + b.quantityStarted, 0);
  const totalGraduated = batches
    .filter((b) => b.stage === 'graduated')
    .reduce((sum, b) => sum + b.quantitySurviving, 0);

  if (totalStarted === 0) return 0;
  return Math.round((totalGraduated / totalStarted) * 100);
}

// ============================================
// COMPREHENSIVE METRICS
// ============================================

/**
 * Get complete metrics for a mother plant.
 * Returns the MotherPlantMetrics type from types/index.ts.
 */
export async function getMotherPlantMetrics(motherPlantId: string): Promise<MotherPlantMetrics> {
  const batches = await getBatchesByMotherPlant(motherPlantId);

  const totalBatches = batches.length;
  const totalPropagules = batches.reduce((sum, b) => sum + b.quantityStarted, 0);
  const graduatedBatches = batches.filter((b) => b.stage === 'graduated');
  const totalGraduated = graduatedBatches.reduce((sum, b) => sum + b.quantitySurviving, 0);

  // Calculate batch-level success rate
  const failedCount = batches.filter((b) => b.stage === 'failed').length;
  const completedCount = graduatedBatches.length + failedCount;
  const successRate = completedCount === 0 ? 0 : Math.round((graduatedBatches.length / completedCount) * 100);

  // Calculate average success rate across all completed batches
  const completedBatches = batches.filter((b) => b.stage === 'graduated' || b.stage === 'failed');
  let averageSuccessRate = 0;
  if (completedBatches.length > 0) {
    const batchRates = completedBatches.map((b) => {
      if (b.stage === 'failed') return 0;
      return b.quantityStarted > 0 ? (b.quantitySurviving / b.quantityStarted) * 100 : 0;
    });
    averageSuccessRate = Math.round(batchRates.reduce((a, b) => a + b, 0) / batchRates.length);
  }

  // Determine best method (most successful)
  const methodStats = new Map<PropagationMethod, { graduated: number; total: number }>();
  for (const batch of batches) {
    const stats = methodStats.get(batch.method) ?? { graduated: 0, total: 0 };
    if (batch.stage === 'graduated' || batch.stage === 'failed') {
      stats.total++;
      if (batch.stage === 'graduated') stats.graduated++;
    }
    methodStats.set(batch.method, stats);
  }

  let bestMethod: PropagationMethod | undefined;
  let bestMethodRate = 0;
  for (const [method, stats] of methodStats) {
    if (stats.total >= 2) {
      // Require at least 2 completed batches
      const rate = stats.graduated / stats.total;
      if (rate > bestMethodRate) {
        bestMethodRate = rate;
        bestMethod = method;
      }
    }
  }

  // Determine best season based on graduated batches
  const seasonStats = new Map<string, { graduated: number; total: number }>();
  for (const batch of batches) {
    const month = new Date(batch.dateTaken).getMonth();
    const season = getSeasonFromMonth(month);
    const stats = seasonStats.get(season) ?? { graduated: 0, total: 0 };
    if (batch.stage === 'graduated' || batch.stage === 'failed') {
      stats.total++;
      if (batch.stage === 'graduated') stats.graduated++;
    }
    seasonStats.set(season, stats);
  }

  let bestSeason: string | undefined;
  let bestSeasonRate = 0;
  for (const [season, stats] of seasonStats) {
    if (stats.total >= 2) {
      // Require at least 2 completed batches
      const rate = stats.graduated / stats.total;
      if (rate > bestSeasonRate) {
        bestSeasonRate = rate;
        bestSeason = season;
      }
    }
  }

  return {
    totalBatches,
    totalPropagules,
    totalGraduated,
    successRate,
    averageSuccessRate,
    bestMethod,
    bestSeason,
  };
}

/**
 * Get extended metrics with additional breakdown.
 */
export async function getExtendedMotherPlantMetrics(
  motherPlantId: string
): Promise<ExtendedMotherPlantMetrics> {
  const batches = await getBatchesByMotherPlant(motherPlantId);
  const baseMetrics = await getMotherPlantMetrics(motherPlantId);

  const activeBatches = batches.filter(
    (b) => b.stage !== 'graduated' && b.stage !== 'failed'
  );
  const failedBatches = batches.filter((b) => b.stage === 'failed');

  // Calculate method breakdown
  const methodMap = new Map<
    PropagationMethod,
    { count: number; graduated: number; completed: number }
  >();
  for (const batch of batches) {
    const stats = methodMap.get(batch.method) ?? { count: 0, graduated: 0, completed: 0 };
    stats.count++;
    if (batch.stage === 'graduated') {
      stats.graduated++;
      stats.completed++;
    } else if (batch.stage === 'failed') {
      stats.completed++;
    }
    methodMap.set(batch.method, stats);
  }

  const methodBreakdown = Array.from(methodMap.entries())
    .map(([method, stats]) => ({
      method,
      count: stats.count,
      successRate: stats.completed > 0 ? Math.round((stats.graduated / stats.completed) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Get recent batches (last 5)
  const recentBatches = [...batches]
    .sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())
    .slice(0, 5)
    .map((b) => ({
      id: b.id!,
      batchNumber: b.batchNumber,
      stage: b.stage,
      dateTaken: b.dateTaken,
      quantityStarted: b.quantityStarted,
      quantitySurviving: b.quantitySurviving,
    }));

  return {
    ...baseMetrics,
    totalFailed: failedBatches.length,
    totalActive: activeBatches.length,
    averageBatchSize:
      batches.length > 0
        ? Math.round(batches.reduce((sum, b) => sum + b.quantityStarted, 0) / batches.length)
        : 0,
    recentBatches,
    methodBreakdown,
  };
}

// ============================================
// BULK/COMPARISON METRICS
// ============================================

/**
 * Get summary metrics for multiple mother plants.
 * Useful for comparing productivity across the registry.
 */
export async function getMotherPlantSummaries(
  motherPlantIds: string[]
): Promise<MotherPlantSummary[]> {
  const summaries: MotherPlantSummary[] = [];

  for (const id of motherPlantIds) {
    const batches = await getBatchesByMotherPlant(id);
    const graduated = batches.filter((b) => b.stage === 'graduated').length;
    const failed = batches.filter((b) => b.stage === 'failed').length;
    const completed = graduated + failed;

    const lastBatch = batches
      .sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())[0];

    summaries.push({
      motherPlantId: id,
      totalBatches: batches.length,
      successRate: completed > 0 ? Math.round((graduated / completed) * 100) : 0,
      lastBatchDate: lastBatch ? new Date(lastBatch.dateTaken) : null,
    });
  }

  return summaries;
}

/**
 * Rank mother plants by productivity (success rate with minimum batch threshold).
 */
export async function rankMotherPlantsByProductivity(
  motherPlantIds: string[],
  minBatches: number = 3
): Promise<{ motherPlantId: string; rank: number; successRate: number; batchCount: number }[]> {
  const summaries = await getMotherPlantSummaries(motherPlantIds);

  // Filter to plants with enough batches
  const qualified = summaries.filter((s) => s.totalBatches >= minBatches);

  // Sort by success rate descending, then by batch count descending
  const ranked = qualified
    .sort((a, b) => {
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      return b.totalBatches - a.totalBatches;
    })
    .map((s, index) => ({
      motherPlantId: s.motherPlantId,
      rank: index + 1,
      successRate: s.successRate,
      batchCount: s.totalBatches,
    }));

  return ranked;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert month (0-11) to season name.
 * Assumes Southern Hemisphere (Australia).
 */
function getSeasonFromMonth(month: number): string {
  // Southern hemisphere seasons:
  // Summer: Dec (11), Jan (0), Feb (1)
  // Autumn: Mar (2), Apr (3), May (4)
  // Winter: Jun (5), Jul (6), Aug (7)
  // Spring: Sep (8), Oct (9), Nov (10)
  if (month === 11 || month === 0 || month === 1) return 'summer';
  if (month >= 2 && month <= 4) return 'autumn';
  if (month >= 5 && month <= 7) return 'winter';
  return 'spring';
}

/**
 * Format season name for display.
 */
export function formatSeason(season: string): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

/**
 * Get display text for success rate.
 */
export function formatSuccessRate(rate: number): string {
  if (rate === 0) return 'No data';
  return `${rate}%`;
}

/**
 * Get productivity level label.
 */
export function getProductivityLevel(
  successRate: number,
  batchCount: number
): 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient_data' {
  if (batchCount < 3) return 'insufficient_data';
  if (successRate >= 80) return 'excellent';
  if (successRate >= 60) return 'good';
  if (successRate >= 40) return 'fair';
  return 'poor';
}

/**
 * Get color for productivity level.
 */
export function getProductivityColor(level: ReturnType<typeof getProductivityLevel>): string {
  switch (level) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'fair':
      return 'text-yellow-600';
    case 'poor':
      return 'text-red-600';
    case 'insufficient_data':
      return 'text-gray-400';
  }
}
