/**
 * usePlannedPlantings - Zustand store for planting calendar management
 *
 * Manages planned plantings for the planting calendar feature.
 * Provides CRUD operations and computed selectors for calendar views.
 */

import { create } from 'zustand';
import { growDb, toKey, toId, withId, type GrowPlannedPlanting } from '@/lib/db';
import { approveProposalOption, rejectProposal, reopenProposal } from '@/lib/webmcp';
import {
  startOfDay,
  endOfDay,
  addDays,
  isSameDay,
  isWithinInterval,
  differenceInDays,
} from 'date-fns';

// ============================================
// TYPES
// ============================================

export type PlannedPlantingStatus = 'proposed' | 'planned' | 'converted' | 'cancelled';

export interface PlannedPlantingWithComputed extends GrowPlannedPlanting {
  daysUntilSow: number;
  daysUntilHarvest: number;
  isOverdue: boolean;
  isPastSowDate: boolean;
}

interface PlannedPlantingsFilters {
  status: PlannedPlantingStatus | 'all';
  variety: string | 'all';
  siteId: string | 'all';
}

export interface PlannedPlantingsState {
  // Raw data from DB
  rawPlantings: GrowPlannedPlanting[];
  // Computed plantings
  plantings: PlannedPlantingWithComputed[];
  isLoading: boolean;
  error: string | null;
  filters: PlannedPlantingsFilters;

