/**
 * useGraduations - Zustand store for graduation outcome tracking
 *
 * Manages graduation records for propagation batches and individual propagules.
 * Tracks outcomes (planted, gifted, sold, composted), recipients, and sale references.
 * Integrates with useBatches to update quantities and status on graduation.
 *
 * Following patterns from useBatches.ts and useBatchCosts.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropGraduation,
  GraduationInput,
  GraduationOutcome,
  PropBatch,
} from '../types';
import { useBatches } from './useBatches';

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
// HELPER FUNCTIONS
// ============================================

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: GraduationFilters = {
  outcome: 'all',
  batchId: 'all',
};

/**
 * Enrich a graduation record with batch details.
 */
function enrichGraduation(
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
function groupGraduationsByBatch(
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

  // Load all graduations from database
  loadGraduations: async () => {
    try {
      set({ isLoading: true, error: null });

      const rawGraduations = await propDb.graduations.toArray();
      const graduationsByBatch = groupGraduationsByBatch(rawGraduations);

      // Get batches for enrichment
      const batches = useBatches.getState().rawBatches;
      const batchesMap = new Map(batches.map((b) => [b.id as string, b]));

      const graduations = rawGraduations.map((g) =>
        enrichGraduation(g, batchesMap)
      );

      set({
        rawGraduations,
        graduations,
        graduationsByBatch,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Record a graduation (generic method)
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
      salePrice: input.salePrice,
      notes: input.notes,
      createdAt: now,
    };

    try {
      const id = await propDb.graduations.add(graduation as PropGraduation);
      const newGraduation = { ...graduation, id: String(id) } as PropGraduation;

      // Update local state
      const batches = useBatches.getState().rawBatches;
      const batchesMap = new Map(batches.map((b) => [b.id as string, b]));

      set((state) => {
        const newRawGraduations = [...state.rawGraduations, newGraduation];
        const newGraduationsByBatch =
          groupGraduationsByBatch(newRawGraduations);
        const graduations = newRawGraduations.map((g) =>
          enrichGraduation(g, batchesMap)
        );

        return {
          rawGraduations: newRawGraduations,
          graduations,
          graduationsByBatch: newGraduationsByBatch,
        };
      });

      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Record batch graduation with automatic quantity/status updates
  recordBatchGraduation: async (batchId, quantity, outcome, options = {}) => {
    // Validate batch exists and has sufficient quantity
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

    // Check batch is in a stage that can graduate
    if (batch.stage !== 'ready' && batch.stage !== 'graduated') {
      throw new Error(
        `Cannot graduate from '${batch.stage}' stage. Batch must be in 'ready' stage.`
      );
    }

    const { recordGraduation } = get();

    // Record the graduation
    const graduationId = await recordGraduation({
      batchId,
      quantity,
      outcome,
      recipientName: options.recipientName,
      plantedLocation: options.plantedLocation,
      salePrice: options.salePrice,
      notes: options.notes,
      graduationDate: options.graduationDate,
    });

    // Update batch quantity and potentially status
    const newQuantitySurviving = batch.quantitySurviving - quantity;
    const isFullyGraduated = newQuantitySurviving === 0;

    if (isFullyGraduated) {
      // Full graduation - mark batch as graduated
      await batchesStore.advanceStage(batchId, 'graduated', 0);
    } else {
      // Partial graduation - just reduce quantity
      await batchesStore.updateBatch(batchId, {
        quantitySurviving: newQuantitySurviving,
      });
    }

    // Reload graduations to refresh enriched data with updated batch
    await get().loadGraduations();

    return graduationId;
  },

  // Record individual propagule graduation
  recordPropaguleGraduation: async (propaguleId, outcome, options = {}) => {
    // For now, individual propagule tracking is simpler
    // Future: validate propagule exists and update its status

    const { recordGraduation } = get();

    const graduationId = await recordGraduation({
      propaguleId,
      quantity: 1,
      outcome,
      recipientName: options.recipientName,
      plantedLocation: options.plantedLocation,
      salePrice: options.salePrice,
      notes: options.notes,
      graduationDate: options.graduationDate,
    });

    return graduationId;
  },

  // Delete a graduation record
  deleteGraduation: async (id: string) => {
    const { rawGraduations } = get();
    const graduation = rawGraduations.find((g) => g.id === id);

    if (!graduation) {
      throw new Error(`Graduation not found: ${id}`);
    }

    try {
      await propDb.graduations.delete(id);

      // Note: We do NOT restore batch quantity on delete
      // This is a deliberate choice - if someone deletes a graduation record,
      // they should manually adjust the batch quantity if needed.
      // This prevents accidental quantity inflation.

      // Update local state
      const batches = useBatches.getState().rawBatches;
      const batchesMap = new Map(batches.map((b) => [b.id as string, b]));

      set((state) => {
        const newRawGraduations = state.rawGraduations.filter(
          (g) => g.id !== id
        );
        const newGraduationsByBatch =
          groupGraduationsByBatch(newRawGraduations);
        const graduations = newRawGraduations.map((g) =>
          enrichGraduation(g, batchesMap)
        );

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

  // Set filters
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  // Reset filters to defaults
  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // Get graduations for a specific batch
  getGraduationsByBatch: (batchId: string) => {
    const { graduations } = get();
    return graduations
      .filter((g) => g.batchId === batchId)
      .sort((a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime());
  },

  // Get graduations by outcome type
  getGraduationsByOutcome: (outcome: GraduationOutcome) => {
    const { graduations } = get();
    return graduations
      .filter((g) => g.outcome === outcome)
      .sort((a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime());
  },

  // Get graduations within a date range
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

  // Get a single graduation by ID
  getGraduationById: (id: string) => {
    const { graduations } = get();
    return graduations.find((g) => g.id === id);
  },

  // Get graduations filtered by current filters
  getFilteredGraduations: () => {
    const { graduations, filters } = get();
    let filtered = [...graduations];

    // Apply outcome filter
    if (filters.outcome !== 'all') {
      filtered = filtered.filter((g) => g.outcome === filters.outcome);
    }

    // Apply batch filter
    if (filters.batchId !== 'all') {
      filtered = filtered.filter((g) => g.batchId === filters.batchId);
    }

    // Apply date range filter
    if (filters.dateRange) {
      const startTime = filters.dateRange.from.getTime();
      const endTime = filters.dateRange.to.getTime();
      filtered = filtered.filter((g) => {
        const gradTime = g.graduationDateObj.getTime();
        return gradTime >= startTime && gradTime <= endTime;
      });
    }

    // Sort by graduation date descending (most recent first)
    return filtered.sort(
      (a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime()
    );
  },

  // Get total count of graduated propagules
  getTotalGraduated: () => {
    const { rawGraduations } = get();
    return rawGraduations.reduce((sum, g) => sum + g.quantity, 0);
  },

  // Get total graduated for a specific batch
  getTotalGraduatedForBatch: (batchId: string) => {
    const { graduationsByBatch } = get();
    const batchGraduations = graduationsByBatch.get(batchId) ?? [];
    return batchGraduations.reduce((sum, g) => sum + g.quantity, 0);
  },

  // Get summary grouped by outcome
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

    // Sort by total quantity descending
    return Array.from(summaryMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );
  },

  // Get unique recipient names for gifts
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

  // Get total revenue from sales
  getTotalSalesRevenue: () => {
    const { rawGraduations } = get();
    return rawGraduations
      .filter((g) => g.outcome === 'sold' && g.salePrice)
      .reduce((sum, g) => sum + (g.salePrice ?? 0), 0);
  },
}));
