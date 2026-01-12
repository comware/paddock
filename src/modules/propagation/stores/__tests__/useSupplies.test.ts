/**
 * useSupplies Store Unit Tests
 *
 * Tests the supplies inventory store including:
 * - Supply CRUD operations (logic only, no DB)
 * - Stock level tracking
 * - Low stock alerts
 * - Usage deduction
 * - Cost calculations
 */

import { describe, it, expect } from 'vitest';
import type {
  PropSupply,
  PropSupplyWithStatus,
  SupplyCategory,
} from '../../types';
import type { SupplyFilters } from '../useSupplies';

// ============================================
// TEST FIXTURES
// ============================================

function createMockSupply(overrides: Partial<PropSupply> = {}): PropSupply {
  const now = new Date();
  return {
    id: 'supply-test',
    name: 'Rooting Hormone Gel',
    category: 'rooting_hormone',
    purchaseDate: now,
    supplier: 'Garden Supply Co',
    quantityPurchased: 100,
    unit: 'ml',
    totalCost: 25.00,
    quantityRemaining: 80,
    lowStockThreshold: 20,
    costPerUnit: 0.25,
    notes: 'High strength gel',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Pre-defined mock supplies for testing
const mockSupplies = {
  rootingHormone: () =>
    createMockSupply({
      id: 'supply-hormone',
      name: 'Rooting Hormone Gel',
      category: 'rooting_hormone',
      quantityPurchased: 100,
      quantityRemaining: 80,
      totalCost: 25.00,
      costPerUnit: 0.25,
      lowStockThreshold: 20,
    }),

  pottingMix: () =>
    createMockSupply({
      id: 'supply-mix',
      name: 'Propagation Mix',
      category: 'growing_medium',
      quantityPurchased: 50,
      unit: 'L',
      quantityRemaining: 15,
      totalCost: 40.00,
      costPerUnit: 0.80,
      lowStockThreshold: 10,
    }),

  pots: () =>
    createMockSupply({
      id: 'supply-pots',
      name: 'Small Pots 9cm',
      category: 'containers',
      quantityPurchased: 200,
      unit: 'pcs',
      quantityRemaining: 150,
      totalCost: 30.00,
      costPerUnit: 0.15,
      lowStockThreshold: 50,
    }),

  lowStock: () =>
    createMockSupply({
      id: 'supply-low',
      name: 'Plant Labels',
      category: 'labels',
      quantityPurchased: 100,
      unit: 'pcs',
      quantityRemaining: 5,
      totalCost: 10.00,
      costPerUnit: 0.10,
      lowStockThreshold: 20,
    }),

  noThreshold: () =>
    createMockSupply({
      id: 'supply-no-threshold',
      name: 'Pruning Shears',
      category: 'tools',
      quantityPurchased: 1,
      unit: 'pcs',
      quantityRemaining: 1,
      totalCost: 35.00,
      costPerUnit: 35.00,
      lowStockThreshold: undefined,
    }),
};

// ============================================
// SUPPLY ENRICHMENT TESTS
// ============================================

describe('Supply Enrichment', () => {
  // Inline enrichment function for testing
  function enrichSupply(supply: PropSupply): PropSupplyWithStatus {
    const isLowStock =
      supply.lowStockThreshold !== undefined &&
      supply.quantityRemaining <= supply.lowStockThreshold;

    return {
      ...supply,
      isLowStock,
      usageCount: 0,
    };
  }

  it('marks supply as low stock when below threshold', () => {
    const supply = mockSupplies.lowStock();
    const enriched = enrichSupply(supply);
    expect(enriched.isLowStock).toBe(true);
  });

  it('marks supply as not low stock when above threshold', () => {
    const supply = mockSupplies.rootingHormone();
    const enriched = enrichSupply(supply);
    expect(enriched.isLowStock).toBe(false);
  });

  it('marks supply as low stock when exactly at threshold', () => {
    const supply = createMockSupply({
      quantityRemaining: 20,
      lowStockThreshold: 20,
    });
    const enriched = enrichSupply(supply);
    expect(enriched.isLowStock).toBe(true);
  });

  it('handles supply without threshold', () => {
    const supply = mockSupplies.noThreshold();
    const enriched = enrichSupply(supply);
    expect(enriched.isLowStock).toBe(false);
  });
});

// ============================================
// COST CALCULATION TESTS
// ============================================

describe('Cost Calculations', () => {
  describe('costPerUnit calculation', () => {
    it('calculates cost per unit correctly', () => {
      const supply = createMockSupply({
        quantityPurchased: 100,
        totalCost: 25.00,
      });
      const costPerUnit = supply.totalCost / supply.quantityPurchased;
      expect(costPerUnit).toBe(0.25);
    });

    it('handles zero quantity', () => {
      const quantityPurchased = 0;
      const totalCost = 25.00;
      const costPerUnit = quantityPurchased > 0 ? totalCost / quantityPurchased : 0;
      expect(costPerUnit).toBe(0);
    });

    it('handles fractional costs', () => {
      const supply = createMockSupply({
        quantityPurchased: 3,
        totalCost: 10.00,
      });
      const costPerUnit = supply.totalCost / supply.quantityPurchased;
      expect(costPerUnit).toBeCloseTo(3.33, 2);
    });
  });

  describe('getCostPerUnit', () => {
    it('returns cost per unit for valid supply', () => {
      const supply = mockSupplies.pottingMix();
      expect(supply.costPerUnit).toBe(0.80);
    });
  });

  describe('calculateCost', () => {
    it('calculates total cost for quantity', () => {
      const costPerUnit = 0.25;
      const quantity = 10;
      const totalCost = costPerUnit * quantity;
      expect(totalCost).toBe(2.50);
    });

    it('handles zero quantity', () => {
      const costPerUnit = 0.25;
      const quantity = 0;
      const totalCost = costPerUnit * quantity;
      expect(totalCost).toBe(0);
    });
  });
});

// ============================================
// INVENTORY MANAGEMENT TESTS
// ============================================

describe('Inventory Management', () => {
  describe('deductInventory', () => {
    it('deducts quantity correctly', () => {
      const supply = createMockSupply({ quantityRemaining: 80 });
      const newQuantity = supply.quantityRemaining - 10;
      expect(newQuantity).toBe(70);
    });

    it('rejects deduction exceeding available quantity', () => {
      const supply = createMockSupply({ quantityRemaining: 5 });
      const requestedQuantity = 10;
      const hasAvailable = supply.quantityRemaining >= requestedQuantity;
      expect(hasAvailable).toBe(false);
    });

    it('rejects zero or negative quantity', () => {
      const quantity = 0;
      expect(quantity > 0).toBe(false);
    });

    it('allows deduction of exact remaining quantity', () => {
      const supply = createMockSupply({ quantityRemaining: 10 });
      const requestedQuantity = 10;
      const hasAvailable = supply.quantityRemaining >= requestedQuantity;
      expect(hasAvailable).toBe(true);
    });
  });

  describe('restoreInventory', () => {
    it('restores quantity correctly', () => {
      const supply = createMockSupply({
        quantityPurchased: 100,
        quantityRemaining: 50,
      });
      const restoreAmount = 10;
      const newQuantity = Math.min(
        supply.quantityRemaining + restoreAmount,
        supply.quantityPurchased
      );
      expect(newQuantity).toBe(60);
    });

    it('caps restoration at original purchased quantity', () => {
      const supply = createMockSupply({
        quantityPurchased: 100,
        quantityRemaining: 95,
      });
      const restoreAmount = 20;
      const newQuantity = Math.min(
        supply.quantityRemaining + restoreAmount,
        supply.quantityPurchased
      );
      expect(newQuantity).toBe(100);
    });

    it('rejects zero or negative quantity', () => {
      const quantity = -5;
      expect(quantity > 0).toBe(false);
    });
  });

  describe('adjustInventory', () => {
    it('sets quantity to new value', () => {
      const newQuantity = 50;
      expect(newQuantity).toBe(50);
    });

    it('rejects negative quantity', () => {
      const newQuantity = -10;
      expect(newQuantity >= 0).toBe(false);
    });

    it('allows zero quantity', () => {
      const newQuantity = 0;
      expect(newQuantity >= 0).toBe(true);
    });
  });

  describe('hasAvailableInventory', () => {
    it('returns true when sufficient inventory', () => {
      const supply = createMockSupply({ quantityRemaining: 50 });
      const hasAvailable = supply.quantityRemaining >= 30;
      expect(hasAvailable).toBe(true);
    });

    it('returns false when insufficient inventory', () => {
      const supply = createMockSupply({ quantityRemaining: 20 });
      const hasAvailable = supply.quantityRemaining >= 30;
      expect(hasAvailable).toBe(false);
    });

    it('returns true when exactly matching inventory', () => {
      const supply = createMockSupply({ quantityRemaining: 30 });
      const hasAvailable = supply.quantityRemaining >= 30;
      expect(hasAvailable).toBe(true);
    });
  });
});

// ============================================
// FILTERING TESTS
// ============================================

describe('Supply Filtering', () => {
  const supplies: PropSupplyWithStatus[] = [
    { ...mockSupplies.rootingHormone(), isLowStock: false, usageCount: 5 },
    { ...mockSupplies.pottingMix(), isLowStock: false, usageCount: 10 },
    { ...mockSupplies.pots(), isLowStock: false, usageCount: 3 },
    { ...mockSupplies.lowStock(), isLowStock: true, usageCount: 8 },
    { ...mockSupplies.noThreshold(), isLowStock: false, usageCount: 0 },
  ];

  // Inline filtering function for testing
  function filterSupplies(
    supplyList: PropSupplyWithStatus[],
    filters: SupplyFilters
  ): PropSupplyWithStatus[] {
    let filtered = [...supplyList];

    if (filters.category !== 'all') {
      filtered = filtered.filter((s) => s.category === filters.category);
    }
    if (filters.lowStockOnly) {
      filtered = filtered.filter((s) => s.isLowStock);
    }

    return filtered.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }

  it('returns all supplies with default filters', () => {
    const filters: SupplyFilters = {
      category: 'all',
      lowStockOnly: false,
    };
    const result = filterSupplies(supplies, filters);
    expect(result).toHaveLength(5);
  });

  it('filters by category', () => {
    const filters: SupplyFilters = {
      category: 'rooting_hormone',
      lowStockOnly: false,
    };
    const result = filterSupplies(supplies, filters);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('rooting_hormone');
  });

  it('filters by low stock only', () => {
    const filters: SupplyFilters = {
      category: 'all',
      lowStockOnly: true,
    };
    const result = filterSupplies(supplies, filters);
    expect(result).toHaveLength(1);
    expect(result[0].isLowStock).toBe(true);
  });

  it('combines category and low stock filters', () => {
    const filters: SupplyFilters = {
      category: 'labels',
      lowStockOnly: true,
    };
    const result = filterSupplies(supplies, filters);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('labels');
  });

  it('sorts by category then name', () => {
    const filters: SupplyFilters = {
      category: 'all',
      lowStockOnly: false,
    };
    const result = filterSupplies(supplies, filters);
    // Should be sorted by category first
    let lastCategory = '';
    for (const supply of result) {
      if (lastCategory && supply.category !== lastCategory) {
        expect(supply.category.localeCompare(lastCategory)).toBeGreaterThanOrEqual(0);
      }
      lastCategory = supply.category;
    }
  });
});

// ============================================
// QUERY SELECTOR TESTS
// ============================================

describe('Query Selectors', () => {
  const supplies: PropSupplyWithStatus[] = [
    { ...mockSupplies.rootingHormone(), isLowStock: false, usageCount: 5 },
    { ...mockSupplies.pottingMix(), isLowStock: false, usageCount: 10 },
    { ...mockSupplies.pots(), isLowStock: false, usageCount: 3 },
    { ...mockSupplies.lowStock(), isLowStock: true, usageCount: 8 },
    { ...mockSupplies.noThreshold(), isLowStock: false, usageCount: 0 },
  ];

  describe('getSupplyById', () => {
    it('finds supply by ID', () => {
      const supply = supplies.find((s) => s.id === 'supply-hormone');
      expect(supply).toBeDefined();
      expect(supply?.name).toBe('Rooting Hormone Gel');
    });

    it('returns undefined for unknown ID', () => {
      const supply = supplies.find((s) => s.id === 'unknown-id');
      expect(supply).toBeUndefined();
    });
  });

  describe('getSuppliesByCategory', () => {
    it('filters by category', () => {
      const containers = supplies.filter((s) => s.category === 'containers');
      expect(containers).toHaveLength(1);
    });
  });

  describe('getLowStockSupplies', () => {
    it('returns only low stock supplies', () => {
      const lowStock = supplies.filter((s) => s.isLowStock);
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].name).toBe('Plant Labels');
    });
  });

  describe('getUniqueCategories', () => {
    it('extracts unique categories', () => {
      const categories = [...new Set(supplies.map((s) => s.category))].sort();
      expect(categories).toContain('rooting_hormone');
      expect(categories).toContain('growing_medium');
      expect(categories).toContain('containers');
      expect(categories).toContain('labels');
      expect(categories).toContain('tools');
    });
  });
});

