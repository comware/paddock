/**
 * useGraduations - Zustand store for graduation outcome tracking
 *
 * Manages graduation records for propagation batches and individual propagules.
 * Tracks outcomes (planted, gifted, sold, composted), recipients, and sale references.
 * Integrates with useBatches to update quantities and status on graduation.
 *
 * Types and helpers extracted to useGraduations.types.ts
 */

import { create } from 'zustand';
import { propDb, toKey, toId, withId } from '@/lib/db';
import type {
  PropGraduation,
  GraduationOutcome,
} from '../types';
import { useBatches } from './useBatches';
import {
  enrichGraduation,
  groupGraduationsByBatch,
  DEFAULT_FILTERS,
} from './useGraduations.types';
import type {
  EnrichedGraduation,
  GraduationFilters,
  GraduationSummary,
  RecordGraduationInput,
} from './useGraduations.types';

// Re-export types for consumers
export type {
  EnrichedGraduation,
  GraduationFilters,
  GraduationSummary,
  RecordGraduationInput,
} from './useGraduations.types';

export interface GraduationsState {
  // Raw data from DB
  rawGraduations: PropGraduation[];
  // Enriched graduations with batch details
  graduations: EnrichedGraduation[];
  // Grouped by batch for quick lookup
  graduationsByBatch: Map<string, PropGraduation[]>;
  isLoading: boolean;
  error: string | null;
  filters: GraduationFilters;

  // Actions - CRUD
  loadGraduations: () => Promise<void>;
  recordGraduation: (input: RecordGraduationInput) => Promise<string>;
  recordBatchGraduation: (
    batchId: string,
    quantity: number,
    outcome: GraduationOutcome,
    options?: {
      recipientName?: string;
      recipientContact?: string;
      plantedLocation?: string;
      plantingId?: string;
      salePrice?: number;
      saleReferenceId?: string;
      notes?: string;
      graduationDate?: Date;
    }
  ) => Promise<string>;
  recordPropaguleGraduation: (
    propaguleId: string,
    outcome: GraduationOutcome,
    options?: {
      recipientName?: string;
      recipientContact?: string;
      plantedLocation?: string;
      plantingId?: string;
      salePrice?: number;
      saleReferenceId?: string;
      notes?: string;
      graduationDate?: Date;
    }
  ) => Promise<string>;
  deleteGraduation: (id: string) => Promise<void>;

  // Filters
  setFilters: (filters: Partial<GraduationFilters>) => void;
  resetFilters: () => void;

  // Query Selectors
  getGraduationsByBatch: (batchId: string) => EnrichedGraduation[];
  getGraduationsByOutcome: (outcome: GraduationOutcome) => EnrichedGraduation[];
  getGraduationsByDateRange: (start: Date, end: Date) => EnrichedGraduation[];
  getGraduationById: (id: string) => EnrichedGraduation | undefined;
  getFilteredGraduations: () => EnrichedGraduation[];

  // Analytics Selectors
  getTotalGraduated: () => number;
  getTotalGraduatedForBatch: (batchId: string) => number;
  getGraduationSummaryByOutcome: () => GraduationSummary[];
  getGiftRecipients: () => string[];
  getTotalSalesRevenue: () => number;
}

// ============================================
// STORE
// ============================================

