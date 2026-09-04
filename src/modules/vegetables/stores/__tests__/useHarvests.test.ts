/**
 * useHarvests - tested against a real (fake-indexeddb) database, never against store state.
 *
 * Every assertion reads back out of vegDb.harvests or vegDb.plantings. See
 * usePlantings.test.ts for the same discipline applied to the sibling store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, vegDb, type VegPlanting, type VegHarvest } from '@/lib/db';
import { usePlantings } from '../usePlantings';
import { useHarvests } from '../useHarvests';

const planting = (overrides: Partial<Omit<VegPlanting, 'id' | 'createdAt' | 'updatedAt'>> = {}) => ({
  siteId: 'site-1',
  bedId: 'bed-1',
  crop: 'Carrots',
  method: 'direct_sown' as const,
  status: 'planned' as const,
  notes: '',
  ...overrides,
});

const harvest = (plantingId: string, overrides: Partial<Omit<VegHarvest, 'id' | 'plantingId' | 'createdAt'>> = {}) => ({
  plantingId,
  date: new Date('2026-02-01'),
  quantity: 1,
  unit: 'kg' as const,
  sellable: true,
  ...overrides,
});

describe('useHarvests', () => {
  beforeEach(async () => {
    await db.open();
    await vegDb.plantings.clear();
    await vegDb.harvests.clear();
    usePlantings.setState({ plantings: [], isLoading: false, error: null });
    useHarvests.setState({ harvests: [], isLoading: false, error: null, lastReopenedPlantingId: null });
  });

  describe('CRUD', () => {
    it('logHarvest returns a string id, and the row is in the database', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));

      const id = await useHarvests.getState().logHarvest(harvest(plantingId, { quantity: 2.5 }));

      expect(typeof id).toBe('string');
      const stored = await vegDb.harvests.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].quantity).toBe(2.5);
    });

    it('loadForPlanting normalises ids to strings', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      await useHarvests.getState().logHarvest(harvest(plantingId));

      await useHarvests.getState().loadForPlanting(plantingId);

      const loaded = useHarvests.getState().harvests;
      expect(loaded).toHaveLength(1);
      expect(typeof loaded[0].id).toBe('string');
    });

    it('updateHarvest persists a correction', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      const id = await useHarvests.getState().logHarvest(harvest(plantingId, { quantity: 1 }));

      await useHarvests.getState().updateHarvest(id, { quantity: 1.8 });

      const stored = await vegDb.harvests.toArray();
      expect(stored[0].quantity).toBe(1.8);
    });

    it('deleteHarvest persists', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      const id = await useHarvests.getState().logHarvest(harvest(plantingId));

      await useHarvests.getState().deleteHarvest(id);

      expect(await vegDb.harvests.count()).toBe(0);
    });
  });

  describe('same-session edit', () => {
    it('persists a correction to a pick logged earlier in this session, without an intervening loadForPlanting()', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      const id = await useHarvests.getState().logHarvest(harvest(plantingId, { quantity: 1 }));

      // No loadForPlanting() in between - the id used here is the string id logHarvest put
      // straight into state, not one that only a reload would produce.
      await useHarvests.getState().updateHarvest(id, { quantity: 3 });

      const stored = await vegDb.harvests.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].quantity).toBe(3);
    });
  });

  describe('load by planting', () => {
    it('loadForPlanting returns only that planting\'s picks, in date order', async () => {
      const plantingA = await usePlantings.getState().addPlanting(planting({ status: 'harvesting', crop: 'Carrots' }));
      const plantingB = await usePlantings.getState().addPlanting(planting({ status: 'harvesting', crop: 'Beans' }));

      await useHarvests.getState().logHarvest(harvest(plantingA, { date: new Date('2026-02-10'), quantity: 2 }));
      await useHarvests.getState().logHarvest(harvest(plantingA, { date: new Date('2026-02-03'), quantity: 1 }));
      await useHarvests.getState().logHarvest(harvest(plantingB, { date: new Date('2026-02-05'), quantity: 5 }));

      await useHarvests.getState().loadForPlanting(plantingA);
      const loaded = useHarvests.getState().harvests;

      expect(loaded).toHaveLength(2);
      expect(loaded.every((h) => h.plantingId === plantingA)).toBe(true);
      expect(loaded.map((h) => h.quantity)).toEqual([1, 2]);
    });
  });

  describe('status side-effects', () => {
    it('logging against a growing planting moves it to harvesting', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'growing' }));

      await useHarvests.getState().logHarvest(harvest(plantingId));

      const stored = (await vegDb.plantings.toArray())[0];
      expect(stored.status).toBe('harvesting');
    });

    it('logging against a finished planting reopens it to harvesting, and the store surfaces the reopening', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'finished' }));

      await useHarvests.getState().logHarvest(harvest(plantingId));

      const stored = (await vegDb.plantings.toArray())[0];
      expect(stored.status).toBe('harvesting');
      expect(useHarvests.getState().lastReopenedPlantingId).toBe(plantingId);
    });

    it('logging against a harvesting planting leaves its status untouched and does not report a reopen', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));

      await useHarvests.getState().logHarvest(harvest(plantingId));

      const stored = (await vegDb.plantings.toArray())[0];
      expect(stored.status).toBe('harvesting');
      expect(useHarvests.getState().lastReopenedPlantingId).toBeNull();
    });

    // A pick against a `failed` planting is refused rather than reopening it: `failed` is
    // terminal (the crop died or was written off), and a pick logged against it almost
    // always means the wrong planting was selected, not a late harvest. Reopening it
    // silently would resurrect a planting the grower deliberately closed out, and hide the
    // data-entry mistake instead of surfacing it. This falls straight out of reusing
    // usePlantings' LEGAL_TRANSITIONS table, which has no outgoing transition from
    // `failed` - no special-casing needed here.
    it('refuses to log a harvest against a failed planting, and leaves it untouched', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'failed' }));

      await expect(useHarvests.getState().logHarvest(harvest(plantingId))).rejects.toThrow();

      expect(await vegDb.harvests.count()).toBe(0);
      const stored = (await vegDb.plantings.toArray())[0];
      expect(stored.status).toBe('failed');
    });
  });

  describe('summary', () => {
    it('summaryFor matches summariseHarvests over that planting\'s picks', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      await useHarvests.getState().logHarvest(harvest(plantingId, { date: new Date('2026-02-01'), quantity: 2, unit: 'kg' }));
      await useHarvests.getState().logHarvest(harvest(plantingId, { date: new Date('2026-02-08'), quantity: 3, unit: 'kg' }));

      await useHarvests.getState().loadForPlanting(plantingId);
      const summary = useHarvests.getState().summaryFor(plantingId);

      expect(summary.totals.kg).toBe(5);
      expect(summary.harvestCount).toBe(2);
      expect(summary.daysHarvesting).toBe(8);
    });

    it('keeps mixed units separate rather than combining them', async () => {
      const plantingId = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      await useHarvests.getState().logHarvest(harvest(plantingId, { quantity: 2, unit: 'kg' }));
      await useHarvests.getState().logHarvest(harvest(plantingId, { quantity: 4, unit: 'bunches' }));

      await useHarvests.getState().loadForPlanting(plantingId);
      const summary = useHarvests.getState().summaryFor(plantingId);

      expect(summary.totals.kg).toBe(2);
      expect(summary.totals.bunches).toBe(4);
      expect(Object.keys(summary.totals).sort()).toEqual(['bunches', 'kg']);
    });
  });
});