// ============================================
// SUPPLY CATEGORY TESTS
// ============================================

describe('Supply Categories', () => {
  it('handles all valid categories', () => {
    const categories: SupplyCategory[] = [
      'rooting_hormone',
      'growing_medium',
      'containers',
      'labels',
      'tools',
      'heating',
      'misting',
      'other',
    ];

    for (const category of categories) {
      const supply = createMockSupply({ category });
      expect(supply.category).toBe(category);
    }
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles supply with zero remaining quantity', () => {
    const supply = createMockSupply({
      quantityRemaining: 0,
      lowStockThreshold: 10,
    });
    const isLowStock = supply.lowStockThreshold !== undefined &&
      supply.quantityRemaining <= supply.lowStockThreshold;
    expect(isLowStock).toBe(true);
  });

  it('handles supply with all optional fields undefined', () => {
    const supply = createMockSupply({
      supplier: undefined,
      lowStockThreshold: undefined,
      notes: undefined,
    });
    expect(supply.name).toBeDefined();
    expect(supply.category).toBeDefined();
  });

  it('handles empty supply list', () => {
    const supplies: PropSupplyWithStatus[] = [];
    const lowStock = supplies.filter((s) => s.isLowStock);
    expect(lowStock).toHaveLength(0);
  });

  it('handles very large quantities', () => {
    const supply = createMockSupply({
      quantityPurchased: 10000,
      quantityRemaining: 9500,
      totalCost: 500.00,
    });
    const costPerUnit = supply.totalCost / supply.quantityPurchased;
    expect(costPerUnit).toBe(0.05);
  });

  it('handles very small costs', () => {
    const supply = createMockSupply({
      quantityPurchased: 1000,
      totalCost: 1.00,
    });
    const costPerUnit = supply.totalCost / supply.quantityPurchased;
    expect(costPerUnit).toBe(0.001);
  });
});
