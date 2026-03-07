/**
 * useBatches - Helper functions and types
 *
 * Extracted from useBatches.ts for code health.
 * Contains the enrichBatch function, stage date mapping,
 * and related types/defaults.
 */

import type {
  PropBatch,
  PropBatchWithComputed,
  PropagationStage,
  BatchFilters,
  BatchSort,
} from '../types';
import {
  calculateDaysInStage,
  calculateDaysSinceTaken,
  calculateSurvivalRate,
  isOverdue,
} from '../utils/stageHelpers';

// ============================================
// TYPES
// ============================================

/**
 * Batch status derived from stage for UI display.
 */
export type BatchStatus = 'active' | 'graduated' | 'failed';

// ============================================
// DEFAULTS
// ============================================

/**
 * Default filter values.
 */
export const DEFAULT_FILTERS: BatchFilters = {
  stage: 'all',
  species: 'all',
  method: 'all',
  stationId: 'all',
  motherPlantId: 'all',
  siteId: 'all',
};

/**
 * Default sort values.
 */
export const DEFAULT_SORT: BatchSort = {
  field: 'dateTaken',
  direction: 'desc',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enrich a batch with computed fields.
 */
export function enrichBatch(batch: PropBatch): PropBatchWithComputed {
  const daysInStage = calculateDaysInStage(batch);
  const daysSinceTaken = calculateDaysSinceTaken(batch.dateTaken);
  const survivalRate = calculateSurvivalRate(batch.quantitySurviving, batch.quantityStarted);

  return {
    ...batch,
    daysInStage,
    daysSinceTaken,
    survivalRate,
    totalCost: 0, // Will be computed when batch costs are loaded
    costPerStarted: 0,
    costPerSurviving: 0,
    isOverdue: isOverdue(batch),
    // Denormalized fields will be populated when related data is available
    motherPlantLabel: undefined,
    stationName: undefined,
  };
}

/**
 * Get the date field name for a stage.
 */
export function getStageDateField(
  stage: PropagationStage
): keyof Pick<
  PropBatch,
  'dateRooted' | 'datePottedUp' | 'dateHardeningStarted' | 'dateReady' | 'dateGraduated'
> | null {
  switch (stage) {
    case 'rooted':
      return 'dateRooted';
    case 'potted_up':
      return 'datePottedUp';
    case 'hardening':
      return 'dateHardeningStarted';
    case 'ready':
      return 'dateReady';
    case 'graduated':
      return 'dateGraduated';
    default:
      return null;
  }
}
