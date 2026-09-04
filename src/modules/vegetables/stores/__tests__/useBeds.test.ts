/**
 * useBeds - tested against a real (fake-indexeddb) database, never against store state.
 *
 * Every assertion reads back out of vegDb.beds (or vegDb.plantings for the delete guard).
 * That is the point: the store updates optimistically whether or not a write landed, so
 * asserting against Zustand state would pass against broken code just as easily as working
 * code. See useSupplies.persistence.test.ts for the same discipline applied elsewhere.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, vegDb, type VegBed, type VegPlanting } from '@/lib/db';
import { useBeds } from '../useBeds';

const bed = (overrides: Partial<Omit<VegBed, 'id' | 'createdAt' | 'updatedAt'>> = {}) => ({
  siteId: 'site-1',
  name: 'Bed 1',
  isActive: true,
  ...overrides,
});

const planting = (bedId: string): Omit<VegPlanting, 'id'> => ({
  siteId: 'site-1',
  bedId,
  crop: 'Carrots',
  method: 'direct_sown',
  status: 'growing',
  notes: '',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

describe('useBeds', () => {
  beforeEach(async () => {
    await db.open();
    await vegDb.beds.clear();
    await vegDb.plantings.clear();
    useBeds.setState({ beds: [], isLoading: false, error: null });
  });

  it('addBed returns a string id, and the row is in the database', async () => {
    const id = await useBeds.getState().addBed(bed({ name: 'Bed 3' }));

    expect(typeof id).toBe('string');

    const stored = await vegDb.beds.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Bed 3');
  });

  it('loadBeds normalises ids to strings', async () => {
    await useBeds.getState().addBed(bed());

    await useBeds.getState().loadBeds();

    const loaded = useBeds.getState().beds;
    expect(loaded).toHaveLength(1);
    expect(typeof loaded[0].id).toBe('string');
  });

  it('updateBed persists', async () => {
    const id = await useBeds.getState().addBed(bed({ name: 'Bed 1' }));

    await useBeds.getState().updateBed(id, { name: 'Bed 1 (renamed)' });

    const stored = await vegDb.beds.toArray();
    expect(stored[0].name).toBe('Bed 1 (renamed)');
  });

  it('deleteBed persists when nothing references the bed', async () => {
    const id = await useBeds.getState().addBed(bed());

    await useBeds.getState().deleteBed(id);

    expect(await vegDb.beds.count()).toBe(0);
  });

  it('deleteBed refuses when plantings reference the bed', async () => {
    const id = await useBeds.getState().addBed(bed());
    await vegDb.plantings.add(planting(id) as VegPlanting);

    await useBeds.getState().deleteBed(id);

    const stored = await vegDb.beds.toArray();
    expect(stored).toHaveLength(1);
    expect(await vegDb.plantings.count()).toBe(1);
    expect(useBeds.getState().error).toBeTruthy();
  });

  it('bedsBySite returns only that site\'s beds', async () => {
    await useBeds.getState().addBed(bed({ siteId: 'site-1', name: 'Site 1 Bed' }));
    await useBeds.getState().addBed(bed({ siteId: 'site-2', name: 'Site 2 Bed' }));
    await useBeds.getState().loadBeds();

    const site1Beds = useBeds.getState().bedsBySite('site-1');

    expect(site1Beds).toHaveLength(1);
    expect(site1Beds[0].name).toBe('Site 1 Bed');
  });

  it('persists an edit to a bed added in this session, without an intervening loadBeds()', async () => {
    // No loadBeds() in between - this is the whole point. The row is in state with the
    // string id that addBed put there, and updateBed must key its write off that id
    // correctly rather than a numeric one that only loadBeds() would have produced.
    const id = await useBeds.getState().addBed(bed({ name: 'Fresh Bed' }));

    await useBeds.getState().updateBed(id, { name: 'Fresh Bed (edited)' });

    const stored = await vegDb.beds.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Fresh Bed (edited)');
  });
});
