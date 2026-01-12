/**
 * useSupplies - Zustand store for propagation supply/inventory management
 *
 * Manages supply inventory with CRUD operations, low stock tracking,
 * and integration with batch costs for inventory deduction.
 *
 * Following patterns from useStations.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropSupply,
  PropSupplyWithStatus,
  SupplyCategory,
  CreateSupplyInput,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Supply filters for list display.
 */
export interface SupplyFilters {
  category: SupplyCategory | 'all';
  lowStockOnly: boolean;
}

/**
 * Update input for supply modifications.
 */
export type UpdateSupplyInput = Partial<
  Omit<PropSupply, 'id' | 'createdAt' | 'updatedAt' | 'costPerUnit'>
>;

export interface SuppliesState {
  // Raw data from DB
  rawSupplies: PropSupply[];
  // Computed supplies with status
  supplies: PropSupplyWithStatus[];
  isLoading: boolean;
  error: string | null;
  filters: SupplyFilters;

  // Actions - CRUD
  loadSupplies: () => Promise<void>;
  addSupply: (input: CreateSupplyInput) => Promise<string>;
  updateSupply: (id: string, updates: UpdateSupplyInput) => Promise<void>;
  deleteSupply: (id: string) => Promise<void>;

  // Inventory Management
  deductInventory: (id: string, quantity: number) => Promise<void>;
  restoreInventory: (id: string, quantity: number) => Promise<void>;
  adjustInventory: (id: string, newQuantity: number) => Promise<void>;

  // Filters
  setFilters: (filters: Partial<SupplyFilters>) => void;
  resetFilters: () => void;

  // Query Selectors
  getFilteredSupplies: () => PropSupplyWithStatus[];
  getSupplyById: (id: string) => PropSupplyWithStatus | undefined;
  getSuppliesByCategory: (category: SupplyCategory) => PropSupplyWithStatus[];
  getLowStockSupplies: () => PropSupplyWithStatus[];
  getUniqueCategories: () => SupplyCategory[];

