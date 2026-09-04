/**
 * useBatchCosts - Zustand store for batch cost allocation
 *
 * Manages cost entries for propagation batches, supporting both supply-linked
 * costs (with inventory deduction) and manual cost entries. Provides cost
 * calculations including per-propagule metrics.
 *
 * Following patterns from useBatches.ts and useSupplies.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb, fkMatch, toKey } from '@/lib/db';
import type {
  PropBatchCost,
  PropBatchCostWithSupply,
  PropSupply,
  SupplyCategory,
  BatchCostSummary,
} from '../types';
import { useSupplies } from './useSupplies';
import { useBatches } from './useBatches';
import {
  getTotalBatchCost,
  getCostPerPropaguleStarted,
  getCostPerPropaguleSurviving,
  getBatchCostBreakdown,
  getCostsBySupply as _getCostsBySupplyUtil,
  getTotalSpentOnSupplies,
} from '../utils/costCalculations';

// ============================================
// TYPES
// ============================================

/**
 * Input for adding a supply-linked cost.
 */
export interface AddSupplyCostInput {
  batchId: string;
  supplyId: string;
  quantity: number;
}

/**
 * Input for adding a manual cost.
 */
export interface AddManualCostInput {
  batchId: string;
  description: string;
  amount: number;
}

/**
 * Cost with enriched supply details.
 */
export interface EnrichedBatchCost extends PropBatchCostWithSupply {
  // Timestamp as Date object
  createdAtDate: Date;
}

/**
 * Aggregated supply usage across batches.
 */
export interface SupplyUsageSummary {
  supplyId: string;
  supplyName: string;
  supplyCategory: SupplyCategory;
  supplyUnit: string;
  totalQuantityUsed: number;
  totalCost: number;
  batchCount: number;
}

export interface BatchCostsState {
  // Raw data from DB
  rawCosts: PropBatchCost[];
  // Costs grouped by batch ID for quick lookup
  costsByBatch: Map<string, PropBatchCost[]>;
  // Enriched costs with supply details
  enrichedCosts: EnrichedBatchCost[];
  isLoading: boolean;
  error: string | null;

  // Actions - CRUD
  loadCosts: () => Promise<void>;
  loadCostsForBatch: (batchId: string) => Promise<void>;
  addSupplyCost: (input: AddSupplyCostInput) => Promise<string>;
  addManualCost: (input: AddManualCostInput) => Promise<string>;
  removeCost: (costId: string) => Promise<void>;

  // Batch Cost Selectors
  getCostsForBatch: (batchId: string) => EnrichedBatchCost[];
  getTotalBatchCost: (batchId: string) => number;
  getCostPerPropaguleStarted: (batchId: string) => number;
  getCostPerPropaguleSurviving: (batchId: string) => number;
  getBatchCostBreakdown: (batchId: string) => BatchCostSummary | null;

  // Supply-focused Selectors
  getCostsBySupply: (supplyId: string) => EnrichedBatchCost[];
  getTotalSpentOnSupplies: () => number;
  getSupplyUsageSummaries: () => SupplyUsageSummary[];

