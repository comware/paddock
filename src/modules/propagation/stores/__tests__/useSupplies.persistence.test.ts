/**
 * The session-only id bug, for propagation supplies.
 *
 * Loading fills state with numeric ids; adding pushes a string one. So editing a supply
 * that was created earlier in the same session - before any reload - passes a string key
 * to Dexie, which matches nothing. It does not throw, and the store updates state either
 * way.
 *
 * Every assertion reads back out of the database. Asserting on store state would pass
 * against the broken code.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, propDb } from '@/lib/db';
import { useSupplies } from '../useSupplies';

const supply = () => ({
  name: 'Coco Coir',
  category: 'growing_medium' as const,
  purchaseDate: new Date('2026-01-01'),
  quantityPurchased: 10,
  unit: 'kg',
  totalCost: 50,
});

describe('supply edits persist within the session they were created in', () => {
  beforeEach(async () => {
    await db.open();
    await propDb.supplies.clear();
    useSupplies.setState({ rawSupplies: [], supplies: [], isLoading: false, error: null });
  });

  it('persists an edit to a supply added in this session', async () => {
    // No loadSupplies() in between - this is the whole point. The row is in state with
    // the string id that addSupply put there.
    const id = await useSupplies.getState().addSupply(supply());

    await useSupplies.getState().updateSupply(id, { totalCost: 75 });

    const stored = await propDb.supplies.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].totalCost).toBe(75);
  });

  it('persists a delete of a supply added in this session', async () => {
    const id = await useSupplies.getState().addSupply(supply());

    await useSupplies.getState().deleteSupply(id);

    expect(await propDb.supplies.count()).toBe(0);
  });
});
