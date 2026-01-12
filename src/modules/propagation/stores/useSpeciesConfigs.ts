/**
 * useSpeciesConfigs - Zustand store for species-specific propagation defaults
 *
 * Manages species configurations that provide default values for batch creation
 * and define overdue warning thresholds per species.
 *
 * Following patterns from useSupplies.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type { PropSpeciesConfig, PropagationMethod } from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Form data for creating a new species config.
 */
export type CreateSpeciesConfigInput = Omit<
  PropSpeciesConfig,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Update input for species config modifications.
 */
export type UpdateSpeciesConfigInput = Partial<
  Omit<PropSpeciesConfig, 'id' | 'createdAt' | 'updatedAt'>
>;

/**
 * Species config with additional computed fields.
 */
export interface PropSpeciesConfigWithDefaults extends PropSpeciesConfig {
  /** Formatted best months for display */
  bestMonthsDisplay: string;
  /** Whether this is propagation season */
  isOptimalSeason: boolean;
}

export interface SpeciesConfigsState {
  // Raw data from DB
  rawConfigs: PropSpeciesConfig[];
  // Computed configs with defaults
  configs: PropSpeciesConfigWithDefaults[];
  isLoading: boolean;
  error: string | null;

  // Actions - CRUD
  loadConfigs: () => Promise<void>;
  addConfig: (input: CreateSpeciesConfigInput) => Promise<string>;
  updateConfig: (id: string, updates: UpdateSpeciesConfigInput) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;

  // Query Selectors
  getConfigBySpecies: (species: string) => PropSpeciesConfigWithDefaults | undefined;
  getConfigById: (id: string) => PropSpeciesConfigWithDefaults | undefined;
  getAllSpeciesNames: () => string[];
  getInSeasonSpecies: () => PropSpeciesConfigWithDefaults[];

  // Helpers for batch creation
  getDefaultsForSpecies: (species: string) => {
    preferredMethod?: PropagationMethod;
    typicalRootingDays?: number;
    typicalDaysToReady?: number;
  } | null;
  getOverdueThresholdsForSpecies: (species: string) => {
    maxDaysRooting?: number;
    maxDaysPottedUp?: number;
    maxDaysHardening?: number;
  } | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Month names for display.
 */
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format best propagation months for display.
 */
function formatBestMonths(months?: number[]): string {
  if (!months || months.length === 0) return 'Any time';
  if (months.length === 12) return 'Year-round';

  // Group consecutive months
  const sorted = [...months].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(MONTH_NAMES[rangeStart - 1]);
      } else if (rangeEnd - rangeStart === 1) {
        ranges.push(`${MONTH_NAMES[rangeStart - 1]}, ${MONTH_NAMES[rangeEnd - 1]}`);
      } else {
        ranges.push(`${MONTH_NAMES[rangeStart - 1]}-${MONTH_NAMES[rangeEnd - 1]}`);
      }
      if (i < sorted.length) {
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
  }

  return ranges.join(', ');
}

/**
 * Check if current month is in the best propagation months.
 */
function isInSeason(months?: number[]): boolean {
  if (!months || months.length === 0) return true; // No preference = always ok
  const currentMonth = new Date().getMonth() + 1; // 1-12
  return months.includes(currentMonth);
}

/**
 * Enrich a config with computed fields.
 */
function enrichConfig(config: PropSpeciesConfig): PropSpeciesConfigWithDefaults {
  return {
    ...config,
    bestMonthsDisplay: formatBestMonths(config.bestPropagationMonths),
    isOptimalSeason: isInSeason(config.bestPropagationMonths),
  };
}

// ============================================
// STORE
// ============================================

