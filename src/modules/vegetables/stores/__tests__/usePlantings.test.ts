/**
 * usePlantings - tested against a real (fake-indexeddb) database, never against store state.
 *
 * Every assertion reads back out of vegDb.plantings (or vegDb.harvests for the cascade
 * delete). The store updates optimistically whether or not a write landed, so asserting
 * against Zustand state would pass against broken code just as easily as working code. See
 * useBeds.test.ts for the same discipline applied to the sibling store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, vegDb, type VegPlanting, type VegHarvest } from '@/lib/db';
import { usePlantings } from '../usePlantings';

const planting = (overrides: Partial<Omit<VegPlanting, 'id' | 'createdAt' | 'updatedAt'>> = {}) => ({
  siteId: 'site-1',
  bedId: 'bed-1',
  crop: 'Carrots',
  method: 'direct_sown' as const,
  status: 'planned' as const,
  notes: '',
  ...overrides,
});

const harvest = (plantingId: string, overrides: Partial<Omit<VegHarvest, 'id' | 'plantingId'>> = {}): Omit<VegHarvest, 'id'> => ({
  plantingId,
  date: new Date('2026-02-01'),
  quantity: 1,
  unit: 'kg',
  sellable: true,
  createdAt: new Date('2026-02-01'),
  ...overrides,
});

describe('usePlantings', () => {
  beforeEach(async () => {
    await db.open();
    await vegDb.plantings.clear();
    await vegDb.harvests.clear();
    usePlantings.setState({ plantings: [], isLoading: false, error: null });
  });

  describe('CRUD', () => {
    it('addPlanting returns a string id, and the row is in the database', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ crop: 'Beetroot' }));

      expect(typeof id).toBe('string');

      const stored = await vegDb.plantings.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].crop).toBe('Beetroot');
    });

    it('loadPlantings normalises ids to strings', async () => {
      await usePlantings.getState().addPlanting(planting());

      await usePlantings.getState().loadPlantings();

      const loaded = usePlantings.getState().plantings;
      expect(loaded).toHaveLength(1);
      expect(typeof loaded[0].id).toBe('string');
    });

    it('updatePlanting persists', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ crop: 'Carrots' }));

      await usePlantings.getState().updatePlanting(id, { crop: 'Parsnips' });

      const stored = await vegDb.plantings.toArray();
      expect(stored[0].crop).toBe('Parsnips');
    });

    it('deletePlanting persists', async () => {
      const id = await usePlantings.getState().addPlanting(planting());

      await usePlantings.getState().deletePlanting(id);

      expect(await vegDb.plantings.count()).toBe(0);
    });
  });

  describe('same-session edit', () => {
    it('persists an edit to a planting added in this session, without an intervening loadPlantings()', async () => {
      // No loadPlantings() in between - this is the whole point. The row is in state with
      // the string id that addPlanting put there, and updatePlanting must key its write off
      // that id correctly rather than a numeric one that only loadPlantings() would produce.
      const id = await usePlantings.getState().addPlanting(planting({ crop: 'Fresh Carrots' }));

      await usePlantings.getState().updatePlanting(id, { crop: 'Fresh Carrots (edited)' });

      const stored = await vegDb.plantings.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].crop).toBe('Fresh Carrots (edited)');
    });
  });

  describe('cascade delete', () => {
    it('deletes its own harvests but leaves another planting\'s harvests alone', async () => {
      const id = await usePlantings.getState().addPlanting(planting());
      const otherId = await usePlantings.getState().addPlanting(planting({ crop: 'Onions' }));

      await vegDb.harvests.add(harvest(id) as VegHarvest);
      await vegDb.harvests.add(harvest(id, { quantity: 2 }) as VegHarvest);
      await vegDb.harvests.add(harvest(otherId) as VegHarvest);

      await usePlantings.getState().deletePlanting(id);

      expect(await vegDb.plantings.count()).toBe(1);
      const remainingHarvests = await vegDb.harvests.toArray();
      expect(remainingHarvests).toHaveLength(1);
      expect(remainingHarvests[0].plantingId).toBe(otherId);
    });
  });

  describe('status transitions', () => {
    it('walks planned -> growing -> harvesting -> finished', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ status: 'planned' }));

      await usePlantings.getState().setStatus(id, 'growing');
      expect((await vegDb.plantings.toArray())[0].status).toBe('growing');

      await usePlantings.getState().setStatus(id, 'harvesting');
      expect((await vegDb.plantings.toArray())[0].status).toBe('harvesting');

      await usePlantings.getState().setStatus(id, 'finished');
      expect((await vegDb.plantings.toArray())[0].status).toBe('finished');
    });

    it('allows failed from any non-terminal status', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ status: 'growing' }));

      await usePlantings.getState().setStatus(id, 'failed');

      expect((await vegDb.plantings.toArray())[0].status).toBe('failed');
    });

    it('allows a reopen from finished to harvesting for a late pick', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ status: 'finished' }));

      await usePlantings.getState().setStatus(id, 'harvesting');

      expect((await vegDb.plantings.toArray())[0].status).toBe('harvesting');
    });

    it('refuses an invalid transition and leaves the persisted status untouched', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ status: 'finished' }));

      await expect(usePlantings.getState().setStatus(id, 'planned')).rejects.toThrow();

      expect((await vegDb.plantings.toArray())[0].status).toBe('finished');
    });
  });

  describe('finish', () => {
    it('sets status, dateFinished and finishReason, all persisted', async () => {
      const id = await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));

      await usePlantings.getState().finish(id, 'Bolted in the heat');

      const stored = (await vegDb.plantings.toArray())[0];
      expect(stored.status).toBe('finished');
      expect(stored.finishReason).toBe('Bolted in the heat');
      expect(stored.dateFinished).toBeInstanceOf(Date);
    });
  });

  describe('successions', () => {
    it('returns a chain of three in chronological order, earliest first', async () => {
      const first = await usePlantings.getState().addPlanting(
        planting({ crop: 'Lettuce', status: 'finished', dateSown: new Date('2026-01-01') })
      );
      const second = await usePlantings.getState().addPlanting(
        planting({ crop: 'Lettuce', status: 'finished', dateSown: new Date('2026-02-01'), previousPlantingId: first })
      );
      const third = await usePlantings.getState().addPlanting(
        planting({ crop: 'Lettuce', status: 'growing', dateSown: new Date('2026-03-01'), previousPlantingId: second })
      );

      await usePlantings.getState().loadPlantings();
      const chain = usePlantings.getState().successionChain(third);

      expect(chain.map((p) => p.id)).toEqual([first, second, third]);
    });

    it('starting from the earliest ancestor still returns the full chain', async () => {
      const first = await usePlantings.getState().addPlanting(
        planting({ crop: 'Kale', status: 'finished', dateSown: new Date('2026-01-01') })
      );
      const second = await usePlantings.getState().addPlanting(
        planting({ crop: 'Kale', status: 'growing', dateSown: new Date('2026-02-01'), previousPlantingId: first })
      );

      await usePlantings.getState().loadPlantings();
      const chain = usePlantings.getState().successionChain(first);

      expect(chain.map((p) => p.id)).toEqual([first, second]);
    });

    it('does not loop forever on a cyclic previousPlantingId link', async () => {
      const a = await usePlantings.getState().addPlanting(planting({ crop: 'Spinach' }));
      const b = await usePlantings.getState().addPlanting(
        planting({ crop: 'Spinach', previousPlantingId: a })
      );
      // Hand-edit a malformed cycle: a now points forward to b.
      await usePlantings.getState().updatePlanting(a, { previousPlantingId: b });

      await usePlantings.getState().loadPlantings();

      expect(() => usePlantings.getState().successionChain(a)).not.toThrow();
      const chain = usePlantings.getState().successionChain(a);
      expect(chain.length).toBeGreaterThan(0);
    });
  });

  describe('selectors', () => {
    it('plantingsInBed returns that bed\'s plantings ordered by dateSown, filtering out other beds', async () => {
      await usePlantings.getState().addPlanting(
        planting({ bedId: 'bed-1', crop: 'Carrots', dateSown: new Date('2026-03-01') })
      );
      await usePlantings.getState().addPlanting(
        planting({ bedId: 'bed-1', crop: 'Beans', dateSown: new Date('2026-01-01') })
      );
      await usePlantings.getState().addPlanting(
        planting({ bedId: 'bed-1', crop: 'Peas', dateSown: new Date('2026-02-01') })
      );
      await usePlantings.getState().addPlanting(
        planting({ bedId: 'bed-2', crop: 'Onions', dateSown: new Date('2026-01-15') })
      );

      await usePlantings.getState().loadPlantings();
      const rotation = usePlantings.getState().plantingsInBed('bed-1');

      expect(rotation.map((p) => p.crop)).toEqual(['Beans', 'Peas', 'Carrots']);
    });

    it('plantingsByStatus filters to that status', async () => {
      await usePlantings.getState().addPlanting(planting({ status: 'planned' }));
      await usePlantings.getState().addPlanting(planting({ status: 'growing' }));
      await usePlantings.getState().loadPlantings();

      const growing = usePlantings.getState().plantingsByStatus('growing');

      expect(growing).toHaveLength(1);
      expect(growing[0].status).toBe('growing');
    });

    it('plantingsBySite filters to that site', async () => {
      await usePlantings.getState().addPlanting(planting({ siteId: 'site-1' }));
      await usePlantings.getState().addPlanting(planting({ siteId: 'site-2' }));
      await usePlantings.getState().loadPlantings();

      const site1 = usePlantings.getState().plantingsBySite('site-1');

      expect(site1).toHaveLength(1);
      expect(site1[0].siteId).toBe('site-1');
    });

    it('activePlantings excludes finished and failed', async () => {
      await usePlantings.getState().addPlanting(planting({ status: 'planned' }));
      await usePlantings.getState().addPlanting(planting({ status: 'growing' }));
      await usePlantings.getState().addPlanting(planting({ status: 'harvesting' }));
      await usePlantings.getState().addPlanting(planting({ status: 'finished' }));
      await usePlantings.getState().addPlanting(planting({ status: 'failed' }));
      await usePlantings.getState().loadPlantings();

      const active = usePlantings.getState().activePlantings();

      expect(active).toHaveLength(3);
      expect(active.map((p) => p.status).sort()).toEqual(['growing', 'harvesting', 'planned']);
    });
  });
});