  // Cost Helpers
  getCostPerUnit: (id: string) => number;
  calculateCost: (id: string, quantity: number) => number;
  hasAvailableInventory: (id: string, quantity: number) => boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: SupplyFilters = {
  category: 'all',
  lowStockOnly: false,
};

/**
 * Enrich a supply with computed status fields.
 */
function enrichSupply(supply: PropSupply): PropSupplyWithStatus {
  const isLowStock =
    supply.lowStockThreshold !== undefined &&
    supply.quantityRemaining <= supply.lowStockThreshold;

  return {
    ...supply,
    isLowStock,
    usageCount: 0, // Will be populated when batch costs are loaded
  };
}

// ============================================
// STORE
// ============================================

export const useSupplies = create<SuppliesState>((set, get) => ({
  rawSupplies: [],
  supplies: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  // Load supplies from database
  loadSupplies: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawSupplies = await propDb.supplies.toArray();
      const supplies = rawSupplies.map(enrichSupply);
      set({ rawSupplies, supplies, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new supply
  addSupply: async (input: CreateSupplyInput) => {
    const now = new Date();

    // Calculate cost per unit
    const costPerUnit =
      input.quantityPurchased > 0
        ? input.totalCost / input.quantityPurchased
        : 0;

    const supply: Omit<PropSupply, 'id'> = {
      ...input,
      quantityRemaining: input.quantityPurchased, // Start with full inventory
      costPerUnit,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await propDb.supplies.add(supply as PropSupply);
      const newSupply = { ...supply, id: String(id) } as PropSupply;

      set((state) => {
        const newRawSupplies = [...state.rawSupplies, newSupply];
        return {
          rawSupplies: newRawSupplies,
          supplies: newRawSupplies.map(enrichSupply),
        };
      });
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update supply
  updateSupply: async (id, updates) => {
    const { rawSupplies } = get();
    const existing = rawSupplies.find((s) => s.id === id);

    if (!existing) {
      throw new Error(`Supply not found: ${id}`);
    }

    // Recalculate cost per unit if quantity or cost changed
    let costPerUnit = existing.costPerUnit;
    const newQuantityPurchased = updates.quantityPurchased ?? existing.quantityPurchased;
    const newTotalCost = updates.totalCost ?? existing.totalCost;

    if (updates.quantityPurchased !== undefined || updates.totalCost !== undefined) {
      costPerUnit = newQuantityPurchased > 0 ? newTotalCost / newQuantityPurchased : 0;
    }

    const updatedData = {
      ...updates,
      costPerUnit,
      updatedAt: new Date(),
    };

    try {
      await propDb.supplies.update(id, updatedData);

      set((state) => {
        const newRawSupplies = state.rawSupplies.map((s) =>
          s.id === id ? { ...s, ...updatedData } : s
        );
        return {
          rawSupplies: newRawSupplies,
          supplies: newRawSupplies.map(enrichSupply),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete supply
  deleteSupply: async (id) => {
    try {
      await propDb.supplies.delete(id);

      set((state) => {
        const newRawSupplies = state.rawSupplies.filter((s) => s.id !== id);
        return {
          rawSupplies: newRawSupplies,
          supplies: newRawSupplies.map(enrichSupply),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Deduct from inventory (used when adding supply costs to batches)
  deductInventory: async (id, quantity) => {
    const { rawSupplies, updateSupply } = get();
    const supply = rawSupplies.find((s) => s.id === id);

    if (!supply) {
      throw new Error(`Supply not found: ${id}`);
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (supply.quantityRemaining < quantity) {
      throw new Error(
        `Insufficient inventory. Available: ${supply.quantityRemaining} ${supply.unit}, ` +
          `Requested: ${quantity} ${supply.unit}`
      );
    }

    const newQuantity = supply.quantityRemaining - quantity;
    await updateSupply(id, { quantityRemaining: newQuantity });
  },

  // Restore inventory (used when removing supply costs from batches)
  restoreInventory: async (id, quantity) => {
    const { rawSupplies, updateSupply } = get();
    const supply = rawSupplies.find((s) => s.id === id);

    if (!supply) {
      throw new Error(`Supply not found: ${id}`);
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Allow restoring up to original purchased quantity
    const newQuantity = Math.min(
      supply.quantityRemaining + quantity,
      supply.quantityPurchased
    );
    await updateSupply(id, { quantityRemaining: newQuantity });
  },

  // Adjust inventory to a specific value
  adjustInventory: async (id, newQuantity) => {
    const { rawSupplies, updateSupply } = get();
    const supply = rawSupplies.find((s) => s.id === id);

    if (!supply) {
      throw new Error(`Supply not found: ${id}`);
    }

    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    await updateSupply(id, { quantityRemaining: newQuantity });
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

  // Get filtered supplies
  getFilteredSupplies: () => {
    const { supplies, filters } = get();

    let filtered = [...supplies];

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((s) => s.category === filters.category);
    }

    // Apply low stock filter
    if (filters.lowStockOnly) {
      filtered = filtered.filter((s) => s.isLowStock);
    }

    // Sort by name within category
    filtered.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    return filtered;
  },

  // Get supply by ID
  getSupplyById: (id) => {
    const { supplies } = get();
    return supplies.find((s) => s.id === id);
  },

  // Get supplies by category
  getSuppliesByCategory: (category) => {
    const { supplies } = get();
    return supplies
      .filter((s) => s.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  // Get low stock supplies
  getLowStockSupplies: () => {
    const { supplies } = get();
    return supplies.filter((s) => s.isLowStock);
  },

  // Get unique categories for filter dropdown
  getUniqueCategories: () => {
    const { supplies } = get();
    const categories = [...new Set(supplies.map((s) => s.category))];
    return categories.sort();
  },

  // Get cost per unit for a supply
  getCostPerUnit: (id) => {
    const { supplies } = get();
    const supply = supplies.find((s) => s.id === id);
    return supply?.costPerUnit ?? 0;
  },

  // Calculate cost for a quantity of supply
  calculateCost: (id, quantity) => {
    const { getCostPerUnit } = get();
    const costPerUnit = getCostPerUnit(id);
    return costPerUnit * quantity;
  },

  // Check if enough inventory is available
  hasAvailableInventory: (id, quantity) => {
    const { supplies } = get();
    const supply = supplies.find((s) => s.id === id);
    if (!supply) return false;
    return supply.quantityRemaining >= quantity;
  },
}));
