/**
 * The session-only id bug, for trays.
 *
 * Loading fills state with numeric ids; adding pushes a string one. So editing a tray that
 * was created earlier in the same session - before any reload - passes a string key to
 * Dexie, which matches nothing. It does not throw, and the store updates state either way.
 *
 * Every assertion reads back out of the database. Asserting on store state would pass
 * against the broken code.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, growDb } from '@/lib/db';
import { useTrays } from '../useTrays';

const tray = () => ({
  siteId: '1',
  trayNumber: 1,
  variety: 'Sunflower',
  dateSown: new Date('2026-01-01'),
  seedWeight: 50,
  growingMedium: 'coco_coir',
  preSoaked: true,
  blackoutDays: 3,
  problemsObserved: '',
  lessonsLearned: '',
});

describe('tray edits persist within the session they were created in', () => {
  beforeEach(async () => {
    await db.open();
    await growDb.trays.clear();
    useTrays.setState({ rawTrays: [], trays: [], isLoading: false, error: null });
  });

  it('persists an edit to a tray added in this session', async () => {
    // No loadTrays() in between - this is the whole point. The row is in state with the
    // string id that addTray put there.
    const id = await useTrays.getState().addTray(tray());

    await useTrays.getState().updateTray(id, { seedWeight: 65 });

    const stored = await growDb.trays.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].seedWeight).toBe(65);
  });

  it('persists a delete of a tray added in this session', async () => {
    const id = await useTrays.getState().addTray(tray());

    await useTrays.getState().deleteTray(id);

    expect(await growDb.trays.count()).toBe(0);
  });
});
