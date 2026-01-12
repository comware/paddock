/**
 * useStations - Zustand store for propagation station management
 *
 * Manages propagation stations (mist bench, humidity dome, heat mat, etc.)
 * with CRUD operations, occupancy tracking, and environmental targets.
 *
 * Following patterns from useBatches.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropStation,
  PropBatchWithComputed,
  StationType,
  CreateStationInput,
  StationOccupancy,
} from '../types';
import { useBatches } from './useBatches';

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

export interface StationsState {
  // Raw data from DB
  rawStations: PropStation[];
  // Computed stations with occupancy
  stations: StationWithOccupancy[];
  isLoading: boolean;
  error: string | null;
  filters: StationFilters;

  // Actions - CRUD
  loadStations: () => Promise<void>;
  addStation: (input: CreateStationInput) => Promise<string>;
  updateStation: (id: string, updates: UpdateStationInput) => Promise<void>;
  deleteStation: (id: string) => Promise<void>;

  // Actions - Status Management
  activateStation: (id: string) => Promise<void>;
  deactivateStation: (id: string) => Promise<void>;
  toggleStationActive: (id: string) => Promise<void>;

  // Filters
  setFilters: (filters: Partial<StationFilters>) => void;
  resetFilters: () => void;

  // Occupancy Selectors
  getCurrentOccupancy: (stationId: string) => number;
  getAvailableCapacity: (stationId: string) => number;
  isAtCapacity: (stationId: string) => boolean;
  getStationOccupancy: (stationId: string) => StationOccupancy | undefined;
  refreshOccupancy: () => void;

  // Query Selectors
  getFilteredStations: () => StationWithOccupancy[];
  getActiveStations: () => StationWithOccupancy[];
  getStationsByType: (type: StationType) => StationWithOccupancy[];
  getStationsBySite: (siteId: string) => StationWithOccupancy[];
  getStationById: (id: string) => StationWithOccupancy | undefined;
  getStationsWithAvailability: () => StationWithOccupancy[];
  getUniqueTypes: () => StationType[];
  getUniqueSites: () => string[];

  // Environmental Helpers
  getDefaultTargets: (type: StationType) => typeof DEFAULT_ENVIRONMENTAL_TARGETS[StationType];
  validateEnvironmentalTargets: (
    tempMin?: number,
    tempMax?: number,
    humidityMin?: number,
    humidityMax?: number
  ) => EnvironmentalValidation;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: StationFilters = {
  siteId: 'all',
  type: 'all',
  isActive: 'all',
  isIndoor: 'all',
};

/**
 * Calculate occupancy for a station based on active batches.
 */
