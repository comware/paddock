/**
 * useTrays - Zustand store for tray management
 *
 * Manages tray state in memory with Dexie persistence.
 * Provides computed fields for status, yield ratio, etc.
 */

import { create } from 'zustand';
import { growDb, type GrowTray } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type TrayStatus = 'blackout' | 'light' | 'harvested' | 'failed';

export interface TrayWithComputed extends GrowTray {
  status: TrayStatus;
  daysInPhase: number;
  daysToHarvest: number | null;
  yieldRatio: number | null;
}

interface TrayFilters {
  status: TrayStatus | 'all';
  variety: string | 'all';
  week: number | 'all';
}

interface TraySort {
  field: 'dateSown' | 'trayNumber' | 'variety';
  direction: 'asc' | 'desc';
}

export interface TraysState {
  // Raw data from DB
  rawTrays: GrowTray[];
  // Computed trays with status, etc.
  trays: TrayWithComputed[];
  isLoading: boolean;
  error: string | null;
  filters: TrayFilters;
  sort: TraySort;

  // Actions
  loadTrays: () => Promise<void>;
  addTray: (tray: Omit<GrowTray, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTray: (id: string, updates: Partial<GrowTray>) => Promise<void>;
  deleteTray: (id: string) => Promise<void>;
  moveToLight: (id: string, germinationRate?: number) => Promise<void>;
  moveToBlackout: (id: string) => Promise<void>;
  harvestTray: (id: string, data: HarvestData) => Promise<void>;
  markFailed: (id: string, reason: string) => Promise<void>;

  // Filters & Sort
  setFilters: (filters: Partial<TrayFilters>) => void;
  setSort: (sort: TraySort) => void;

  // Computed selectors
  getFilteredTrays: () => TrayWithComputed[];
  getActiveTrayCount: () => { blackout: number; light: number };
  getNextTrayNumber: () => number;
  getSuccessRate: () => number;
  getAverageYieldRatio: () => number | null;
  getReadyToHarvest: () => TrayWithComputed[];
}

interface HarvestData {
  harvestWeight: number;
  qualityGrade: 'A' | 'B' | 'C' | 'F';
  sellable: boolean;
  problemsObserved?: string;
  lessonsLearned?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function computeTrayStatus(tray: GrowTray): TrayStatus {
  if (tray.qualityGrade === 'F' || (tray.problemsObserved && tray.problemsObserved.toLowerCase().includes('failed'))) {
    if (tray.dateHarvested) return 'harvested'; // Even failed trays that were harvested
    return 'failed';
  }
  if (tray.dateHarvested) return 'harvested';
  if (tray.dateToLight) return 'light';
  return 'blackout';
}

function computeDaysInPhase(tray: GrowTray): number {
  const now = new Date();
  const status = computeTrayStatus(tray);

  if (status === 'harvested' && tray.dateHarvested && tray.dateToLight) {
    return Math.floor((tray.dateHarvested.getTime() - tray.dateToLight.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (status === 'light' && tray.dateToLight) {
    return Math.floor((now.getTime() - tray.dateToLight.getTime()) / (1000 * 60 * 60 * 24));
  }
  // Blackout
  return Math.floor((now.getTime() - tray.dateSown.getTime()) / (1000 * 60 * 60 * 24));
}

function computeDaysToHarvest(tray: GrowTray): number | null {
  if (!tray.dateHarvested) return null;
  return Math.floor((tray.dateHarvested.getTime() - tray.dateSown.getTime()) / (1000 * 60 * 60 * 24));
}

function computeYieldRatio(tray: GrowTray): number | null {
  if (!tray.harvestWeight || !tray.seedWeight) return null;
  return Math.round((tray.harvestWeight / tray.seedWeight) * 100) / 100;
}

function enrichTray(tray: GrowTray): TrayWithComputed {
  return {
    ...tray,
    status: computeTrayStatus(tray),
    daysInPhase: computeDaysInPhase(tray),
    daysToHarvest: computeDaysToHarvest(tray),
    yieldRatio: computeYieldRatio(tray),
  };
}

// ============================================
// STORE
// ============================================

export const useTrays = create<TraysState>((set, get) => ({
  rawTrays: [],
  trays: [],
  isLoading: true,
  error: null,
  filters: { status: 'all', variety: 'all', week: 'all' },
  sort: { field: 'dateSown', direction: 'desc' },

  // Load trays from database
  loadTrays: async () => {
    try {
      const rawTrays = await growDb.trays.toArray();
      const trays = rawTrays.map(enrichTray);
      set({ rawTrays, trays, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add new tray
  addTray: async (trayData) => {
    const now = new Date();
    const tray: Omit<GrowTray, 'id'> = {
      ...trayData,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await growDb.trays.add(tray as GrowTray);
      const newTray = { ...tray, id: String(id) } as GrowTray;
      set((state) => ({
        rawTrays: [...state.rawTrays, newTray],
        trays: [...state.rawTrays, newTray].map(enrichTray),
      }));
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update tray
  updateTray: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await growDb.trays.update(id, updatedData);
      set((state) => {
        const newRawTrays = state.rawTrays.map((t) =>
          t.id === id ? { ...t, ...updatedData } : t
        );
        return {
          rawTrays: newRawTrays,
          trays: newRawTrays.map(enrichTray),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete tray
  deleteTray: async (id) => {
    try {
      await growDb.trays.delete(id);
      set((state) => {
        const newRawTrays = state.rawTrays.filter((t) => t.id !== id);
        return {
          rawTrays: newRawTrays,
          trays: newRawTrays.map(enrichTray),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Move tray from blackout to light
  moveToLight: async (id, germinationRate) => {
    const updates: Partial<GrowTray> = {
      dateToLight: new Date(),
      germinationRate,
    };
    await get().updateTray(id, updates);
  },

  // Move tray from light back to blackout (status reversal)
  moveToBlackout: async (id) => {
    const updates: Partial<GrowTray> = {
      dateToLight: undefined,
      germinationRate: undefined,
    };
    await get().updateTray(id, updates);
  },

  // Record harvest
  harvestTray: async (id, data) => {
    const updates: Partial<GrowTray> = {
      dateHarvested: new Date(),
      harvestWeight: data.harvestWeight,
      qualityGrade: data.qualityGrade,
      sellable: data.sellable,
      problemsObserved: data.problemsObserved || '',
      lessonsLearned: data.lessonsLearned || '',
    };
    await get().updateTray(id, updates);
  },

  // Mark tray as failed
  markFailed: async (id, reason) => {
    const updates: Partial<GrowTray> = {
      qualityGrade: 'F',
      problemsObserved: reason,
      dateHarvested: new Date(),
    };
    await get().updateTray(id, updates);
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

  // Get filtered and sorted trays with computed fields
  getFilteredTrays: () => {
    const { trays, filters, sort } = get();

    let filtered = [...trays];

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    // Apply variety filter
    if (filters.variety !== 'all') {
      filtered = filtered.filter((t) => t.variety === filters.variety);
    }

    // Apply week filter (week of experiment based on sow date)
    // This would need experiment start date - simplified for now

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'dateSown':
          comparison = a.dateSown.getTime() - b.dateSown.getTime();
          break;
        case 'trayNumber':
          comparison = a.trayNumber - b.trayNumber;
          break;
        case 'variety':
          comparison = a.variety.localeCompare(b.variety);
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  },

  // Get active tray counts
  getActiveTrayCount: () => {
    const { trays } = get();
    return {
      blackout: trays.filter((t) => t.status === 'blackout').length,
      light: trays.filter((t) => t.status === 'light').length,
    };
  },

  // Get next tray number
  getNextTrayNumber: () => {
    const { trays } = get();
    if (trays.length === 0) return 1;
    return Math.max(...trays.map((t) => t.trayNumber)) + 1;
  },

  // Calculate success rate (A+B grades / total harvested)
  getSuccessRate: () => {
    const { trays } = get();
    const harvested = trays.filter((t) => t.status === 'harvested');
    if (harvested.length === 0) return 0;

    const successful = harvested.filter(
      (t) => t.qualityGrade === 'A' || t.qualityGrade === 'B'
    );
    return Math.round((successful.length / harvested.length) * 100);
  },

  // Calculate average yield ratio
  getAverageYieldRatio: () => {
    const { trays } = get();
    const withYield = trays.filter((t) => t.yieldRatio !== null);

    if (withYield.length === 0) return null;
    const avg = withYield.reduce((a, b) => a + (b.yieldRatio || 0), 0) / withYield.length;
    return Math.round(avg * 100) / 100;
  },

  // Get trays ready to harvest (in light phase past typical days)
  getReadyToHarvest: () => {
    const { trays } = get();
    return trays.filter((t) => {
      if (t.status !== 'light') return false;
      // Simple heuristic: ready after 7+ days in light
      // Could be improved with variety-specific days
      return t.daysInPhase >= 7;
    });
  },
}));
