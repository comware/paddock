/**
 * useBatches - Zustand store for propagation batch management
 *
 * Manages batch state in memory with Dexie persistence.
 * Provides computed fields for status, survival rate, days in stage, etc.
 *
 * Helpers and types extracted to useBatches.helpers.ts
 */

import { create } from 'zustand';
import { propDb, toKey, toId, withId } from '@/lib/db';
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
import { isActiveStage, isValidTransition } from '../utils/stageHelpers';
import { generateNextBatchNumber } from '../utils/batchNumbering';
import {
  enrichBatch,
  getStageDateField,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
} from './useBatches.helpers';

// Re-export types for consumers
export type { BatchStatus } from './useBatches.helpers';

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
// STORE
// ============================================

export const useBatches = create<BatchesState>((set, get) => ({
  rawBatches: [],
  batches: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },

  loadBatches: async () => {
    try {
      set({ isLoading: true, error: null });
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const rawBatches = (await propDb.batches.toArray()).map(withId);
      const batches = rawBatches.map(enrichBatch);
      set({ rawBatches, batches, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addBatch: async (input: CreateBatchInput) => {
    const { rawBatches } = get();
    const now = new Date();
    const batchNumber = generateNextBatchNumber(rawBatches);

    const batch: Omit<PropBatch, 'id'> = {
      ...input,
      batchNumber,
      stage: 'taken',
      daysInStage: 0,
      quantitySurviving: input.quantityStarted,
      isExploded: false,
      photoUrls: input.photoUrls || [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      // FK write: store motherPlantId numeric when present, matching the primary-key type.
      // Optional field - toKey would throw on undefined, so guard it. See src/lib/db/keys.ts.
      const id = await propDb.batches.add({
        ...batch,
        motherPlantId: batch.motherPlantId ? (toKey(batch.motherPlantId) as unknown as string) : batch.motherPlantId,
      } as PropBatch);
      const newBatch = { ...batch, id: toId(id) } as PropBatch;
      set((state) => ({
        rawBatches: [...state.rawBatches, newBatch],
        batches: [...state.rawBatches, newBatch].map(enrichBatch),
      }));
      return toId(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateBatch: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await propDb.batches.update(toKey(id), updatedData);
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

  deleteBatch: async (id) => {
    try {
      await propDb.batches.delete(toKey(id));
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

  advanceStage: async (id, toStage, quantityAfter) => {
    const { rawBatches, updateBatch } = get();
    const batch = rawBatches.find((b) => b.id === id);

    if (!batch) {
      throw new Error(`Batch not found: ${id}`);
    }

    if (!isValidTransition(batch.stage, toStage)) {
      const validTargets = VALID_STAGE_TRANSITIONS[batch.stage];
      throw new Error(
        `Invalid stage transition from '${batch.stage}' to '${toStage}'. ` +
          `Valid targets: ${validTargets.join(', ') || 'none (terminal state)'}`
      );
    }

    const updates: Partial<PropBatch> = { stage: toStage };
    const dateField = getStageDateField(toStage);
    if (dateField) {
      (updates as Record<string, unknown>)[dateField] = new Date();
    }

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

  markFailed: async (id, reason, notes) => {
    const { rawBatches, updateBatch } = get();
    const batch = rawBatches.find((b) => b.id === id);

    if (!batch) {
      throw new Error(`Batch not found: ${id}`);
    }

    if (!isValidTransition(batch.stage, 'failed')) {
      throw new Error(`Cannot mark batch as failed from '${batch.stage}' stage`);
    }

    const updates: Partial<PropBatch> = {
      stage: 'failed',
      quantitySurviving: 0,
    };

    if (notes) {
      updates.preparationNotes = `${batch.preparationNotes || ''}\n\nFailed: ${reason} - ${notes}`.trim();
    } else {
      updates.preparationNotes = `${batch.preparationNotes || ''}\n\nFailed: ${reason}`.trim();
    }

    await updateBatch(id, updates);
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setSort: (sort) => {
    set({ sort });
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  getFilteredBatches: () => {
    const { batches, filters, sort } = get();
    let filtered = [...batches];

    if (filters.stage !== 'all') {
      if (filters.stage === 'active') {
        filtered = filtered.filter((b) => isActiveStage(b.stage));
      } else {
        filtered = filtered.filter((b) => b.stage === filters.stage);
      }
    }
    if (filters.species !== 'all') {
      filtered = filtered.filter((b) => b.species === filters.species);
    }
    if (filters.method !== 'all') {
      filtered = filtered.filter((b) => b.method === filters.method);
    }
    if (filters.stationId !== 'all') {
      filtered = filtered.filter((b) => b.stationId === filters.stationId);
    }
    if (filters.motherPlantId !== 'all') {
      filtered = filtered.filter((b) => b.motherPlantId === filters.motherPlantId);
    }
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((b) => b.siteId === filters.siteId);
    }
    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      filtered = filtered.filter((b) => {
        const dateTaken = new Date(b.dateTaken);
        return dateTaken >= from && dateTaken <= to;
      });
    }

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
          const stageOrder: PropagationStage[] = [
            'taken', 'rooting', 'rooted', 'potted_up',
            'hardening', 'ready', 'graduated', 'failed',
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

  getActiveBatches: () => {
    const { batches } = get();
    return batches.filter((b) => isActiveStage(b.stage));
  },

  getBatchesByStage: (stage) => {
    const { batches } = get();
    return batches.filter((b) => b.stage === stage);
  },

  getBatchesByStation: (stationId) => {
    const { batches } = get();
    return batches.filter((b) => b.stationId === stationId);
  },

  getBatchById: (id) => {
    const { batches } = get();
    return batches.find((b) => b.id === id);
  },

  getUniqueSpecies: () => {
    const { batches } = get();
    const species = [...new Set(batches.map((b) => b.species))];
    return species.sort();
  },

  getUniqueStations: () => {
    const { batches } = get();
    const stations = [...new Set(batches.map((b) => b.stationId))];
    return stations.sort();
  },

  getNextBatchNumber: () => {
    const { rawBatches } = get();
    return generateNextBatchNumber(rawBatches);
  },

  getOverdueBatches: () => {
    const { batches } = get();
    return batches.filter((b) => b.isOverdue && isActiveStage(b.stage));
  },

  getStageCounts: () => {
    const { batches } = get();
    const counts: Record<PropagationStage | 'active', number> = {
      taken: 0, rooting: 0, rooted: 0, potted_up: 0,
      hardening: 0, ready: 0, graduated: 0, failed: 0, active: 0,
    };

    for (const batch of batches) {
      counts[batch.stage]++;
      if (isActiveStage(batch.stage)) {
        counts.active++;
      }
    }
    return counts;
  },

  getSuccessRate: () => {
    const { batches } = get();
    const graduated = batches.filter((b) => b.stage === 'graduated').length;
    const failed = batches.filter((b) => b.stage === 'failed').length;
    const total = graduated + failed;
    if (total === 0) return 0;
    return Math.round((graduated / total) * 100);
  },

  getAverageSurvivalRate: () => {
    const { batches } = get();
    if (batches.length === 0) return 0;
    const totalRate = batches.reduce((sum, b) => sum + b.survivalRate, 0);
    return Math.round(totalRate / batches.length);
  },
}));
