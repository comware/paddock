/**
 * Cost Calculations - Utility functions for batch cost analysis
 *
 * Provides cost calculation helpers for batch totals, per-propagule costs,
 * and cost breakdowns by category.
 *
 * Used by useBatchCosts store and UI components for cost analytics.
 */

import type {
  PropBatchCost,
  PropBatchCostWithSupply,
  PropBatch,
  SupplyCategory,
  BatchCostSummary,
} from '../types';

// ============================================
// BASIC COST CALCULATIONS
// ============================================

/**
 * Get total cost for a batch from its cost entries.
 */
export function getTotalBatchCost(costs: PropBatchCost[]): number {
  return costs.reduce((total, cost) => {
    // Supply-linked cost
    if (cost.calculatedCost !== undefined) {
      return total + cost.calculatedCost;
    }
    // Manual cost
    if (cost.manualCost !== undefined) {
      return total + cost.manualCost;
    }
    return total;
  }, 0);
}

/**
 * Calculate cost per propagule started.
 * Returns 0 if no propagules started (avoids division by zero).
 */
export function getCostPerPropaguleStarted(
  totalCost: number,
  quantityStarted: number
): number {
  if (quantityStarted <= 0) return 0;
  return totalCost / quantityStarted;
}

/**
 * Calculate cost per propagule surviving.
 * Returns 0 if no propagules surviving (avoids division by zero).
 */
export function getCostPerPropaguleSurviving(
  totalCost: number,
  quantitySurviving: number
): number {
  if (quantitySurviving <= 0) return 0;
  return totalCost / quantitySurviving;
}

/**
 * Calculate cost per propagule graduated.
 * Returns 0 if no propagules graduated.
 */
export function getCostPerPropaguleGraduated(
  totalCost: number,
  quantityGraduated: number
): number {
  if (quantityGraduated <= 0) return 0;
  return totalCost / quantityGraduated;
}

// ============================================
// BATCH COST ANALYSIS
// ============================================

/**
 * Get a complete cost breakdown for a batch.
 */
export function getBatchCostBreakdown(
  costs: PropBatchCostWithSupply[],
  batch: Pick<PropBatch, 'quantityStarted' | 'quantitySurviving'>
): BatchCostSummary {
  const totalCost = getTotalBatchCost(costs);

  // Group costs by category
  const categoryTotals = new Map<SupplyCategory | 'manual', number>();

  for (const cost of costs) {
    if (cost.manualCost !== undefined && cost.manualCost > 0) {
      // Manual cost
      const current = categoryTotals.get('manual') ?? 0;
      categoryTotals.set('manual', current + cost.manualCost);
    } else if (cost.calculatedCost !== undefined && cost.supplyCategory) {
      // Supply-linked cost
      const current = categoryTotals.get(cost.supplyCategory) ?? 0;
      categoryTotals.set(cost.supplyCategory, current + cost.calculatedCost);
    }
  }

  // Convert to breakdown array with percentages
  const breakdown: BatchCostSummary['breakdown'] = [];

  for (const [category, amount] of categoryTotals) {
    breakdown.push({
      category,
      amount,
      percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0,
    });
  }

  // Sort by amount descending
  breakdown.sort((a, b) => b.amount - a.amount);

  return {
    totalCost,
    costPerStarted: getCostPerPropaguleStarted(totalCost, batch.quantityStarted),
    costPerSurviving: getCostPerPropaguleSurviving(totalCost, batch.quantitySurviving),
    costPerGraduated: 0, // Calculated separately when graduation data available
    breakdown,
  };
}

// ============================================
// AGGREGATE COST ANALYTICS
// ============================================

/**
 * Calculate total cost across multiple batches.
 */
export function getTotalCostAcrossBatches(
  batchCostsMap: Map<string, PropBatchCost[]>
): number {
  let total = 0;
  for (const costs of batchCostsMap.values()) {
    total += getTotalBatchCost(costs);
  }
  return total;
}

/**
 * Get costs grouped by supply across all batches.
 * Useful for analytics: "How much have we spent on rooting hormone?"
 */
export function getCostsBySupply(
  costs: PropBatchCostWithSupply[]
): Map<string, { supplyName: string; totalCost: number; totalQuantity: number }> {
  const supplyMap = new Map<
    string,
    { supplyName: string; totalCost: number; totalQuantity: number }
  >();

  for (const cost of costs) {
    if (cost.supplyId && cost.calculatedCost !== undefined) {
      const existing = supplyMap.get(cost.supplyId) ?? {
        supplyName: cost.supplyName ?? 'Unknown',
        totalCost: 0,
        totalQuantity: 0,
      };

      existing.totalCost += cost.calculatedCost;
      existing.totalQuantity += cost.quantityUsed ?? 0;
      supplyMap.set(cost.supplyId, existing);
    }
  }

  return supplyMap;
}

/**
 * Get total spent on supply-linked costs (excludes manual costs).
 */
export function getTotalSpentOnSupplies(costs: PropBatchCost[]): number {
  return costs.reduce((total, cost) => {
    if (cost.supplyId && cost.calculatedCost !== undefined) {
      return total + cost.calculatedCost;
    }
    return total;
  }, 0);
}

/**
 * Get total manual costs (excludes supply-linked).
 */
export function getTotalManualCosts(costs: PropBatchCost[]): number {
  return costs.reduce((total, cost) => {
    if (cost.manualCost !== undefined && !cost.supplyId) {
      return total + cost.manualCost;
    }
    return total;
  }, 0);
}

// ============================================
// COST DISPLAY HELPERS
// ============================================

/**
 * Format cost as currency string (AUD).
 */
export function formatCost(amount: number, decimals: number = 2): string {
  return `$${amount.toFixed(decimals)}`;
}

/**
 * Format cost per unit with appropriate precision.
 * Shows more decimals for small values.
 */
export function formatCostPerUnit(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

/**
 * Get category display name.
 */
export function getCategoryDisplayName(category: SupplyCategory | 'manual'): string {
  const displayNames: Record<SupplyCategory | 'manual', string> = {
    rooting_hormone: 'Rooting Hormone',
    growing_medium: 'Growing Medium',
    containers: 'Containers',
    labels: 'Labels',
    tools: 'Tools',
    heating: 'Heating',
    misting: 'Misting',
    other: 'Other Supplies',
    manual: 'Manual Costs',
  };
  return displayNames[category] ?? category;
}

/**
 * Sort order for supply categories (for consistent display).
 */
export const CATEGORY_SORT_ORDER: (SupplyCategory | 'manual')[] = [
  'rooting_hormone',
  'growing_medium',
  'containers',
  'labels',
  'tools',
  'heating',
  'misting',
  'other',
  'manual',
];

/**
 * Sort cost breakdown by category order.
 */
export function sortBreakdownByCategory(
  breakdown: BatchCostSummary['breakdown']
): BatchCostSummary['breakdown'] {
  return [...breakdown].sort((a, b) => {
    const aIndex = CATEGORY_SORT_ORDER.indexOf(a.category);
    const bIndex = CATEGORY_SORT_ORDER.indexOf(b.category);
    return aIndex - bIndex;
  });
}