  // Analytics
  getTotalCostsAcrossAllBatches: () => number;
  getAverageCostPerBatch: () => number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enrich a cost entry with supply details.
 */
function enrichCost(
  cost: PropBatchCost,
  suppliesMap: Map<string, PropSupply>
): EnrichedBatchCost {
  const supply = cost.supplyId ? suppliesMap.get(cost.supplyId) : undefined;

  return {
    ...cost,
    supplyName: supply?.name,
    supplyCategory: supply?.category,
    supplyUnit: supply?.unit,
    createdAtDate: new Date(cost.createdAt),
  };
}

/**
 * Group costs by batch ID.
 */
function groupCostsByBatch(costs: PropBatchCost[]): Map<string, PropBatchCost[]> {
  const map = new Map<string, PropBatchCost[]>();

  for (const cost of costs) {
    const existing = map.get(cost.batchId) ?? [];
    existing.push(cost);
    map.set(cost.batchId, existing);
  }

  return map;
}

// ============================================
// STORE
// ============================================

export const useBatchCosts = create<BatchCostsState>((set, get) => ({
  rawCosts: [],
  costsByBatch: new Map(),
  enrichedCosts: [],
  isLoading: true,
  error: null,

  // Load all costs from database
  loadCosts: async () => {
    try {
      set({ isLoading: true, error: null });

      const rawCosts = await propDb.batchCosts.toArray();
      const costsByBatch = groupCostsByBatch(rawCosts);

      // Get supplies for enrichment
      const supplies = useSupplies.getState().rawSupplies;
      const suppliesMap = new Map(supplies.map((s) => [s.id as string, s]));

      const enrichedCosts = rawCosts.map((c) => enrichCost(c, suppliesMap));

      set({ rawCosts, costsByBatch, enrichedCosts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Load costs for a specific batch
  loadCostsForBatch: async (batchId: string) => {
    try {
      const batchCosts = await propDb.batchCosts
        .where('batchId')
        .anyOf(fkMatch(batchId))
        .toArray();

      const { rawCosts, costsByBatch: _costsByBatch } = get();

      // Remove old costs for this batch and add new ones
      const otherCosts = rawCosts.filter((c) => c.batchId !== batchId);
      const newRawCosts = [...otherCosts, ...batchCosts];
      const newCostsByBatch = groupCostsByBatch(newRawCosts);

      // Re-enrich all costs
      const supplies = useSupplies.getState().rawSupplies;
      const suppliesMap = new Map(supplies.map((s) => [s.id as string, s]));
      const enrichedCosts = newRawCosts.map((c) => enrichCost(c, suppliesMap));

      set({
        rawCosts: newRawCosts,
        costsByBatch: newCostsByBatch,
        enrichedCosts,
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Add a supply-linked cost (deducts from inventory)
  addSupplyCost: async ({ batchId, supplyId, quantity }: AddSupplyCostInput) => {
    // Validate inputs
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Get supply details and validate availability
    const suppliesStore = useSupplies.getState();
    const supply = suppliesStore.getSupplyById(supplyId);

    if (!supply) {
      throw new Error(`Supply not found: ${supplyId}`);
    }

    if (!suppliesStore.hasAvailableInventory(supplyId, quantity)) {
      throw new Error(
        `Insufficient inventory for ${supply.name}. ` +
          `Available: ${supply.quantityRemaining} ${supply.unit}, ` +
          `Requested: ${quantity} ${supply.unit}`
      );
    }

    // Calculate cost
    const calculatedCost = suppliesStore.calculateCost(supplyId, quantity);

    const cost: Omit<PropBatchCost, 'id'> = {
      batchId,
      supplyId,
      quantityUsed: quantity,
      calculatedCost,
      createdAt: new Date(),
    };

    try {
      // Add cost entry
      // FK write: store batchId numeric, matching the primary-key type. See src/lib/db/keys.ts.
      const id = await propDb.batchCosts.add({ ...cost, batchId: toKey(batchId) } as unknown as PropBatchCost);
      const newCost = { ...cost, id: String(id) } as PropBatchCost;

      // Deduct from inventory
      await suppliesStore.deductInventory(supplyId, quantity);

      // Update local state
      const supplies = useSupplies.getState().rawSupplies;
      const suppliesMap = new Map(supplies.map((s) => [s.id as string, s]));

      set((state) => {
        const newRawCosts = [...state.rawCosts, newCost];
        const newCostsByBatch = groupCostsByBatch(newRawCosts);
        const enrichedCosts = newRawCosts.map((c) => enrichCost(c, suppliesMap));

        return {
          rawCosts: newRawCosts,
          costsByBatch: newCostsByBatch,
          enrichedCosts,
        };
      });

      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Add a manual cost entry
  addManualCost: async ({ batchId, description, amount }: AddManualCostInput) => {
    // Validate inputs
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (!description.trim()) {
      throw new Error('Description is required for manual costs');
    }

    const cost: Omit<PropBatchCost, 'id'> = {
      batchId,
      manualCost: amount,
      manualDescription: description.trim(),
      createdAt: new Date(),
    };

    try {
      // FK write: store batchId numeric, matching the primary-key type. See src/lib/db/keys.ts.
      const id = await propDb.batchCosts.add({ ...cost, batchId: toKey(batchId) } as unknown as PropBatchCost);
      const newCost = { ...cost, id: String(id) } as PropBatchCost;

      // Update local state
      const supplies = useSupplies.getState().rawSupplies;
      const suppliesMap = new Map(supplies.map((s) => [s.id as string, s]));

      set((state) => {
        const newRawCosts = [...state.rawCosts, newCost];
        const newCostsByBatch = groupCostsByBatch(newRawCosts);
        const enrichedCosts = newRawCosts.map((c) => enrichCost(c, suppliesMap));

        return {
          rawCosts: newRawCosts,
          costsByBatch: newCostsByBatch,
          enrichedCosts,
        };
      });

      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Remove a cost entry (restores supply inventory if supply-linked)
  removeCost: async (costId: string) => {
    const { rawCosts } = get();
    const cost = rawCosts.find((c) => c.id === costId);

    if (!cost) {
      throw new Error(`Cost entry not found: ${costId}`);
    }

    try {
      // Restore inventory if supply-linked
      if (cost.supplyId && cost.quantityUsed) {
        const suppliesStore = useSupplies.getState();
        await suppliesStore.restoreInventory(cost.supplyId, cost.quantityUsed);
      }

      // Delete cost entry
      await propDb.batchCosts.delete(costId);

      // Update local state
      const supplies = useSupplies.getState().rawSupplies;
      const suppliesMap = new Map(supplies.map((s) => [s.id as string, s]));

      set((state) => {
        const newRawCosts = state.rawCosts.filter((c) => c.id !== costId);
        const newCostsByBatch = groupCostsByBatch(newRawCosts);
        const enrichedCosts = newRawCosts.map((c) => enrichCost(c, suppliesMap));

        return {
          rawCosts: newRawCosts,
          costsByBatch: newCostsByBatch,
          enrichedCosts,
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Get costs for a specific batch (enriched)
  getCostsForBatch: (batchId: string) => {
    const { enrichedCosts } = get();
    return enrichedCosts
      .filter((c) => c.batchId === batchId)
      .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
  },

  // Get total cost for a batch
  getTotalBatchCost: (batchId: string) => {
    const { costsByBatch } = get();
    const costs = costsByBatch.get(batchId) ?? [];
    return getTotalBatchCost(costs);
  },

  // Get cost per propagule started for a batch
  getCostPerPropaguleStarted: (batchId: string) => {
    const { getTotalBatchCost: getTotal } = get();
    const totalCost = getTotal(batchId);

    const batch = useBatches.getState().getBatchById(batchId);
    if (!batch) return 0;

    return getCostPerPropaguleStarted(totalCost, batch.quantityStarted);
  },

  // Get cost per propagule surviving for a batch
  getCostPerPropaguleSurviving: (batchId: string) => {
    const { getTotalBatchCost: getTotal } = get();
    const totalCost = getTotal(batchId);

    const batch = useBatches.getState().getBatchById(batchId);
    if (!batch) return 0;

    return getCostPerPropaguleSurviving(totalCost, batch.quantitySurviving);
  },

  // Get complete cost breakdown for a batch
  getBatchCostBreakdown: (batchId: string) => {
    const { getCostsForBatch } = get();
    const costs = getCostsForBatch(batchId);

    const batch = useBatches.getState().getBatchById(batchId);
    if (!batch) return null;

    return getBatchCostBreakdown(costs, {
      quantityStarted: batch.quantityStarted,
      quantitySurviving: batch.quantitySurviving,
    });
  },

  // Get all costs for a specific supply (across all batches)
  getCostsBySupply: (supplyId: string) => {
    const { enrichedCosts } = get();
    return enrichedCosts
      .filter((c) => c.supplyId === supplyId)
      .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
  },

  // Get total spent on supply-linked costs
  getTotalSpentOnSupplies: () => {
    const { rawCosts } = get();
    return getTotalSpentOnSupplies(rawCosts);
  },

  // Get aggregated supply usage summaries
  getSupplyUsageSummaries: () => {
    const { enrichedCosts } = get();

    // Group by supply
    const supplyMap = new Map<string, SupplyUsageSummary>();
    const batchesBySupply = new Map<string, Set<string>>();

    for (const cost of enrichedCosts) {
      if (!cost.supplyId || cost.calculatedCost === undefined) continue;

      const existing = supplyMap.get(cost.supplyId);
      const batches = batchesBySupply.get(cost.supplyId) ?? new Set<string>();
      batches.add(cost.batchId);
      batchesBySupply.set(cost.supplyId, batches);

      if (existing) {
        existing.totalQuantityUsed += cost.quantityUsed ?? 0;
        existing.totalCost += cost.calculatedCost;
        existing.batchCount = batches.size;
      } else {
        supplyMap.set(cost.supplyId, {
          supplyId: cost.supplyId,
          supplyName: cost.supplyName ?? 'Unknown',
          supplyCategory: cost.supplyCategory ?? 'other',
          supplyUnit: cost.supplyUnit ?? 'units',
          totalQuantityUsed: cost.quantityUsed ?? 0,
          totalCost: cost.calculatedCost,
          batchCount: 1,
        });
      }
    }

    // Convert to array and sort by total cost descending
    return Array.from(supplyMap.values()).sort((a, b) => b.totalCost - a.totalCost);
  },

  // Get total costs across all batches
  getTotalCostsAcrossAllBatches: () => {
    const { rawCosts } = get();
    return getTotalBatchCost(rawCosts);
  },

  // Get average cost per batch
  getAverageCostPerBatch: () => {
    const { costsByBatch, getTotalCostsAcrossAllBatches } = get();
    const totalCost = getTotalCostsAcrossAllBatches();
    const batchCount = costsByBatch.size;

    if (batchCount === 0) return 0;
    return totalCost / batchCount;
  },
}));
