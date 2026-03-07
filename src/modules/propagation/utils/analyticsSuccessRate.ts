/**
 * Analytics - Success Rate Calculations
 *
 * Provides success rate calculations by various dimensions
 * (species, method, station, mother plant, season).
 *
 * Extracted from analyticsCalculations.ts for code health.
 */

import type {
  PropBatch,
} from '../types';

// ============================================
// TYPES
// ============================================

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
  const groups = new Map<K, PropBatch[]>();

  for (const batch of batches) {
    const key = getDimension(batch);
    const existing = groups.get(key) ?? [];
    existing.push(batch);
    groups.set(key, existing);
  }

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