export const useSpeciesConfigs = create<SpeciesConfigsState>((set, get) => ({
  rawConfigs: [],
  configs: [],
  isLoading: true,
  error: null,

  // Load configs from database
  loadConfigs: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawConfigs = await propDb.speciesConfigs.toArray();
      const configs = rawConfigs.map(enrichConfig);
      set({ rawConfigs, configs, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new config
  addConfig: async (input: CreateSpeciesConfigInput) => {
    const { rawConfigs } = get();
    const now = new Date();

    // Check for duplicate species
    const existing = rawConfigs.find(
      (c) => c.species.toLowerCase() === input.species.toLowerCase()
    );
    if (existing) {
      throw new Error(`Configuration for "${input.species}" already exists`);
    }

    const config: Omit<PropSpeciesConfig, 'id'> = {
      ...input,
      species: input.species.trim(),
      scientificName: input.scientificName?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await propDb.speciesConfigs.add(config as PropSpeciesConfig);
      const newConfig = { ...config, id: String(id) } as PropSpeciesConfig;

      set((state) => {
        const newRawConfigs = [...state.rawConfigs, newConfig];
        return {
          rawConfigs: newRawConfigs,
          configs: newRawConfigs.map(enrichConfig),
        };
      });
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update config
  updateConfig: async (id, updates) => {
    const { rawConfigs } = get();
    const existing = rawConfigs.find((c) => c.id === id);

    if (!existing) {
      throw new Error(`Species configuration not found: ${id}`);
    }

    // Check for duplicate species if name is being changed
    if (updates.species && updates.species.toLowerCase() !== existing.species.toLowerCase()) {
      const duplicate = rawConfigs.find(
        (c) => c.id !== id && c.species.toLowerCase() === updates.species!.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Configuration for "${updates.species}" already exists`);
      }
    }

    const updatedData = {
      ...updates,
      species: updates.species?.trim() || existing.species,
      scientificName: updates.scientificName?.trim() || updates.scientificName,
      notes: updates.notes?.trim() || updates.notes,
      updatedAt: new Date(),
    };

    try {
      await propDb.speciesConfigs.update(id, updatedData);

      set((state) => {
        const newRawConfigs = state.rawConfigs.map((c) =>
          c.id === id ? { ...c, ...updatedData } : c
        );
        return {
          rawConfigs: newRawConfigs,
          configs: newRawConfigs.map(enrichConfig),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete config
  deleteConfig: async (id) => {
    try {
      await propDb.speciesConfigs.delete(id);

      set((state) => {
        const newRawConfigs = state.rawConfigs.filter((c) => c.id !== id);
        return {
          rawConfigs: newRawConfigs,
          configs: newRawConfigs.map(enrichConfig),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Get config by species name (case-insensitive)
  getConfigBySpecies: (species) => {
    const { configs } = get();
    return configs.find(
      (c) => c.species.toLowerCase() === species.toLowerCase()
    );
  },

  // Get config by ID
  getConfigById: (id) => {
    const { configs } = get();
    return configs.find((c) => c.id === id);
  },

  // Get all species names for autocomplete
  getAllSpeciesNames: () => {
    const { configs } = get();
    return configs.map((c) => c.species).sort();
  },

  // Get species that are currently in their optimal propagation season
  getInSeasonSpecies: () => {
    const { configs } = get();
    return configs.filter((c) => c.isOptimalSeason);
  },

  // Get defaults for batch creation
  getDefaultsForSpecies: (species) => {
    const { getConfigBySpecies } = get();
    const config = getConfigBySpecies(species);

    if (!config) return null;

    return {
      preferredMethod: config.preferredMethod,
      typicalRootingDays: config.typicalRootingDays,
      typicalDaysToReady: config.typicalDaysToReady,
    };
  },

  // Get overdue thresholds for NeedingAttention widget
  getOverdueThresholdsForSpecies: (species) => {
    const { getConfigBySpecies } = get();
    const config = getConfigBySpecies(species);

    if (!config) return null;

    return {
      maxDaysRooting: config.maxDaysRooting,
      maxDaysPottedUp: config.maxDaysPottedUp,
      maxDaysHardening: config.maxDaysHardening,
    };
  },
}));
