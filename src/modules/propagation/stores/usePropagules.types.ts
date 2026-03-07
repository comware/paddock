/**
 * usePropagules - Type definitions and helper functions
 *
 * Extracted from usePropagules.ts for code health.
 * Types, interfaces, defaults, and pure helper functions
 * for propagule management.
 */

import type {
  PropPropagule,
  PropPropaguleWithComputed,
  PropBatch,
  PropagationMethod,
  PropagationStage,
  FailureReason,
} from '../types';
import { daysSince } from '../utils/stageHelpers';

// ============================================
// TYPES
// ============================================

/**
 * Input for creating a propagule from a batch explosion.
 */
export interface CreatePropaguleFromBatchInput {
  batchId: string;
  siteId: string;
  stationId: string;
  species: string;
  variety?: string;
  motherPlantId?: string;
  method: PropagationMethod;
  stage: PropagationStage;
  label?: string;
  notes?: string;
  healthScore?: number;
}

/**
 * Input for updating a propagule.
 */
export interface UpdatePropaguleInput {
  label?: string;
  stationId?: string;
  healthScore?: number;
  heightCm?: number;
  stemDiameterMm?: number;
  leafCount?: number;
  rootScore?: number;
  notes?: string;
  photoUrls?: string[];
  scionSource?: string;
  rootstockType?: string;
}

/**
 * Filters for propagule queries.
 */
export interface PropaguleFilters {
  batchId: string | 'all';
  stage: PropagationStage | 'all' | 'active';
  species: string | 'all';
  stationId: string | 'all';
  siteId: string | 'all';
  healthScore?: number; // Filter by minimum health score
}

/**
 * Sort options for propagules.
 */
export interface PropaguleSort {
  field: 'propaguleNumber' | 'species' | 'stage' | 'healthScore' | 'createdAt';
  direction: 'asc' | 'desc';
}

/**
 * Measurement recording input.
 */
export interface MeasurementInput {
  heightCm?: number;
  stemDiameterMm?: number;
  leafCount?: number;
  rootScore?: number;
}

// ============================================
// STATE INTERFACE
// ============================================

export interface PropagulesState {
  // Raw data from DB
  rawPropagules: PropPropagule[];
  // Computed propagules with derived fields
  propagules: PropPropaguleWithComputed[];
  isLoading: boolean;
  error: string | null;
  filters: PropaguleFilters;
  sort: PropaguleSort;

  // Actions - CRUD
  loadPropagules: () => Promise<void>;
  createPropagule: (input: CreatePropaguleFromBatchInput) => Promise<string>;
  updatePropagule: (id: string, updates: UpdatePropaguleInput) => Promise<void>;
  deletePropagule: (id: string) => Promise<void>;

  // Actions - Batch Explosion
  explodeBatch: (batch: PropBatch, count: number) => Promise<string[]>;

  // Actions - Stage Management
  advanceStage: (id: string, toStage: PropagationStage) => Promise<void>;
  markFailed: (id: string, reason: FailureReason, notes?: string) => Promise<void>;

  // Actions - Health & Measurements
  updateHealthScore: (id: string, score: number) => Promise<void>;
  recordMeasurements: (id: string, measurements: MeasurementInput) => Promise<void>;

  // Filters & Sort
  setFilters: (filters: Partial<PropaguleFilters>) => void;
  setSort: (sort: PropaguleSort) => void;
  resetFilters: () => void;

  // Computed selectors
  getFilteredPropagules: () => PropPropaguleWithComputed[];
  getActivePropagules: () => PropPropaguleWithComputed[];
  getPropagulesByBatch: (batchId: string) => PropPropaguleWithComputed[];
  getPropagulesByStage: (stage: PropagationStage) => PropPropaguleWithComputed[];
  getPropaguleById: (id: string) => PropPropaguleWithComputed | undefined;
  getActivePropaguleCount: () => number;
  getUniqueSpecies: () => string[];
  getHealthDistribution: () => Record<number, number>;
  getNextPropaguleNumber: (batchNumber: string) => string;
}

// ============================================
// DEFAULTS
// ============================================

/**
 * Default filter values.
 */
export const DEFAULT_FILTERS: PropaguleFilters = {
  batchId: 'all',
  stage: 'all',
  species: 'all',
  stationId: 'all',
  siteId: 'all',
};

/**
 * Default sort values.
 */
export const DEFAULT_SORT: PropaguleSort = {
  field: 'propaguleNumber',
  direction: 'asc',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate days in current stage for a propagule.
 * Uses createdAt as the base date since propagules don't have
 * individual stage transition dates stored on the model.
 */
export function calculatePropaguleDaysInStage(propagule: PropPropagule): number {
  // For now, use createdAt as approximation
  // TODO: Query stage transitions for accurate dates
  return daysSince(propagule.createdAt);
}

/**
 * Calculate days since the propagule was created (taken from batch).
 */
export function calculatePropaguleDaysSinceTaken(propagule: PropPropagule): number {
  return daysSince(propagule.createdAt);
}

/**
 * Enrich a propagule with computed fields.
 */
export function enrichPropagule(propagule: PropPropagule): PropPropaguleWithComputed {
  return {
    ...propagule,
    daysInStage: calculatePropaguleDaysInStage(propagule),
    daysSinceTaken: calculatePropaguleDaysSinceTaken(propagule),
    // These will be populated when batch data is available
    batchNumber: undefined,
    stationName: undefined,
  };
}

/**
 * Generate propagule number from batch number.
 * Format: {batchNumber}-{NN} (e.g., 2026-042-01)
 *
 * @param batchNumber - Parent batch number (e.g., "2026-042")
 * @param existingPropagules - Existing propagules from this batch
 * @returns Next propagule number (e.g., "2026-042-01")
 */
export function generatePropaguleNumber(
  batchNumber: string,
  existingPropagules: Pick<PropPropagule, 'propaguleNumber'>[]
): string {
  // Filter propagules belonging to this batch
  const batchPropagules = existingPropagules.filter((p) =>
    p.propaguleNumber.startsWith(`${batchNumber}-`)
  );

  if (batchPropagules.length === 0) {
    return `${batchNumber}-01`;
  }

  // Find the highest sequence number
  let maxSequence = 0;
  for (const propagule of batchPropagules) {
    const match = propagule.propaguleNumber.match(/-(\d{2})$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  // Return next sequence, padded to 2 digits
  const nextSequence = (maxSequence + 1).toString().padStart(2, '0');
  return `${batchNumber}-${nextSequence}`;
}
