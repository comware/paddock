/**
 * useBeds - Zustand store for growing beds.
 *
 * A bed is deliberately thin: it is a place, and what matters about it lives on the
 * plantings that reference it. Rotation history is a query over those plantings, not a
 * field here.
 */

import { create } from 'zustand';
import { vegDb, toKey, toId, withId, fkMatch, type VegBed } from '@/lib/db';

export interface BedsState {
  beds: VegBed[];
  isLoading: boolean;
  error: string | null;

  loadBeds: () => Promise<void>;
  addBed: (bed: Omit<VegBed, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBed: (id: string, updates: Partial<VegBed>) => Promise<void>;
  deleteBed: (id: string) => Promise<void>;

  bedsBySite: (siteId: string) => VegBed[];
  activeBeds: () => VegBed[];
}

export const useBeds = create<BedsState>((set, get) => ({
  beds: [],
  isLoading: false,
  error: null,

  loadBeds: async () => {
    set({ isLoading: true, error: null });
    try {
      const rawBeds = await vegDb.beds.toArray();
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const beds = rawBeds.map(withId);
      set({ beds, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addBed: async (bedData) => {
    try {
      const now = new Date();
      const bed: Omit<VegBed, 'id'> = {
        ...bedData,
        createdAt: now,
        updatedAt: now,
      };

      const key = await vegDb.beds.add(bed as VegBed);
      const id = toId(key);
      const newBed: VegBed = { ...bed, id };

      set((state) => ({ beds: [...state.beds, newBed] }));

      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateBed: async (id, updates) => {
    try {
      const updatedAt = new Date();
      await vegDb.beds.update(toKey(id), { ...updates, updatedAt });
      set((state) => ({
        beds: state.beds.map((b) => (b.id === id ? { ...b, ...updates, updatedAt } : b)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteBed: async (id) => {
    try {
      // A bed is the parent of plantings, and elsewhere in this codebase
      // (useTrays.deleteTray) deleting the parent leaves its children orphaned - a tray's
      // comments outlive the tray. That pattern is not repeated here: a bed with plantings
      // still in it refuses to delete rather than silently detaching them from their bed.
      const referencing = await vegDb.plantings.where('bedId').anyOf(fkMatch(id)).count();
      if (referencing > 0) {
        set({
          error: `Cannot delete this bed: ${referencing} planting${referencing === 1 ? '' : 's'} still reference it.`,
        });
        return;
      }

      await vegDb.beds.delete(toKey(id));
      set((state) => ({ beds: state.beds.filter((b) => b.id !== id) }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  bedsBySite: (siteId) => {
    return get().beds.filter((b) => b.siteId === siteId);
  },

  activeBeds: () => {
    return get().beds.filter((b) => b.isActive);
  },
}));
