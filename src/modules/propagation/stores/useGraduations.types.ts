/**
 * useGraduations - Type definitions and helper functions
 *
 * Extracted from useGraduations.ts for code health.
 * Types, interfaces, defaults, and pure helper functions
 * for graduation tracking.
 */

import type {
  PropGraduation,
  GraduationOutcome,
  GraduationInput,
  PropBatch,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Graduation record with enriched batch/propagule details.
 */
export interface EnrichedGraduation extends PropGraduation {
  // From batch (if batch graduation)
  batchNumber?: string;
  species?: string;
  variety?: string;
  // Date as proper Date object
  graduationDateObj: Date;
  createdAtObj: Date;
}

/**
 * Graduation filters for queries.
 */
export interface GraduationFilters {
  outcome: GraduationOutcome | 'all';
  batchId: string | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Graduation summary by outcome.
 */
export interface GraduationSummary {
  outcome: GraduationOutcome;
  count: number;
  totalQuantity: number;
}

/**
 * Record graduation input with optional batch update flags.
 */
export interface RecordGraduationInput extends GraduationInput {
  graduationDate?: Date;
}

// ============================================
// DEFAULTS
// ============================================

/**
 * Default filter values.
 */
export const DEFAULT_FILTERS: GraduationFilters = {
  outcome: 'all',
  batchId: 'all',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enrich a graduation record with batch details.
 */
export function enrichGraduation(
  graduation: PropGraduation,
  batchesMap: Map<string, PropBatch>
): EnrichedGraduation {
  const batch = graduation.batchId
    ? batchesMap.get(graduation.batchId)
    : undefined;

  return {
    ...graduation,
    batchNumber: batch?.batchNumber,
    species: batch?.species,
    variety: batch?.variety,
    graduationDateObj: new Date(graduation.graduationDate),
    createdAtObj: new Date(graduation.createdAt),
  };
}

/**
 * Group graduations by batch ID.
 */
export function groupGraduationsByBatch(
  graduations: PropGraduation[]
): Map<string, PropGraduation[]> {
  const map = new Map<string, PropGraduation[]>();

  for (const graduation of graduations) {
    if (!graduation.batchId) continue;

    const existing = map.get(graduation.batchId) ?? [];
    existing.push(graduation);
    map.set(graduation.batchId, existing);
  }

  return map;
}
