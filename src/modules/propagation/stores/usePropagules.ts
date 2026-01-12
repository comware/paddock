/**
 * usePropagules - Zustand store for individual propagule management
 *
 * Manages individual propagule state when batches are "exploded"
 * for high-value plant tracking. Each propagule gets its own
 * health scores, measurements, photos, and stage transitions.
 *
 * Following patterns from useBatches.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropPropagule,
  PropPropaguleWithComputed,
  PropBatch,
  PropagationStage,
  PropagationMethod,
  FailureReason,
} from '../types';
import { VALID_STAGE_TRANSITIONS } from '../types';
import {
  daysSince,
  isActiveStage,
  isValidTransition,
} from '../utils/stageHelpers';

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
// HELPER FUNCTIONS
// ============================================

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: PropaguleFilters = {
  batchId: 'all',
  stage: 'all',
  species: 'all',
  stationId: 'all',
  siteId: 'all',
};

/**
 * Default sort values.
 */
const DEFAULT_SORT: PropaguleSort = {
  field: 'propaguleNumber',
  direction: 'asc',
};

/**
 * Calculate days in current stage for a propagule.
 * Uses createdAt as the base date since propagules don't have
 * individual stage transition dates stored on the model.
 */
function calculatePropaguleDaysInStage(propagule: PropPropagule): number {
  // For now, use createdAt as approximation
  // TODO: Query stage transitions for accurate dates
  return daysSince(propagule.createdAt);
}

/**
 * Calculate days since the propagule was created (taken from batch).
 */
function calculatePropaguleDaysSinceTaken(propagule: PropPropagule): number {
  return daysSince(propagule.createdAt);
}

/**
 * Enrich a propagule with computed fields.
 */
