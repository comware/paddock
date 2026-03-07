/**
 * useStations - Zustand store for propagation station management
 *
 * Manages propagation stations (mist bench, humidity dome, heat mat, etc.)
 * with CRUD operations, occupancy tracking, and environmental targets.
 *
 * Types and helpers extracted to useStations.types.ts
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropStation,
  CreateStationInput,
  StationType,
  StationOccupancy,
} from '../types';
import { useBatches } from './useBatches';
import {
  enrichStation,
  validateEnvironmentalTargets,
  DEFAULT_ENVIRONMENTAL_TARGETS,
  DEFAULT_FILTERS,
} from './useStations.types';
import type {
  StationWithOccupancy,
  StationFilters,
  EnvironmentalValidation,
  UpdateStationInput,
} from './useStations.types';

// Re-export types and constants for consumers
export { DEFAULT_ENVIRONMENTAL_TARGETS } from './useStations.types';
export type {
  StationWithOccupancy,
  StationFilters,
  EnvironmentalValidation,
  UpdateStationInput,
} from './useStations.types';

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
// STORE
// ============================================

export const useStations = create<StationsState>((set, get) => ({
  rawStations: [],
  stations: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  loadStations: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawStations = await propDb.stations.toArray();
      const activeBatches = useBatches.getState().getActiveBatches();
      const stations = rawStations.map((s) => enrichStation(s, activeBatches));
      set({ rawStations, stations, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addStation: async (input: CreateStationInput) => {
    const now = new Date();
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

  updateStation: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

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

  deleteStation: async (id) => {
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

  activateStation: async (id) => {
    const { updateStation } = get();
    await updateStation(id, { isActive: true });
  },

  deactivateStation: async (id) => {
    const { updateStation } = get();
    await updateStation(id, { isActive: false });
  },

  toggleStationActive: async (id) => {
    const { rawStations, updateStation } = get();
    const station = rawStations.find((s) => s.id === id);
    if (!station) {
      throw new Error(`Station not found: ${id}`);
    }
    await updateStation(id, { isActive: !station.isActive });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  getCurrentOccupancy: (stationId) => {
    const { stations } = get();
    const station = stations.find((s) => s.id === stationId);
    return station?.currentOccupancy ?? 0;
  },

  getAvailableCapacity: (stationId) => {
    const { stations } = get();
    const station = stations.find((s) => s.id === stationId);
    return station?.availableCapacity ?? 0;
  },

  isAtCapacity: (stationId) => {
    const { stations } = get();
    const station = stations.find((s) => s.id === stationId);
    return station?.isAtCapacity ?? false;
  },

  getStationOccupancy: (stationId) => {
    const { rawStations } = get();
    const station = rawStations.find((s) => s.id === stationId);
    if (!station) return undefined;

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

  refreshOccupancy: () => {
    const { rawStations } = get();
    const activeBatches = useBatches.getState().getActiveBatches();
    const stations = rawStations.map((s) => enrichStation(s, activeBatches));
    set({ stations });
  },

  getFilteredStations: () => {
    const { stations, filters } = get();
    let filtered = [...stations];

    if (filters.siteId !== 'all') {
      filtered = filtered.filter((s) => s.siteId === filters.siteId);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter((s) => s.type === filters.type);
    }
    if (filters.isActive !== 'all') {
      filtered = filtered.filter((s) => s.isActive === filters.isActive);
    }
    if (filters.isIndoor !== 'all') {
      filtered = filtered.filter((s) => s.isIndoor === filters.isIndoor);
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  },

  getActiveStations: () => {
    const { stations } = get();
    return stations.filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name));
  },

  getStationsByType: (type) => {
    const { stations } = get();
    return stations.filter((s) => s.type === type).sort((a, b) => a.name.localeCompare(b.name));
  },

  getStationsBySite: (siteId) => {
    const { stations } = get();
    return stations.filter((s) => s.siteId === siteId).sort((a, b) => a.name.localeCompare(b.name));
  },

  getStationById: (id) => {
    const { stations } = get();
    return stations.find((s) => s.id === id);
  },

  getStationsWithAvailability: () => {
    const { stations } = get();
    return stations
      .filter((s) => s.isActive && !s.isAtCapacity)
      .sort((a, b) => b.availableCapacity - a.availableCapacity);
  },

  getUniqueTypes: () => {
    const { stations } = get();
    const types = [...new Set(stations.map((s) => s.type))];
    return types.sort();
  },

  getUniqueSites: () => {
    const { stations } = get();
    const sites = [...new Set(stations.map((s) => s.siteId))];
    return sites.sort();
  },

  getDefaultTargets: (type) => {
    return DEFAULT_ENVIRONMENTAL_TARGETS[type] || DEFAULT_ENVIRONMENTAL_TARGETS.other;
  },

  validateEnvironmentalTargets: (tempMin, tempMax, humidityMin, humidityMax) => {
    return validateEnvironmentalTargets(tempMin, tempMax, humidityMin, humidityMax);
  },
}));