export const useGraduations = create<GraduationsState>((set, get) => ({
  rawGraduations: [],
  graduations: [],
  graduationsByBatch: new Map(),
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  loadGraduations: async () => {
    try {
      set({ isLoading: true, error: null });
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const rawGraduations = (await propDb.graduations.toArray()).map(withId);
      const graduationsByBatch = groupGraduationsByBatch(rawGraduations);

      const batches = useBatches.getState().rawBatches;
      const batchesMap = new Map(batches.map((b) => [b.id as string, b]));
      const graduations = rawGraduations.map((g) => enrichGraduation(g, batchesMap));

      set({ rawGraduations, graduations, graduationsByBatch, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  recordGraduation: async (input: RecordGraduationInput) => {
    const now = new Date();
    const graduationDate = input.graduationDate ?? now;

    const graduation: Omit<PropGraduation, 'id'> = {
      batchId: input.batchId,
      propaguleId: input.propaguleId,
      quantity: input.quantity,
      outcome: input.outcome,
      graduationDate,
      recipientName: input.recipientName,
      plantedLocation: input.plantedLocation,
      plantingId: input.plantingId,
      salePrice: input.salePrice,
      notes: input.notes,
      createdAt: now,
    };

    try {
      const id = await propDb.graduations.add(graduation as PropGraduation);
      const newGraduation = { ...graduation, id: toId(id) } as PropGraduation;

      const batches = useBatches.getState().rawBatches;
      const batchesMap = new Map(batches.map((b) => [b.id as string, b]));

      set((state) => {
        const newRawGraduations = [...state.rawGraduations, newGraduation];
        const newGraduationsByBatch = groupGraduationsByBatch(newRawGraduations);
        const graduations = newRawGraduations.map((g) => enrichGraduation(g, batchesMap));

        return {
          rawGraduations: newRawGraduations,
          graduations,
          graduationsByBatch: newGraduationsByBatch,
        };
      });

      return toId(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  recordBatchGraduation: async (batchId, quantity, outcome, options = {}) => {
    const batchesStore = useBatches.getState();
    const batch = batchesStore.getBatchById(batchId);

    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (quantity > batch.quantitySurviving) {
      throw new Error(
        `Insufficient quantity. Available: ${batch.quantitySurviving}, Requested: ${quantity}`
      );
    }
    if (batch.stage !== 'ready' && batch.stage !== 'graduated') {
      throw new Error(
        `Cannot graduate from '${batch.stage}' stage. Batch must be in 'ready' stage.`
      );
    }

    const { recordGraduation } = get();
    const graduationId = await recordGraduation({
      batchId,
      quantity,
      outcome,
      recipientName: options.recipientName,
      plantedLocation: options.plantedLocation,
      plantingId: options.plantingId,
      salePrice: options.salePrice,
      notes: options.notes,
      graduationDate: options.graduationDate,
    });

    const newQuantitySurviving = batch.quantitySurviving - quantity;
    const isFullyGraduated = newQuantitySurviving === 0;

    if (isFullyGraduated) {
      await batchesStore.advanceStage(batchId, 'graduated', 0);
    } else {
      await batchesStore.updateBatch(batchId, {
        quantitySurviving: newQuantitySurviving,
      });
    }

    await get().loadGraduations();
    return graduationId;
  },

  recordPropaguleGraduation: async (propaguleId, outcome, options = {}) => {
    const { recordGraduation } = get();
    const graduationId = await recordGraduation({
      propaguleId,
      quantity: 1,
      outcome,
      recipientName: options.recipientName,
      plantedLocation: options.plantedLocation,
      plantingId: options.plantingId,
      salePrice: options.salePrice,
      notes: options.notes,
      graduationDate: options.graduationDate,
    });
    return graduationId;
  },

  deleteGraduation: async (id: string) => {
    const { rawGraduations } = get();
    const graduation = rawGraduations.find((g) => g.id === id);
    if (!graduation) {
      throw new Error(`Graduation not found: ${id}`);
    }

    try {
      await propDb.graduations.delete(toKey(id));

      const batches = useBatches.getState().rawBatches;
      const batchesMap = new Map(batches.map((b) => [b.id as string, b]));

      set((state) => {
        const newRawGraduations = state.rawGraduations.filter((g) => g.id !== id);
        const newGraduationsByBatch = groupGraduationsByBatch(newRawGraduations);
        const graduations = newRawGraduations.map((g) => enrichGraduation(g, batchesMap));

        return {
          rawGraduations: newRawGraduations,
          graduations,
          graduationsByBatch: newGraduationsByBatch,
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  getGraduationsByBatch: (batchId: string) => {
    const { graduations } = get();
    return graduations
      .filter((g) => g.batchId === batchId)
      .sort((a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime());
  },

  getGraduationsByOutcome: (outcome: GraduationOutcome) => {
    const { graduations } = get();
    return graduations
      .filter((g) => g.outcome === outcome)
      .sort((a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime());
  },

  getGraduationsByDateRange: (start: Date, end: Date) => {
    const { graduations } = get();
    const startTime = start.getTime();
    const endTime = end.getTime();
    return graduations
      .filter((g) => {
        const gradTime = g.graduationDateObj.getTime();
        return gradTime >= startTime && gradTime <= endTime;
      })
      .sort((a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime());
  },

  getGraduationById: (id: string) => {
    const { graduations } = get();
    return graduations.find((g) => g.id === id);
  },

  getFilteredGraduations: () => {
    const { graduations, filters } = get();
    let filtered = [...graduations];

    if (filters.outcome !== 'all') {
      filtered = filtered.filter((g) => g.outcome === filters.outcome);
    }
    if (filters.batchId !== 'all') {
      filtered = filtered.filter((g) => g.batchId === filters.batchId);
    }
    if (filters.dateRange) {
      const startTime = filters.dateRange.from.getTime();
      const endTime = filters.dateRange.to.getTime();
      filtered = filtered.filter((g) => {
        const gradTime = g.graduationDateObj.getTime();
        return gradTime >= startTime && gradTime <= endTime;
      });
    }

    return filtered.sort(
      (a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime()
    );
  },

  getTotalGraduated: () => {
    const { rawGraduations } = get();
    return rawGraduations.reduce((sum, g) => sum + g.quantity, 0);
  },

  getTotalGraduatedForBatch: (batchId: string) => {
    const { graduationsByBatch } = get();
    const batchGraduations = graduationsByBatch.get(batchId) ?? [];
    return batchGraduations.reduce((sum, g) => sum + g.quantity, 0);
  },

  getGraduationSummaryByOutcome: () => {
    const { rawGraduations } = get();
    const summaryMap = new Map<GraduationOutcome, GraduationSummary>();

    for (const graduation of rawGraduations) {
      const existing = summaryMap.get(graduation.outcome);
      if (existing) {
        existing.count++;
        existing.totalQuantity += graduation.quantity;
      } else {
        summaryMap.set(graduation.outcome, {
          outcome: graduation.outcome,
          count: 1,
          totalQuantity: graduation.quantity,
        });
      }
    }

    return Array.from(summaryMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );
  },

  getGiftRecipients: () => {
    const { rawGraduations } = get();
    const recipients = new Set<string>();
    for (const graduation of rawGraduations) {
      if (graduation.outcome === 'gifted' && graduation.recipientName) {
        recipients.add(graduation.recipientName);
      }
    }
    return Array.from(recipients).sort();
  },

  getTotalSalesRevenue: () => {
    const { rawGraduations } = get();
    return rawGraduations
      .filter((g) => g.outcome === 'sold' && g.salePrice)
      .reduce((sum, g) => sum + (g.salePrice ?? 0), 0);
  },
}));