function enrichPropagule(propagule: PropPropagule): PropPropaguleWithComputed {
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
function generatePropaguleNumber(
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

// ============================================
// STORE
// ============================================

export const usePropagules = create<PropagulesState>((set, get) => ({
  rawPropagules: [],
  propagules: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },

  // Load propagules from database
  loadPropagules: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawPropagules = await propDb.propagules.toArray();
      const propagules = rawPropagules.map(enrichPropagule);
      set({ rawPropagules, propagules, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Create a single propagule
  createPropagule: async (input: CreatePropaguleFromBatchInput) => {
    const { rawPropagules } = get();
    const now = new Date();

    // We need the batch number to generate propagule number
    // For now, fetch the batch to get its number
    const batch = await propDb.batches.get(input.batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${input.batchId}`);
    }

    const propaguleNumber = generatePropaguleNumber(batch.batchNumber, rawPropagules);

    const propagule: Omit<PropPropagule, 'id'> = {
      batchId: input.batchId,
      propaguleNumber,
      siteId: input.siteId,
      stationId: input.stationId,
      species: input.species,
      variety: input.variety,
      motherPlantId: input.motherPlantId,
      method: input.method,
      stage: input.stage,
      label: input.label,
      healthScore: input.healthScore,
      notes: input.notes,
      photoUrls: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await propDb.propagules.add(propagule as PropPropagule);
      const newPropagule = { ...propagule, id: String(id) } as PropPropagule;
      set((state) => ({
        rawPropagules: [...state.rawPropagules, newPropagule],
        propagules: [...state.rawPropagules, newPropagule].map(enrichPropagule),
      }));
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update propagule
  updatePropagule: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await propDb.propagules.update(id, updatedData);
      set((state) => {
        const newRawPropagules = state.rawPropagules.map((p) =>
          p.id === id ? { ...p, ...updatedData } : p
        );
        return {
          rawPropagules: newRawPropagules,
          propagules: newRawPropagules.map(enrichPropagule),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete propagule
  deletePropagule: async (id) => {
    try {
      await propDb.propagules.delete(id);
      set((state) => {
        const newRawPropagules = state.rawPropagules.filter((p) => p.id !== id);
        return {
          rawPropagules: newRawPropagules,
          propagules: newRawPropagules.map(enrichPropagule),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Explode a batch into individual propagules
  explodeBatch: async (batch: PropBatch, count: number) => {
    if (count <= 0) {
      throw new Error('Count must be greater than 0');
    }

    if (count > batch.quantitySurviving) {
      throw new Error(
        `Cannot create ${count} propagules from batch with ${batch.quantitySurviving} surviving`
      );
    }

    if (batch.isExploded) {
      throw new Error('Batch has already been exploded');
    }

    const { createPropagule } = get();
    const createdIds: string[] = [];

    try {
      // Create propagules one at a time to ensure proper numbering
      for (let i = 0; i < count; i++) {
        const id = await createPropagule({
          batchId: batch.id!,
          siteId: batch.siteId,
          stationId: batch.stationId,
          species: batch.species,
          variety: batch.variety,
          motherPlantId: batch.motherPlantId,
          method: batch.method,
          stage: batch.stage,
          healthScore: 3, // Default to middle score (neutral)
        });
        createdIds.push(id);
      }

      // Mark the batch as exploded
      await propDb.batches.update(batch.id!, {
        isExploded: true,
        updatedAt: new Date(),
      });

      return createdIds;
    } catch (error) {
      // Clean up any created propagules on failure
      for (const id of createdIds) {
        try {
          await propDb.propagules.delete(id);
        } catch {
          // Ignore cleanup errors
        }
      }
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Advance stage with validation
  advanceStage: async (id, toStage) => {
    const { rawPropagules, updatePropagule } = get();
    const propagule = rawPropagules.find((p) => p.id === id);

    if (!propagule) {
      throw new Error(`Propagule not found: ${id}`);
    }

    // Validate transition
    if (!isValidTransition(propagule.stage, toStage)) {
      const validTargets = VALID_STAGE_TRANSITIONS[propagule.stage];
      throw new Error(
        `Invalid stage transition from '${propagule.stage}' to '${toStage}'. ` +
          `Valid targets: ${validTargets.join(', ') || 'none (terminal state)'}`
      );
    }

    await updatePropagule(id, { stage: toStage } as UpdatePropaguleInput & { stage: PropagationStage });

    // Also record a stage transition in the audit log
    await propDb.stageTransitions.add({
      propaguleId: id,
      fromStage: propagule.stage,
      toStage,
      transitionDate: new Date(),
      createdAt: new Date(),
    });
  },

  // Mark propagule as failed
  markFailed: async (id, reason, notes) => {
    const { rawPropagules, updatePropagule } = get();
    const propagule = rawPropagules.find((p) => p.id === id);

    if (!propagule) {
      throw new Error(`Propagule not found: ${id}`);
    }

    // Validate transition (can fail from any non-terminal stage)
    if (!isValidTransition(propagule.stage, 'failed')) {
      throw new Error(`Cannot mark propagule as failed from '${propagule.stage}' stage`);
    }

    const failureNote = notes
      ? `Failed: ${reason} - ${notes}`
      : `Failed: ${reason}`;

    const existingNotes = propagule.notes || '';
    const newNotes = existingNotes
      ? `${existingNotes}\n\n${failureNote}`
      : failureNote;

    await updatePropagule(id, {
      notes: newNotes,
      healthScore: 1, // Mark as poor health
    } as UpdatePropaguleInput & { stage: PropagationStage });

    // Update stage separately to handle the type properly
    await propDb.propagules.update(id, {
      stage: 'failed',
      updatedAt: new Date(),
    });

    // Refresh state
    set((state) => {
      const newRawPropagules = state.rawPropagules.map((p) =>
        p.id === id ? { ...p, stage: 'failed' as PropagationStage, notes: newNotes, healthScore: 1 } : p
      );
      return {
        rawPropagules: newRawPropagules,
        propagules: newRawPropagules.map(enrichPropagule),
      };
    });

    // Record stage transition
    await propDb.stageTransitions.add({
      propaguleId: id,
      fromStage: propagule.stage,
      toStage: 'failed',
      transitionDate: new Date(),
      failureReason: reason,
      notes,
      createdAt: new Date(),
    });
  },

  // Update health score (1-5 scale)
  updateHealthScore: async (id, score) => {
    if (score < 1 || score > 5) {
      throw new Error('Health score must be between 1 and 5');
    }

    const { updatePropagule } = get();
    await updatePropagule(id, { healthScore: score });
  },

  // Record measurements
  recordMeasurements: async (id, measurements) => {
    const { updatePropagule } = get();
    await updatePropagule(id, measurements);
  },

  // Set filters
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  // Set sort
  setSort: (sort) => {
    set({ sort });
  },

  // Reset filters to defaults
  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // Get filtered and sorted propagules
  getFilteredPropagules: () => {
    const { propagules, filters, sort } = get();

    let filtered = [...propagules];

    // Apply batch filter
    if (filters.batchId !== 'all') {
      filtered = filtered.filter((p) => p.batchId === filters.batchId);
    }

    // Apply stage filter
    if (filters.stage !== 'all') {
      if (filters.stage === 'active') {
        filtered = filtered.filter((p) => isActiveStage(p.stage));
      } else {
        filtered = filtered.filter((p) => p.stage === filters.stage);
      }
    }

    // Apply species filter
    if (filters.species !== 'all') {
      filtered = filtered.filter((p) => p.species === filters.species);
    }

    // Apply station filter
    if (filters.stationId !== 'all') {
      filtered = filtered.filter((p) => p.stationId === filters.stationId);
    }

    // Apply site filter
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((p) => p.siteId === filters.siteId);
    }

    // Apply health score filter
    if (filters.healthScore !== undefined) {
      filtered = filtered.filter(
        (p) => p.healthScore !== undefined && p.healthScore >= filters.healthScore!
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'propaguleNumber':
          comparison = a.propaguleNumber.localeCompare(b.propaguleNumber);
          break;
        case 'species':
          comparison = a.species.localeCompare(b.species);
          break;
        case 'stage': {
          // Sort by stage order
          const stageOrder: PropagationStage[] = [
            'taken',
            'rooting',
            'rooted',
            'potted_up',
            'hardening',
            'ready',
            'graduated',
            'failed',
          ];
          comparison = stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
          break;
        }
        case 'healthScore':
          comparison = (a.healthScore ?? 0) - (b.healthScore ?? 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  },

  // Get all active (non-terminal) propagules
  getActivePropagules: () => {
    const { propagules } = get();
    return propagules.filter((p) => isActiveStage(p.stage));
  },

  // Get propagules by batch
  getPropagulesByBatch: (batchId) => {
    const { propagules } = get();
    return propagules.filter((p) => p.batchId === batchId);
  },

  // Get propagules by stage
  getPropagulesByStage: (stage) => {
    const { propagules } = get();
    return propagules.filter((p) => p.stage === stage);
  },

  // Get propagule by ID
  getPropaguleById: (id) => {
    const { propagules } = get();
    return propagules.find((p) => p.id === id);
  },

  // Get count of active propagules
  getActivePropaguleCount: () => {
    const { propagules } = get();
    return propagules.filter((p) => isActiveStage(p.stage)).length;
  },

  // Get unique species
  getUniqueSpecies: () => {
    const { propagules } = get();
    const species = [...new Set(propagules.map((p) => p.species))];
    return species.sort();
  },

  // Get health score distribution
  getHealthDistribution: () => {
    const { propagules } = get();
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const propagule of propagules) {
      if (propagule.healthScore !== undefined && isActiveStage(propagule.stage)) {
        distribution[propagule.healthScore]++;
      }
    }

    return distribution;
  },

  // Get next propagule number for a batch
  getNextPropaguleNumber: (batchNumber) => {
    const { rawPropagules } = get();
    return generatePropaguleNumber(batchNumber, rawPropagules);
  },
}));
