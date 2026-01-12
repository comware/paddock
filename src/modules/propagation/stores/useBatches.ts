/**
 * useBatches - Zustand store for propagation batch management
 *
 * Manages batch state in memory with Dexie persistence.
 * Provides computed fields for status, survival rate, days in stage, etc.
 *
 * Following patterns from useTrays.ts in the grow module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropBatch,
  PropBatchWithComputed,
  PropagationStage,
  CreateBatchInput,
  FailureReason,
  BatchFilters,
  BatchSort,
} from '../types';
import { VALID_STAGE_TRANSITIONS } from '../types';
import {
  calculateDaysInStage,
  calculateDaysSinceTaken,
  calculateSurvivalRate,
  isOverdue,
  isActiveStage,
  isValidTransition,
} from '../utils/stageHelpers';
import { generateNextBatchNumber } from '../utils/batchNumbering';

// ============================================
// TYPES
// ============================================

/**
 * Batch status derived from stage for UI display.
 */
export type BatchStatus = 'active' | 'graduated' | 'failed';

/**
 * Get batch status from stage.
 */
function getBatchStatus(stage: PropagationStage): BatchStatus {
  if (stage === 'graduated') return 'graduated';
  if (stage === 'failed') return 'failed';
  return 'active';
}

export interface BatchesState {
  // Raw data from DB
  rawBatches: PropBatch[];
  // Computed batches with derived fields
  batches: PropBatchWithComputed[];
  isLoading: boolean;
  error: string | null;
  filters: BatchFilters;
  sort: BatchSort;