  // Actions
  loadPlantings: () => Promise<void>;
  addPlanting: (planting: Omit<GrowPlannedPlanting, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePlanting: (id: string, updates: Partial<GrowPlannedPlanting>) => Promise<void>;
  deletePlanting: (id: string) => Promise<void>;
  convertToTray: (id: string, trayId: string) => Promise<void>;
  cancelPlanting: (id: string) => Promise<void>;

  // Agent proposals (WebMCP). An agent stages a plan; only a human commits it.
  approveProposal: (proposalId: string, option: number) => Promise<void>;
  declineProposal: (proposalId: string) => Promise<void>;
  /** Undo a decision: every option goes back on the table. */
  reopenProposal: (proposalId: string) => Promise<void>;

  // Filters
  setFilters: (filters: Partial<PlannedPlantingsFilters>) => void;

  // Computed selectors
  getFilteredPlantings: () => PlannedPlantingWithComputed[];
  getPlantingsForDateRange: (startDate: Date, endDate: Date) => PlannedPlantingWithComputed[];
  getPlantingsForDate: (date: Date) => PlannedPlantingWithComputed[];
  getUpcomingPlantings: (daysAhead?: number) => PlannedPlantingWithComputed[];
  getOverduePlantings: () => PlannedPlantingWithComputed[];
  getPlantingById: (id: string) => PlannedPlantingWithComputed | undefined;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function enrichPlanting(planting: GrowPlannedPlanting, referenceDate: Date = new Date()): PlannedPlantingWithComputed {
  const today = startOfDay(referenceDate);
  const sowDate = startOfDay(planting.plannedSowDate);
  const harvestDate = startOfDay(planting.targetHarvestDate);

  const daysUntilSow = differenceInDays(sowDate, today);
  const daysUntilHarvest = differenceInDays(harvestDate, today);
  const isPastSowDate = daysUntilSow < 0;
  const isOverdue = isPastSowDate && planting.status === 'planned';

  return {
    ...planting,
    daysUntilSow,
    daysUntilHarvest,
    isPastSowDate,
    isOverdue,
  };
}

// ============================================
// STORE
// ============================================

export const usePlannedPlantings = create<PlannedPlantingsState>((set, get) => ({
  rawPlantings: [],
  plantings: [],
  isLoading: true,
  error: null,
  filters: { status: 'all', variety: 'all', siteId: 'all' },

  // Load plantings from database
  loadPlantings: async () => {
    try {
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const rawPlantings = (await growDb.plannedPlantings.toArray()).map(withId);
      const plantings = rawPlantings.map((p) => enrichPlanting(p));
      set({ rawPlantings, plantings, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new planned planting
  addPlanting: async (plantingData) => {
    const now = new Date();
    const planting: Omit<GrowPlannedPlanting, 'id'> = {
      ...plantingData,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await growDb.plannedPlantings.add(planting as GrowPlannedPlanting);
      const newPlanting = { ...planting, id: toId(id) } as GrowPlannedPlanting;
      set((state) => ({
        rawPlantings: [...state.rawPlantings, newPlanting],
        plantings: [...state.rawPlantings, newPlanting].map((p) => enrichPlanting(p)),
      }));
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update planned planting
  updatePlanting: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await growDb.plannedPlantings.update(toKey(id), updatedData);
      set((state) => {
        const newRawPlantings = state.rawPlantings.map((p) =>
          p.id === id ? { ...p, ...updatedData } : p
        );
        return {
          rawPlantings: newRawPlantings,
          plantings: newRawPlantings.map((p) => enrichPlanting(p)),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete planned planting
  deletePlanting: async (id) => {
    try {
      await growDb.plannedPlantings.delete(toKey(id));
      set((state) => {
        const newRawPlantings = state.rawPlantings.filter((p) => p.id !== id);
        return {
          rawPlantings: newRawPlantings,
          plantings: newRawPlantings.map((p) => enrichPlanting(p)),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Convert planned planting to actual tray
  convertToTray: async (id, trayId) => {
    await get().updatePlanting(id, {
      status: 'converted',
      convertedTrayId: trayId,
    });
  },

  // Cancel planned planting
  cancelPlanting: async (id) => {
    await get().updatePlanting(id, { status: 'cancelled' });
  },

  // Approve one option of an agent proposal. The chosen option becomes 'planned' and
  // every alternative is cancelled - kept rather than deleted, since the options the
  // grower turned down are part of how the plan was arrived at.
  approveProposal: async (proposalId, option) => {
    try {
      await approveProposalOption(proposalId, option);
      await get().loadPlantings();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Undo an approve or a decline.
  reopenProposal: async (proposalId) => {
    try {
      await reopenProposal(proposalId);
      await get().loadPlantings();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Decline the whole proposal. Every option is cancelled.
  declineProposal: async (proposalId) => {
    try {
      await rejectProposal(proposalId);
      await get().loadPlantings();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Set filters
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  // Get filtered plantings
  getFilteredPlantings: () => {
    const { plantings, filters } = get();

    let filtered = [...plantings];

    if (filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    if (filters.variety !== 'all') {
      filtered = filtered.filter((p) => p.variety === filters.variety);
    }

    if (filters.siteId !== 'all') {
      filtered = filtered.filter((p) => p.siteId === filters.siteId);
    }

    // Sort by planned sow date
    filtered.sort((a, b) => a.plannedSowDate.getTime() - b.plannedSowDate.getTime());

    return filtered;
  },

  // Get plantings within a date range (for calendar view)
  getPlantingsForDateRange: (startDate: Date, endDate: Date) => {
    const { plantings } = get();
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    return plantings.filter((p) => {
      const sowDate = startOfDay(p.plannedSowDate);
      return isWithinInterval(sowDate, { start, end });
    });
  },

  // Get plantings for a specific date
  getPlantingsForDate: (date: Date) => {
    const { plantings } = get();
    return plantings.filter((p) => isSameDay(p.plannedSowDate, date));
  },

  // Get upcoming plantings (not yet sown)
  getUpcomingPlantings: (daysAhead = 7) => {
    const { plantings } = get();
    const today = startOfDay(new Date());
    const endDate = addDays(today, daysAhead);

    return plantings
      .filter((p) => {
        if (p.status !== 'planned') return false;
        const sowDate = startOfDay(p.plannedSowDate);
        return sowDate >= today && sowDate <= endDate;
      })
      .sort((a, b) => a.plannedSowDate.getTime() - b.plannedSowDate.getTime());
  },

  // Get overdue plantings (past sow date but still planned)
  getOverduePlantings: () => {
    const { plantings } = get();
    return plantings.filter((p) => p.isOverdue);
  },

  // Get single planting by ID
  getPlantingById: (id: string) => {
    const { plantings } = get();
    return plantings.find((p) => p.id === id);
  },
}));
