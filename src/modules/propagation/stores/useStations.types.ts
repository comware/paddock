/**
 * useStations - Type definitions and helper functions
 *
 * Extracted from useStations.ts for code health.
 * Types, interfaces, defaults, environmental targets,
 * and pure helper functions for station management.
 */

import type {
  PropStation,
  PropBatchWithComputed,
  StationType,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Station with computed occupancy fields.
 */
export interface StationWithOccupancy extends PropStation {
  currentOccupancy: number;
  availableCapacity: number;
  occupancyPercentage: number;
  isAtCapacity: boolean;
  batchCount: number;
}

/**
 * Station filters for list display.
 */
export interface StationFilters {
  siteId: string | 'all';
  type: StationType | 'all';
  isActive: boolean | 'all';
  isIndoor: boolean | 'all';
}

/**
 * Default environmental targets by station type.
 * Based on typical propagation requirements.
 */
export const DEFAULT_ENVIRONMENTAL_TARGETS: Record<
  StationType,
  {
    tempMin: number;
    tempMax: number;
    humidityMin: number;
    humidityMax: number;
  }
> = {
  heated_propagator: { tempMin: 20, tempMax: 25, humidityMin: 80, humidityMax: 95 },
  unheated_propagator: { tempMin: 15, tempMax: 22, humidityMin: 70, humidityMax: 90 },
  water_propagation: { tempMin: 18, tempMax: 24, humidityMin: 50, humidityMax: 80 },
  outdoor_bed: { tempMin: 10, tempMax: 30, humidityMin: 40, humidityMax: 80 },
  cold_frame: { tempMin: 5, tempMax: 25, humidityMin: 50, humidityMax: 85 },
  greenhouse_bench: { tempMin: 15, tempMax: 28, humidityMin: 60, humidityMax: 85 },
  mist_system: { tempMin: 18, tempMax: 25, humidityMin: 85, humidityMax: 100 },
  other: { tempMin: 15, tempMax: 25, humidityMin: 50, humidityMax: 80 },
};

/**
 * Environmental validation result.
 */
export interface EnvironmentalValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Update input for station modifications.
 */
export type UpdateStationInput = Partial<Omit<PropStation, 'id' | 'createdAt' | 'updatedAt'>>;

// ============================================
// DEFAULTS
// ============================================

/**
 * Default filter values.
 */
export const DEFAULT_FILTERS: StationFilters = {
  siteId: 'all',
  type: 'all',
  isActive: 'all',
  isIndoor: 'all',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate occupancy for a station based on active batches.
 */
export function calculateOccupancy(
  station: PropStation,
  activeBatches: PropBatchWithComputed[]
): {
  currentOccupancy: number;
  availableCapacity: number;
  occupancyPercentage: number;
  isAtCapacity: boolean;
  batchCount: number;
} {
  // Count active batches at this station
  // Each batch counts as occupying quantitySurviving slots
  const stationBatches = activeBatches.filter((b) => b.stationId === station.id);
  const currentOccupancy = stationBatches.reduce((sum, b) => sum + b.quantitySurviving, 0);
  const batchCount = stationBatches.length;

  const availableCapacity = Math.max(0, station.capacity - currentOccupancy);
  const occupancyPercentage =
    station.capacity > 0 ? Math.round((currentOccupancy / station.capacity) * 100) : 0;
  const isAtCapacity = currentOccupancy >= station.capacity;

  return {
    currentOccupancy,
    availableCapacity,
    occupancyPercentage,
    isAtCapacity,
    batchCount,
  };
}

/**
 * Enrich a station with computed occupancy fields.
 */
export function enrichStation(
  station: PropStation,
  activeBatches: PropBatchWithComputed[]
): StationWithOccupancy {
  const occupancy = calculateOccupancy(station, activeBatches);
  return {
    ...station,
    ...occupancy,
  };
}

/**
 * Validate environmental targets.
 */
export function validateEnvironmentalTargets(
  tempMin?: number,
  tempMax?: number,
  humidityMin?: number,
  humidityMax?: number
): EnvironmentalValidation {
  const errors: string[] = [];

  // Temperature validation
  if (tempMin !== undefined) {
    if (tempMin < -40 || tempMin > 60) {
      errors.push('Minimum temperature must be between -40 and 60 degrees Celsius');
    }
  }
  if (tempMax !== undefined) {
    if (tempMax < -40 || tempMax > 60) {
      errors.push('Maximum temperature must be between -40 and 60 degrees Celsius');
    }
  }
  if (tempMin !== undefined && tempMax !== undefined && tempMin > tempMax) {
    errors.push('Minimum temperature cannot exceed maximum temperature');
  }

  // Humidity validation
  if (humidityMin !== undefined) {
    if (humidityMin < 0 || humidityMin > 100) {
      errors.push('Minimum humidity must be between 0 and 100 percent');
    }
  }
  if (humidityMax !== undefined) {
    if (humidityMax < 0 || humidityMax > 100) {
      errors.push('Maximum humidity must be between 0 and 100 percent');
    }
  }
  if (humidityMin !== undefined && humidityMax !== undefined && humidityMin > humidityMax) {
    errors.push('Minimum humidity cannot exceed maximum humidity');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