function calculateOccupancy(
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
function enrichStation(
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
function validateEnvironmentalTargets(
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

// ============================================
// STORE
// ============================================

export const useStations = create<StationsState>((set, get) => ({
  rawStations: [],
  stations: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  // Load stations from database
  loadStations: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawStations = await propDb.stations.toArray();

      // Get active batches from useBatches store for occupancy calculation
      const activeBatches = useBatches.getState().getActiveBatches();
      const stations = rawStations.map((s) => enrichStation(s, activeBatches));

      set({ rawStations, stations, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new station
  addStation: async (input: CreateStationInput) => {
    const now = new Date();

    // Apply default environmental targets if not provided
    const defaults = DEFAULT_ENVIRONMENTAL_TARGETS[input.type] || DEFAULT_ENVIRONMENTAL_TARGETS.other;

    const station: Omit<PropStation, 'id'> = {
      ...input,
      targetTempMin: input.targetTempMin ?? defaults.tempMin,
      targetTempMax: input.targetTempMax ?? defaults.tempMax,
      targetHumidityMin: input.targetHumidityMin ?? defaults.humidityMin,
      targetHumidityMax: input.targetHumidityMax ?? defaults.humidityMax,
      createdAt: now,
      updatedAt: now,
    };

    // Validate environmental targets
    const validation = validateEnvironmentalTargets(
      station.targetTempMin,
      station.targetTempMax,
      station.targetHumidityMin,
      station.targetHumidityMax
    );
    if (!validation.isValid) {
      const error = new Error(`Invalid environmental targets: ${validation.errors.join(', ')}`);
      set({ error: error.message });
      throw error;
    }

    try {
      const id = await propDb.stations.add(station as PropStation);
      const newStation = { ...station, id: String(id) } as PropStation;

      // Get active batches for occupancy
      const activeBatches = useBatches.getState().getActiveBatches();

      set((state) => {
        const newRawStations = [...state.rawStations, newStation];
        return {
          rawStations: newRawStations,
          stations: newRawStations.map((s) => enrichStation(s, activeBatches)),
        };
      });
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update station
  updateStation: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    // Validate environmental targets if being updated
    if (
      updates.targetTempMin !== undefined ||
      updates.targetTempMax !== undefined ||
      updates.targetHumidityMin !== undefined ||
      updates.targetHumidityMax !== undefined
    ) {
      const { rawStations } = get();
      const existing = rawStations.find((s) => s.id === id);
      if (existing) {
        const validation = validateEnvironmentalTargets(
          updates.targetTempMin ?? existing.targetTempMin,
          updates.targetTempMax ?? existing.targetTempMax,
          updates.targetHumidityMin ?? existing.targetHumidityMin,
          updates.targetHumidityMax ?? existing.targetHumidityMax
        );
        if (!validation.isValid) {
          const error = new Error(`Invalid environmental targets: ${validation.errors.join(', ')}`);
          set({ error: error.message });
          throw error;
        }
      }
    }

    try {
      await propDb.stations.update(id, updatedData);

      const activeBatches = useBatches.getState().getActiveBatches();

      set((state) => {
        const newRawStations = state.rawStations.map((s) =>
          s.id === id ? { ...s, ...updatedData } : s
        );
        return {
          rawStations: newRawStations,
          stations: newRawStations.map((s) => enrichStation(s, activeBatches)),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete station (hard delete - use deactivateStation for soft delete)
  deleteStation: async (id) => {
    // Check if station has active batches before deletion
    const activeBatches = useBatches.getState().getActiveBatches();
    const stationBatches = activeBatches.filter((b) => b.stationId === id);

    if (stationBatches.length > 0) {
      const error = new Error(
        `Cannot delete station with ${stationBatches.length} active batch(es). ` +
          'Move or complete batches first, or deactivate the station instead.'
      );
      set({ error: error.message });
      throw error;
    }

    try {
      await propDb.stations.delete(id);

      set((state) => {
        const newRawStations = state.rawStations.filter((s) => s.id !== id);
        return {
          rawStations: newRawStations,
          stations: newRawStations.map((s) => enrichStation(s, activeBatches)),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Activate station (soft undelete)
  activateStation: async (id) => {
    const { updateStation } = get();
    await updateStation(id, { isActive: true });
  },

  // Deactivate station (soft delete)
  deactivateStation: async (id) => {
    const { updateStation } = get();
    await updateStation(id, { isActive: false });
  },

  // Toggle station active status
  toggleStationActive: async (id) => {
    const { rawStations, updateStation } = get();
    const station = rawStations.find((s) => s.id === id);

    if (!station) {
      throw new Error(`Station not found: ${id}`);
    }

    await updateStation(id, { isActive: !station.isActive });
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

  // Get current occupancy for a station (count of propagules)
  getCurrentOccupancy: (stationId) => {
    const { stations } = get();
    const station = stations.find((s) => s.id === stationId);
    return station?.currentOccupancy ?? 0;
  },

  // Get available capacity for a station
  getAvailableCapacity: (stationId) => {
    const { stations } = get();
    const station = stations.find((s) => s.id === stationId);
    return station?.availableCapacity ?? 0;
  },

  // Check if station is at capacity
  isAtCapacity: (stationId) => {
    const { stations } = get();
    const station = stations.find((s) => s.id === stationId);
    return station?.isAtCapacity ?? false;
  },

  // Get detailed occupancy info for a station
  getStationOccupancy: (stationId) => {
    const { rawStations } = get();
    const station = rawStations.find((s) => s.id === stationId);

    if (!station) {
      return undefined;
    }

    const activeBatches = useBatches.getState().getActiveBatches();
    const stationBatches = activeBatches.filter((b) => b.stationId === stationId);
    const currentOccupancy = stationBatches.reduce((sum, b) => sum + b.quantitySurviving, 0);

    return {
      stationId,
      stationName: station.name,
      capacity: station.capacity,
      currentOccupancy,
      occupancyPercentage:
        station.capacity > 0 ? Math.round((currentOccupancy / station.capacity) * 100) : 0,
      batchCount: stationBatches.length,
      batches: stationBatches.map((b) => ({
        id: b.id as string,
        batchNumber: b.batchNumber,
        species: b.species,
        stage: b.stage,
      })),
    };
  },

  // Refresh occupancy calculations (call when batches change)
  refreshOccupancy: () => {
    const { rawStations } = get();
    const activeBatches = useBatches.getState().getActiveBatches();
    const stations = rawStations.map((s) => enrichStation(s, activeBatches));
    set({ stations });
  },

  // Get filtered stations
  getFilteredStations: () => {
    const { stations, filters } = get();

    let filtered = [...stations];

    // Apply site filter
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((s) => s.siteId === filters.siteId);
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((s) => s.type === filters.type);
    }

    // Apply active filter
    if (filters.isActive !== 'all') {
      filtered = filtered.filter((s) => s.isActive === filters.isActive);
    }

    // Apply indoor filter
    if (filters.isIndoor !== 'all') {
      filtered = filtered.filter((s) => s.isIndoor === filters.isIndoor);
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  },

  // Get all active stations
  getActiveStations: () => {
    const { stations } = get();
    return stations.filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Get stations by type
  getStationsByType: (type) => {
    const { stations } = get();
    return stations.filter((s) => s.type === type).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Get stations by site
  getStationsBySite: (siteId) => {
    const { stations } = get();
    return stations.filter((s) => s.siteId === siteId).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Get station by ID
  getStationById: (id) => {
    const { stations } = get();
    return stations.find((s) => s.id === id);
  },

  // Get stations with available capacity
  getStationsWithAvailability: () => {
    const { stations } = get();
    return stations
      .filter((s) => s.isActive && !s.isAtCapacity)
      .sort((a, b) => b.availableCapacity - a.availableCapacity);
  },

  // Get unique station types for filter dropdown
  getUniqueTypes: () => {
    const { stations } = get();
    const types = [...new Set(stations.map((s) => s.type))];
    return types.sort();
  },

  // Get unique sites for filter dropdown
  getUniqueSites: () => {
    const { stations } = get();
    const sites = [...new Set(stations.map((s) => s.siteId))];
    return sites.sort();
  },

  // Get default environmental targets for a station type
  getDefaultTargets: (type) => {
    return DEFAULT_ENVIRONMENTAL_TARGETS[type] || DEFAULT_ENVIRONMENTAL_TARGETS.other;
  },

  // Validate environmental targets
  validateEnvironmentalTargets: (tempMin, tempMax, humidityMin, humidityMax) => {
    return validateEnvironmentalTargets(tempMin, tempMax, humidityMin, humidityMax);
  },
}));
