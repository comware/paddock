/**
 * usePlantings - Zustand store for vegetable plantings.
 *
 * A planting is the record you open and work in - the vegetable equivalent of a tray, but
 * harvested over weeks rather than once. Two plantings can share a bed at once, and a
 * succession is just the next planting of the same crop, linked back via
 * previousPlantingId so the interval can be measured against what it yielded.
 */

import { create } from 'zustand';
import { db, vegDb, toKey, toId, withId, fkMatch, type VegPlanting } from '@/lib/db';

export type PlantingStatus = VegPlanting['status'];

// The legal status graph. planned -> growing -> harvesting -> finished is the happy path;
// failed is reachable from any non-terminal status because a crop can die at any point.
// finished -> harvesting is the one exception to "terminal": real picking runs past when
// you thought you were done, and refusing to reopen would just push people to falsify
// dates instead of logging the late pick honestly.
//
// Exported so useHarvests can reuse this exact table when a pick is logged, rather than
// duplicating the transition rules there. There is no circular import: this module does
// not import useHarvests.
export const LEGAL_TRANSITIONS: Record<PlantingStatus, PlantingStatus[]> = {
  planned: ['growing', 'failed'],
  growing: ['harvesting', 'finished', 'failed'],
  harvesting: ['finished', 'failed'],
  finished: ['harvesting'],
  failed: [],
};

// The succession chain walk (both directions) is bounded so a malformed or hand-edited
// previousPlantingId cycle can't spin forever - a real chain of successions on one bed
// will never approach this depth.
const MAX_SUCCESSION_CHAIN_LENGTH = 1000;

export interface PlantingsState {
  plantings: VegPlanting[];
  isLoading: boolean;
  error: string | null;

  loadPlantings: () => Promise<void>;
  addPlanting: (planting: Omit<VegPlanting, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePlanting: (id: string, updates: Partial<VegPlanting>) => Promise<void>;
  deletePlanting: (id: string) => Promise<void>;
  setStatus: (id: string, status: PlantingStatus) => Promise<void>;
  finish: (id: string, reason: string) => Promise<void>;

  plantingsInBed: (bedId: string) => VegPlanting[];
  plantingsByStatus: (status: PlantingStatus) => VegPlanting[];
  plantingsBySite: (siteId: string) => VegPlanting[];
  activePlantings: () => VegPlanting[];
  successionChain: (id: string) => VegPlanting[];
}

export const usePlantings = create<PlantingsState>((set, get) => ({
  plantings: [],
  isLoading: false,
  error: null,

  loadPlantings: async () => {
    set({ isLoading: true, error: null });
    try {
      const rawPlantings = await vegDb.plantings.toArray();
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const plantings = rawPlantings.map(withId);
      set({ plantings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addPlanting: async (plantingData) => {
    try {
      const now = new Date();
      const record: Omit<VegPlanting, 'id'> = {
        ...plantingData,
        createdAt: now,
        updatedAt: now,
      };

      const key = await vegDb.plantings.add(record as VegPlanting);
      const id = toId(key);
      const newPlanting: VegPlanting = { ...record, id };

      set((state) => ({ plantings: [...state.plantings, newPlanting] }));

      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updatePlanting: async (id, updates) => {
    try {
      const updatedAt = new Date();
      await vegDb.plantings.update(toKey(id), { ...updates, updatedAt });
      set((state) => ({
        plantings: state.plantings.map((p) => (p.id === id ? { ...p, ...updates, updatedAt } : p)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deletePlanting: async (id) => {
    try {
      // A planting owns its harvests, and elsewhere in this codebase (useTrays.deleteTray)
      // deleting the parent leaves its children orphaned - a tray's comments outlive the
      // tray. That pattern is not repeated here: harvests are deleted with their planting,
      // in a transaction, so a failure part-way through never leaves harvests deleted with
      // their planting still present (or vice versa).
      await db.transaction('rw', vegDb.harvests, vegDb.plantings, async () => {
        await vegDb.harvests.where('plantingId').anyOf(fkMatch(id)).delete();
        await vegDb.plantings.delete(toKey(id));
      });

      set((state) => ({ plantings: state.plantings.filter((p) => p.id !== id) }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setStatus: async (id, status) => {
    const current = get().plantings.find((p) => p.id === id);
    const currentStatus = current?.status;

    if (currentStatus && !LEGAL_TRANSITIONS[currentStatus].includes(status)) {
      const message = `Cannot move a planting from "${currentStatus}" to "${status}".`;
      set({ error: message });
      throw new Error(message);
    }

    await get().updatePlanting(id, { status });
  },

  finish: async (id, reason) => {
    await get().setStatus(id, 'finished');
    await get().updatePlanting(id, { dateFinished: new Date(), finishReason: reason });
  },

  plantingsInBed: (bedId) => {
    // This is the query that lets a bed stay a thin row: rotation history is derived from
    // the [bedId+dateSown] index rather than carried on the bed itself.
    return get()
      .plantings.filter((p) => p.bedId === bedId)
      .sort((a, b) => {
        const aTime = a.dateSown ? a.dateSown.getTime() : 0;
        const bTime = b.dateSown ? b.dateSown.getTime() : 0;
        return aTime - bTime;
      });
  },

  plantingsByStatus: (status) => {
    return get().plantings.filter((p) => p.status === status);
  },

  plantingsBySite: (siteId) => {
    return get().plantings.filter((p) => p.siteId === siteId);
  },

  activePlantings: () => {
    return get().plantings.filter((p) => p.status !== 'finished' && p.status !== 'failed');
  },

  successionChain: (id) => {
    const byId = new Map(get().plantings.map((p) => [p.id, p]));

    // Walk backwards to the earliest ancestor first.
    const visitedBackward = new Set<string>();
    let earliest = byId.get(id);
    if (!earliest) return [];

    let cursor = earliest;
    visitedBackward.add(cursor.id as string);
    for (let i = 0; i < MAX_SUCCESSION_CHAIN_LENGTH; i++) {
      const prevId = cursor.previousPlantingId;
      if (!prevId) break;
      const prev = byId.get(prevId);
      if (!prev || visitedBackward.has(prev.id as string)) break; // cycle guard
      visitedBackward.add(prev.id as string);
      cursor = prev;
    }
    earliest = cursor;

    // Then walk forward from the earliest ancestor, following whichever planting names it
    // as previousPlantingId, to collect the full chain in chronological order.
    const chain: VegPlanting[] = [earliest];
    const visitedForward = new Set<string>([earliest.id as string]);
    let current = earliest;
    for (let i = 0; i < MAX_SUCCESSION_CHAIN_LENGTH; i++) {
      const next = get().plantings.find(
        (p) => p.previousPlantingId === current.id && !visitedForward.has(p.id as string)
      );
      if (!next) break;
      visitedForward.add(next.id as string);
      chain.push(next);
      current = next;
    }

    return chain;
  },
}));
