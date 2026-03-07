/**
 * Propagation Module - Analytics & Filter Types
 *
 * Types for analytics results, cost summaries,
 * and list filtering/sorting.
 */

import type {
  PropagationStage,
  PropagationMethod,
  SupplyCategory,
} from './enums';
import type { PropBatch } from './models';

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * Success rate analytics result.
 */
export interface SuccessRateAnalytics {
  totalStarted: number;
  totalGraduated: number;
  totalFailed: number;
  totalInProgress: number;
  successRate: number;
  failureRate: number;
  survivalRate: number;
}

/**
 * Cost analytics for a batch.
 */
export interface BatchCostSummary {
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  costPerGraduated: number;
  breakdown: {
    category: SupplyCategory | 'manual';
    amount: number;
    percentage: number;
  }[];
}

/**
 * Mother plant productivity metrics.
 */
export interface MotherPlantMetrics {
  totalBatches: number;
  totalPropagules: number;
  totalGraduated: number;
  successRate: number;
  averageSuccessRate: number;
  bestMethod?: PropagationMethod;
  bestSeason?: string;
}

/**
 * Station occupancy snapshot.
 */
export interface StationOccupancy {
  stationId: string;
  stationName: string;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  batchCount: number;
  batches: Pick<PropBatch, 'id' | 'batchNumber' | 'species' | 'stage'>[];
}

// ============================================
// FILTER & SORT TYPES
// ============================================

/**
 * Batch list filters.
 */
export interface BatchFilters {
  stage: PropagationStage | 'all' | 'active';
  species: string | 'all';
  method: PropagationMethod | 'all';
  stationId: string | 'all';
  motherPlantId: string | 'all';
  siteId: string | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Batch list sorting.
 */
export interface BatchSort {
  field: 'dateTaken' | 'batchNumber' | 'species' | 'stage' | 'daysInStage' | 'quantitySurviving';
  direction: 'asc' | 'desc';
}
