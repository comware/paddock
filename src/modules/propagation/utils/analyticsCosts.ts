/**
 * Analytics - Cost Calculations
 *
 * Provides cost analytics: average cost per propagule,
 * cost by supply category, and species cost rankings.
 *
 * Extracted from analyticsCalculations.ts for code health.
 */

import type {
  PropBatch,
  PropBatchCost,
  SupplyCategory,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Cost by category aggregation.
 */
export interface CostByCategory {
  category: SupplyCategory | 'manual';
  totalCost: number;
  percentage: number;
}

/**
 * Species cost ranking.
 */
export interface SpeciesCostRanking {
  species: string;
  totalCost: number;
  batchCount: number;
  avgCostPerBatch: number;
  avgCostPerPropagule: number;
}

// ============================================
// COST ANALYTICS
// ============================================

/**
 * Calculate average cost per propagule across all batches.
 */
export function getAverageCostPerPropagule(
  batches: PropBatch[],
  costs: PropBatchCost[]
): { perStarted: number; perSurviving: number } {
  const costsByBatch = new Map<string, number>();
  for (const cost of costs) {
    const existing = costsByBatch.get(cost.batchId) ?? 0;
    const amount = cost.calculatedCost ?? cost.manualCost ?? 0;
    costsByBatch.set(cost.batchId, existing + amount);
  }

  let totalCost = 0;
  let totalStarted = 0;
  let totalSurviving = 0;

  for (const batch of batches) {
    const batchCost = costsByBatch.get(batch.id!) ?? 0;
    totalCost += batchCost;
    totalStarted += batch.quantityStarted;
    totalSurviving += batch.quantitySurviving;
  }

  return {
    perStarted: totalStarted > 0 ? totalCost / totalStarted : 0,
    perSurviving: totalSurviving > 0 ? totalCost / totalSurviving : 0,
  };
}

/**
 * Get costs grouped by supply category.
 */
export function getCostBySupplyCategory(
  costs: PropBatchCost[],
  supplyCategoryMap: Map<string, SupplyCategory>
): CostByCategory[] {
  const categoryTotals = new Map<SupplyCategory | 'manual', number>();

  for (const cost of costs) {
    if (cost.manualCost !== undefined && cost.manualCost > 0) {
      const existing = categoryTotals.get('manual') ?? 0;
      categoryTotals.set('manual', existing + cost.manualCost);
    } else if (cost.supplyId && cost.calculatedCost !== undefined) {
      const category = supplyCategoryMap.get(cost.supplyId) ?? 'other';
      const existing = categoryTotals.get(category) ?? 0;
      categoryTotals.set(category, existing + cost.calculatedCost);
    }
  }

  let totalCost = 0;
  for (const amount of categoryTotals.values()) {
    totalCost += amount;
  }

  const results: CostByCategory[] = [];
  for (const [category, amount] of categoryTotals) {
    results.push({
      category,
      totalCost: amount,
      percentage: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0,
    });
  }

  return results.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Get cost ranking by species.
 */
export function getMostExpensiveSpecies(
  batches: PropBatch[],
  costs: PropBatchCost[]
): SpeciesCostRanking[] {
  const costsByBatch = new Map<string, number>();
  for (const cost of costs) {
    const existing = costsByBatch.get(cost.batchId) ?? 0;
    const amount = cost.calculatedCost ?? cost.manualCost ?? 0;
    costsByBatch.set(cost.batchId, existing + amount);
  }

  const speciesData = new Map<
    string,
    { totalCost: number; batchCount: number; totalPropagules: number }
  >();

  for (const batch of batches) {
    const batchCost = costsByBatch.get(batch.id!) ?? 0;
    const existing = speciesData.get(batch.species) ?? {
      totalCost: 0,
      batchCount: 0,
      totalPropagules: 0,
    };
    existing.totalCost += batchCost;
    existing.batchCount++;
    existing.totalPropagules += batch.quantityStarted;
    speciesData.set(batch.species, existing);
  }

  const results: SpeciesCostRanking[] = [];
  for (const [species, data] of speciesData) {
    results.push({
      species,
      totalCost: data.totalCost,
      batchCount: data.batchCount,
      avgCostPerBatch: data.batchCount > 0 ? data.totalCost / data.batchCount : 0,
      avgCostPerPropagule:
        data.totalPropagules > 0 ? data.totalCost / data.totalPropagules : 0,
    });
  }

  return results.sort((a, b) => b.totalCost - a.totalCost);
}
