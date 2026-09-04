/**
 * useMotherPlants - Zustand store for mother plant registry
 *
 * Manages mother plant state with Dexie persistence.
 * Tracks health assessments, status, and integrates with batch data
 * for productivity metrics.
 *
 * Following patterns from useBatches.ts
 */

import { create } from 'zustand';
import { propDb, toKey, toId, withId } from '@/lib/db';
import type {
  PropMotherPlant,
  MotherPlantStatus,
  CreateMotherPlantInput,
  UpdateMotherPlantInput,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Health assessment record for a mother plant.
 * Stored as part of the mother plant or in a separate collection.
 */
export interface HealthAssessment {
  date: Date;
  score: number; // 1-5 scale
  notes?: string;
}

/**
 * Mother plant with computed fields for UI display.
 */
export interface PropMotherPlantWithComputed extends PropMotherPlant {
  // Computed fields
  ageInMonths: number;
  daysSinceLastHealthCheck: number | null;
}

/**
 * Filters for mother plant list.
 */
export interface MotherPlantFilters {
  siteId: string | 'all';
  species: string | 'all';
  status: MotherPlantStatus | 'all';
}

/**
 * Sort options for mother plant list.
 */
export interface MotherPlantSort {
  field: 'species' | 'acquisitionDate' | 'lastHealthCheck' | 'healthScore' | 'label';
  direction: 'asc' | 'desc';
}

export interface MotherPlantsState {
  // Raw data from DB
  rawMotherPlants: PropMotherPlant[];
  // Computed mother plants with derived fields
  motherPlants: PropMotherPlantWithComputed[];
  isLoading: boolean;
  error: string | null;
  filters: MotherPlantFilters;
  sort: MotherPlantSort;

  // Actions - CRUD
  loadMotherPlants: () => Promise<void>;
  addMotherPlant: (input: CreateMotherPlantInput) => Promise<string>;
  updateMotherPlant: (id: string, updates: UpdateMotherPlantInput) => Promise<void>;
  deleteMotherPlant: (id: string) => Promise<void>;

  // Actions - Status Management
  retireMotherPlant: (id: string, notes?: string) => Promise<void>;
  markDeceased: (id: string, notes?: string) => Promise<void>;
  reactivateMotherPlant: (id: string) => Promise<void>;

  // Actions - Health Assessment
  recordHealthCheck: (id: string, score: number, notes?: string) => Promise<void>;

  // Filters & Sort
  setFilters: (filters: Partial<MotherPlantFilters>) => void;
  setSort: (sort: MotherPlantSort) => void;
  resetFilters: () => void;

  // Computed selectors
  getFilteredMotherPlants: () => PropMotherPlantWithComputed[];
  getActiveMotherPlants: () => PropMotherPlantWithComputed[];
  getMotherPlantsBySpecies: (species: string) => PropMotherPlantWithComputed[];
  getMotherPlantsBySite: (siteId: string) => PropMotherPlantWithComputed[];
  getMotherPlantsByStatus: (status: MotherPlantStatus) => PropMotherPlantWithComputed[];
  getMotherPlantById: (id: string) => PropMotherPlantWithComputed | undefined;
  getLastHealthCheck: (id: string) => HealthAssessment | null;
  getUniqueSpecies: () => string[];
  getUniqueSites: () => string[];
  getStatusCounts: () => Record<MotherPlantStatus, number>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate age in months from acquisition date.
 */
function calculateAgeInMonths(acquisitionDate: Date): number {
  const now = new Date();
  const acqDate = new Date(acquisitionDate);
  const months =
    (now.getFullYear() - acqDate.getFullYear()) * 12 +
    (now.getMonth() - acqDate.getMonth());
  return Math.max(0, months);
}

/**
 * Calculate days since last health check.
 */
function calculateDaysSinceLastHealthCheck(lastHealthCheck?: Date): number | null {
  if (!lastHealthCheck) return null;
  const now = new Date();
  const checkDate = new Date(lastHealthCheck);
  const diffTime = now.getTime() - checkDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Enrich a mother plant with computed fields.
 */
function enrichMotherPlant(plant: PropMotherPlant): PropMotherPlantWithComputed {
  return {
    ...plant,
    ageInMonths: plant.estimatedAge ?? calculateAgeInMonths(plant.acquisitionDate),
    daysSinceLastHealthCheck: calculateDaysSinceLastHealthCheck(plant.lastHealthCheck),
  };
}

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: MotherPlantFilters = {
  siteId: 'all',
  species: 'all',
  status: 'all',
};

/**
 * Default sort values.
 */
const DEFAULT_SORT: MotherPlantSort = {
  field: 'species',
  direction: 'asc',
};

// ============================================
// STORE
// ============================================

export const useMotherPlants = create<MotherPlantsState>((set, get) => ({
  rawMotherPlants: [],
  motherPlants: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },

  // Load mother plants from database
  loadMotherPlants: async () => {
    try {
      set({ isLoading: true, error: null });
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const rawMotherPlants = (await propDb.motherPlants.toArray()).map(withId);
      const motherPlants = rawMotherPlants.map(enrichMotherPlant);
      set({ rawMotherPlants, motherPlants, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new mother plant
  addMotherPlant: async (input: CreateMotherPlantInput) => {
    const now = new Date();

    const plant: Omit<PropMotherPlant, 'id'> = {
      ...input,
      status: input.status ?? 'active', // Default to active
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await propDb.motherPlants.add(plant as PropMotherPlant);
      const newPlant = { ...plant, id: toId(id) } as PropMotherPlant;
      set((state) => ({
        rawMotherPlants: [...state.rawMotherPlants, newPlant],
        motherPlants: [...state.rawMotherPlants, newPlant].map(enrichMotherPlant),
      }));
      return toId(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update mother plant
  updateMotherPlant: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await propDb.motherPlants.update(toKey(id), updatedData);
      set((state) => {
        const newRawMotherPlants = state.rawMotherPlants.map((p) =>
          p.id === id ? { ...p, ...updatedData } : p
        );
        return {
          rawMotherPlants: newRawMotherPlants,
          motherPlants: newRawMotherPlants.map(enrichMotherPlant),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete mother plant
  deleteMotherPlant: async (id) => {
    try {
      await propDb.motherPlants.delete(toKey(id));
      set((state) => {
        const newRawMotherPlants = state.rawMotherPlants.filter((p) => p.id !== id);
        return {
          rawMotherPlants: newRawMotherPlants,
          motherPlants: newRawMotherPlants.map(enrichMotherPlant),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Retire mother plant (no longer used for propagation)
  retireMotherPlant: async (id, notes) => {
    const { rawMotherPlants, updateMotherPlant } = get();
    const plant = rawMotherPlants.find((p) => p.id === id);

    if (!plant) {
      throw new Error(`Mother plant not found: ${id}`);
    }

    if (plant.status === 'deceased') {
      throw new Error('Cannot retire a deceased mother plant');
    }

    const updates: UpdateMotherPlantInput = {
      status: 'retired',
    };

    if (notes) {
      updates.propagationNotes = plant.propagationNotes
        ? `${plant.propagationNotes}\n\nRetired: ${notes}`
        : `Retired: ${notes}`;
    }

    await updateMotherPlant(id, updates);
  },

  // Mark mother plant as deceased
  markDeceased: async (id, notes) => {
    const { rawMotherPlants, updateMotherPlant } = get();
    const plant = rawMotherPlants.find((p) => p.id === id);

    if (!plant) {
      throw new Error(`Mother plant not found: ${id}`);
    }

    const updates: UpdateMotherPlantInput = {
      status: 'deceased',
    };

    if (notes) {
      updates.propagationNotes = plant.propagationNotes
        ? `${plant.propagationNotes}\n\nDeceased: ${notes}`
        : `Deceased: ${notes}`;
    }

    await updateMotherPlant(id, updates);
  },

  // Reactivate a retired mother plant
  reactivateMotherPlant: async (id) => {
    const { rawMotherPlants, updateMotherPlant } = get();
    const plant = rawMotherPlants.find((p) => p.id === id);

    if (!plant) {
      throw new Error(`Mother plant not found: ${id}`);
    }

    if (plant.status === 'deceased') {
      throw new Error('Cannot reactivate a deceased mother plant');
    }

    if (plant.status === 'active') {
      throw new Error('Mother plant is already active');
    }

    await updateMotherPlant(id, { status: 'active' });
  },

  // Record a health check
  recordHealthCheck: async (id, score, notes) => {
    if (score < 1 || score > 5) {
      throw new Error('Health score must be between 1 and 5');
    }

    const { rawMotherPlants, updateMotherPlant } = get();
    const plant = rawMotherPlants.find((p) => p.id === id);

    if (!plant) {
      throw new Error(`Mother plant not found: ${id}`);
    }

    const updates: UpdateMotherPlantInput = {
      lastHealthCheck: new Date(),
      healthScore: score,
      healthNotes: notes ?? plant.healthNotes,
    };

    await updateMotherPlant(id, updates);
  },

  // Set filters
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  // Set sort
  setSort: (sort) => {
    set({ sort });
  },

  // Reset filters to defaults
  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // Get filtered and sorted mother plants
  getFilteredMotherPlants: () => {
    const { motherPlants, filters, sort } = get();

    let filtered = [...motherPlants];

    // Apply site filter
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((p) => p.siteId === filters.siteId);
    }

    // Apply species filter
    if (filters.species !== 'all') {
      filtered = filtered.filter((p) => p.species === filters.species);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'species':
          comparison = a.species.localeCompare(b.species);
          break;
        case 'acquisitionDate':
          comparison =
            new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime();
          break;
        case 'lastHealthCheck': {
          const aDate = a.lastHealthCheck ? new Date(a.lastHealthCheck).getTime() : 0;
          const bDate = b.lastHealthCheck ? new Date(b.lastHealthCheck).getTime() : 0;
          comparison = aDate - bDate;
          break;
        }
        case 'healthScore':
          comparison = (a.healthScore ?? 0) - (b.healthScore ?? 0);
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  },

  // Get all active mother plants
  getActiveMotherPlants: () => {
    const { motherPlants } = get();
    return motherPlants.filter((p) => p.status === 'active');
  },

  // Get mother plants by species
  getMotherPlantsBySpecies: (species) => {
    const { motherPlants } = get();
    return motherPlants.filter((p) => p.species === species);
  },

  // Get mother plants by site
  getMotherPlantsBySite: (siteId) => {
    const { motherPlants } = get();
    return motherPlants.filter((p) => p.siteId === siteId);
  },

  // Get mother plants by status
  getMotherPlantsByStatus: (status) => {
    const { motherPlants } = get();
    return motherPlants.filter((p) => p.status === status);
  },

  // Get mother plant by ID
  getMotherPlantById: (id) => {
    const { motherPlants } = get();
    return motherPlants.find((p) => p.id === id);
  },

  // Get last health check for a mother plant
  getLastHealthCheck: (id) => {
    const { motherPlants } = get();
    const plant = motherPlants.find((p) => p.id === id);

    if (!plant || !plant.lastHealthCheck || !plant.healthScore) {
      return null;
    }

    return {
      date: plant.lastHealthCheck,
      score: plant.healthScore,
      notes: plant.healthNotes,
    };
  },

  // Get unique species for filter dropdown
  getUniqueSpecies: () => {
    const { motherPlants } = get();
    const species = [...new Set(motherPlants.map((p) => p.species))];
    return species.sort();
  },

  // Get unique sites for filter dropdown
  getUniqueSites: () => {
    const { motherPlants } = get();
    const sites = [...new Set(motherPlants.map((p) => p.siteId))];
    return sites.sort();
  },

  // Get counts by status
  getStatusCounts: () => {
    const { motherPlants } = get();
    const counts: Record<MotherPlantStatus, number> = {
      active: 0,
      retired: 0,
      deceased: 0,
    };

    for (const plant of motherPlants) {
      counts[plant.status]++;
    }

    return counts;
  },
}));