  // Actions - CRUD
  loadBatches: () => Promise<void>;
  addBatch: (input: CreateBatchInput) => Promise<string>;
  updateBatch: (id: string, updates: Partial<PropBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;

  // Actions - Stage Management
  advanceStage: (id: string, toStage: PropagationStage, quantityAfter?: number) => Promise<void>;
  markFailed: (id: string, reason: FailureReason, notes?: string) => Promise<void>;

  // Filters & Sort
  setFilters: (filters: Partial<BatchFilters>) => void;
  setSort: (sort: BatchSort) => void;
  resetFilters: () => void;

  // Computed selectors
  getFilteredBatches: () => PropBatchWithComputed[];
  getActiveBatches: () => PropBatchWithComputed[];
  getBatchesByStage: (stage: PropagationStage) => PropBatchWithComputed[];
  getBatchesByStation: (stationId: string) => PropBatchWithComputed[];
  getBatchById: (id: string) => PropBatchWithComputed | undefined;
  getUniqueSpecies: () => string[];
  getUniqueStations: () => string[];
  getNextBatchNumber: () => string;
  getOverdueBatches: () => PropBatchWithComputed[];
  getStageCounts: () => Record<PropagationStage | 'active', number>;
  getSuccessRate: () => number;
  getAverageSurvivalRate: () => number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enrich a batch with computed fields.
 */
function enrichBatch(batch: PropBatch): PropBatchWithComputed {
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
function getStageDateField(
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

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: BatchFilters = {
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
const DEFAULT_SORT: BatchSort = {
  field: 'dateTaken',
  direction: 'desc',
};

// ============================================
// STORE
// ============================================

export const useBatches = create<BatchesState>((set, get) => ({
  rawBatches: [],
  batches: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },

  // Load batches from database
  loadBatches: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawBatches = await propDb.batches.toArray();
      const batches = rawBatches.map(enrichBatch);
      set({ rawBatches, batches, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new batch
  addBatch: async (input: CreateBatchInput) => {
    const { rawBatches } = get();
    const now = new Date();

    // Generate batch number
    const batchNumber = generateNextBatchNumber(rawBatches);

    const batch: Omit<PropBatch, 'id'> = {
      ...input,
      batchNumber,
      stage: 'taken', // Always start in 'taken' stage
      daysInStage: 0,
      quantitySurviving: input.quantityStarted, // Start with all surviving
      isExploded: false,
      photoUrls: input.photoUrls || [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await propDb.batches.add(batch as PropBatch);
      const newBatch = { ...batch, id: String(id) } as PropBatch;
      set((state) => ({
        rawBatches: [...state.rawBatches, newBatch],
        batches: [...state.rawBatches, newBatch].map(enrichBatch),
      }));
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update batch
  updateBatch: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await propDb.batches.update(id, updatedData);
      set((state) => {
        const newRawBatches = state.rawBatches.map((b) =>
          b.id === id ? { ...b, ...updatedData } : b
        );
        return {
          rawBatches: newRawBatches,
          batches: newRawBatches.map(enrichBatch),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete batch
  deleteBatch: async (id) => {
    try {
      await propDb.batches.delete(id);
      set((state) => {
        const newRawBatches = state.rawBatches.filter((b) => b.id !== id);
        return {
          rawBatches: newRawBatches,
          batches: newRawBatches.map(enrichBatch),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Advance stage with validation
  advanceStage: async (id, toStage, quantityAfter) => {
    const { rawBatches, updateBatch } = get();
    const batch = rawBatches.find((b) => b.id === id);

    if (!batch) {
      throw new Error(`Batch not found: ${id}`);
    }

    // Validate transition
    if (!isValidTransition(batch.stage, toStage)) {
      const validTargets = VALID_STAGE_TRANSITIONS[batch.stage];
      throw new Error(
        `Invalid stage transition from '${batch.stage}' to '${toStage}'. ` +
          `Valid targets: ${validTargets.join(', ') || 'none (terminal state)'}`
      );
    }

    // Build updates
    const updates: Partial<PropBatch> = {
      stage: toStage,
    };

    // Set the appropriate date field for the new stage
    const dateField = getStageDateField(toStage);
    if (dateField) {
      (updates as Record<string, unknown>)[dateField] = new Date();
    }

    // Update quantity if provided
    if (quantityAfter !== undefined) {
      if (quantityAfter < 0) {
        throw new Error('Quantity cannot be negative');
      }
      if (quantityAfter > batch.quantityStarted) {
        throw new Error('Quantity cannot exceed quantity started');
      }
      updates.quantitySurviving = quantityAfter;
    }

    await updateBatch(id, updates);
  },

  // Mark batch as failed
  markFailed: async (id, reason, notes) => {
    const { rawBatches, updateBatch } = get();
    const batch = rawBatches.find((b) => b.id === id);

    if (!batch) {
      throw new Error(`Batch not found: ${id}`);
    }

    // Validate transition (can fail from any non-terminal stage)
    if (!isValidTransition(batch.stage, 'failed')) {
      throw new Error(`Cannot mark batch as failed from '${batch.stage}' stage`);
    }

    const updates: Partial<PropBatch> = {
      stage: 'failed',
      quantitySurviving: 0,
    };

    // Note: We store failure reason in preparationNotes for now
    // TODO: Add failureReason field to PropBatch type
    if (notes) {
      updates.preparationNotes = `${batch.preparationNotes || ''}\n\nFailed: ${reason} - ${notes}`.trim();
    } else {
      updates.preparationNotes = `${batch.preparationNotes || ''}\n\nFailed: ${reason}`.trim();
    }

    await updateBatch(id, updates);
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

  // Get filtered and sorted batches
  getFilteredBatches: () => {
    const { batches, filters, sort } = get();

    let filtered = [...batches];

    // Apply stage filter
    if (filters.stage !== 'all') {
      if (filters.stage === 'active') {
        filtered = filtered.filter((b) => isActiveStage(b.stage));
      } else {
        filtered = filtered.filter((b) => b.stage === filters.stage);
      }
    }

    // Apply species filter
    if (filters.species !== 'all') {
      filtered = filtered.filter((b) => b.species === filters.species);
    }

    // Apply method filter
    if (filters.method !== 'all') {
      filtered = filtered.filter((b) => b.method === filters.method);
    }

    // Apply station filter
    if (filters.stationId !== 'all') {
      filtered = filtered.filter((b) => b.stationId === filters.stationId);
    }

    // Apply mother plant filter
    if (filters.motherPlantId !== 'all') {
      filtered = filtered.filter((b) => b.motherPlantId === filters.motherPlantId);
    }

    // Apply site filter
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((b) => b.siteId === filters.siteId);
    }

    // Apply date range filter
    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      filtered = filtered.filter((b) => {
        const dateTaken = new Date(b.dateTaken);
        return dateTaken >= from && dateTaken <= to;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'dateTaken':
          comparison = new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime();
          break;
        case 'batchNumber':
          comparison = a.batchNumber.localeCompare(b.batchNumber);
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
        case 'daysInStage':
          comparison = a.daysInStage - b.daysInStage;
          break;
        case 'quantitySurviving':
          comparison = a.quantitySurviving - b.quantitySurviving;
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  },

  // Get all active (non-terminal) batches
  getActiveBatches: () => {
    const { batches } = get();
    return batches.filter((b) => isActiveStage(b.stage));
  },

  // Get batches by stage
  getBatchesByStage: (stage) => {
    const { batches } = get();
    return batches.filter((b) => b.stage === stage);
  },

  // Get batches by station
  getBatchesByStation: (stationId) => {
    const { batches } = get();
    return batches.filter((b) => b.stationId === stationId);
  },

  // Get batch by ID
  getBatchById: (id) => {
    const { batches } = get();
    return batches.find((b) => b.id === id);
  },

  // Get unique species for filter dropdown
  getUniqueSpecies: () => {
    const { batches } = get();
    const species = [...new Set(batches.map((b) => b.species))];
    return species.sort();
  },

  // Get unique stations for filter dropdown
  getUniqueStations: () => {
    const { batches } = get();
    const stations = [...new Set(batches.map((b) => b.stationId))];
    return stations.sort();
  },

  // Get next batch number
  getNextBatchNumber: () => {
    const { rawBatches } = get();
    return generateNextBatchNumber(rawBatches);
  },

  // Get overdue batches
  getOverdueBatches: () => {
    const { batches } = get();
    return batches.filter((b) => b.isOverdue && isActiveStage(b.stage));
  },

  // Get counts by stage
  getStageCounts: () => {
    const { batches } = get();
    const counts: Record<PropagationStage | 'active', number> = {
      taken: 0,
      rooting: 0,
      rooted: 0,
      potted_up: 0,
      hardening: 0,
      ready: 0,
      graduated: 0,
      failed: 0,
      active: 0,
    };

    for (const batch of batches) {
      counts[batch.stage]++;
      if (isActiveStage(batch.stage)) {
        counts.active++;
      }
    }

    return counts;
  },

  // Calculate success rate (graduated / (graduated + failed))
  getSuccessRate: () => {
    const { batches } = get();
    const graduated = batches.filter((b) => b.stage === 'graduated').length;
    const failed = batches.filter((b) => b.stage === 'failed').length;
    const total = graduated + failed;
    if (total === 0) return 0;
    return Math.round((graduated / total) * 100);
  },

  // Calculate average survival rate across all batches
  getAverageSurvivalRate: () => {
    const { batches } = get();
    if (batches.length === 0) return 0;
    const totalRate = batches.reduce((sum, b) => sum + b.survivalRate, 0);
    return Math.round(totalRate / batches.length);
  },
}));
