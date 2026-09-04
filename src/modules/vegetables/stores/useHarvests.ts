/**
 * useHarvests - Zustand store for the vegetable harvest log.
 *
 * A vegetable planting is picked repeatedly over weeks, not harvested once, so each pick is
 * its own event rather than a field on the planting. A total can always be summed from
 * events, but events can never be recovered from a total - and the yield curve over a
 * planting's life exists only if the individual picks do. See harvestTotals.ts.
 */

import { create } from 'zustand';
import { db, vegDb, toKey, toId, withId, fkMatch, type VegHarvest } from '@/lib/db';
import { LEGAL_TRANSITIONS, type PlantingStatus } from './usePlantings';
import { summariseHarvests, type HarvestSummary } from '../utils/harvestTotals';

/**
 * Decide what a planting's status should become when a pick is logged against it, reusing
 * usePlantings' own transition table rather than re-deciding the rules here.
 *
 * `harvesting` needs no change. Anything else is only allowed to move if `harvesting` is a
 * legal destination from its current status - which is true for `growing` (the ordinary
 * "first pick starts the harvest window" case) and for `finished` (a late pick reopens it:
 * real picking runs past when you thought you were done, and refusing the entry would just
 * push people to falsify the date instead of logging it honestly). `failed` has no outgoing
 * transition in that table, so it falls through to the throw below with no special-casing:
 * a pick against a terminal, written-off planting almost always means the wrong planting
 * was selected, and reopening it silently would hide that mistake rather than surface it.
 */
function statusAfterHarvest(current: PlantingStatus): PlantingStatus {
  if (current === 'harvesting') return current;
  if (LEGAL_TRANSITIONS[current].includes('harvesting')) return 'harvesting';
  throw new Error(`Cannot log a harvest against a planting with status "${current}".`);
}

export interface HarvestsState {
  harvests: VegHarvest[];
  isLoading: boolean;
  error: string | null;
  // Set to the planting's id whenever logHarvest reopens a `finished` planting back to
  // `harvesting`, so a UI can surface "this planting was marked finished - reopened"
  // instead of the reopening happening silently. Cleared (to null) on every other
  // logHarvest call, including one that fails.
  lastReopenedPlantingId: string | null;

  loadForPlanting: (plantingId: string) => Promise<void>;
  logHarvest: (harvest: Omit<VegHarvest, 'id' | 'createdAt'>) => Promise<string>;
  updateHarvest: (id: string, updates: Partial<VegHarvest>) => Promise<void>;
  deleteHarvest: (id: string) => Promise<void>;

  harvestsForPlanting: (plantingId: string) => VegHarvest[];
  summaryFor: (plantingId: string) => HarvestSummary;
}

export const useHarvests = create<HarvestsState>((set, get) => ({
  harvests: [],
  isLoading: false,
  error: null,
  lastReopenedPlantingId: null,

  loadForPlanting: async (plantingId) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await vegDb.harvests.where('plantingId').anyOf(fkMatch(plantingId)).toArray();
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const harvests = rows.map(withId).sort((a, b) => a.date.getTime() - b.date.getTime());
      set({ harvests, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  logHarvest: async (harvestData) => {
    try {
      set({ error: null, lastReopenedPlantingId: null });
      const createdAt = new Date();
      let reopened = false;
      let newId = '';

      // The pick and any status change it triggers are written in one transaction: a pick
      // recorded without its status change (or the reverse) would leave the planting's
      // status lying about whether it has been picked.
      await db.transaction('rw', vegDb.harvests, vegDb.plantings, async () => {
        const plantingKey = toKey(harvestData.plantingId);
        const planting = await vegDb.plantings.get(plantingKey);
        if (!planting) {
          throw new Error(`No planting found for id "${harvestData.plantingId}".`);
        }

        const nextStatus = statusAfterHarvest(planting.status);
        if (nextStatus !== planting.status) {
          reopened = planting.status === 'finished';
          await vegDb.plantings.update(plantingKey, { status: nextStatus, updatedAt: createdAt });
        }

        const record: Omit<VegHarvest, 'id'> = { ...harvestData, createdAt };
        const key = await vegDb.harvests.add(record as VegHarvest);
        newId = toId(key);
      });

      const newHarvest: VegHarvest = { ...harvestData, id: newId, createdAt };
      set((state) => ({
        harvests: [...state.harvests, newHarvest],
        lastReopenedPlantingId: reopened ? harvestData.plantingId : null,
      }));

      return newId;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateHarvest: async (id, updates) => {
    try {
      await vegDb.harvests.update(toKey(id), updates);
      set((state) => ({
        harvests: state.harvests.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteHarvest: async (id) => {
    try {
      await vegDb.harvests.delete(toKey(id));
      set((state) => ({ harvests: state.harvests.filter((h) => h.id !== id) }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  harvestsForPlanting: (plantingId) => {
    return get()
      .harvests.filter((h) => h.plantingId === plantingId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  summaryFor: (plantingId) => {
    return summariseHarvests(get().harvestsForPlanting(plantingId));
  },
}));
