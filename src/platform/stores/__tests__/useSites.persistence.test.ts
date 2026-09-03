/**
 * Real-database tests for site persistence.
 *
 * Deliberately separate from useSites.test.ts, which mirrors the store's logic into the
 * test file and asserts against the copy - it cannot see this bug and passes either way.
 *
 * Every assertion here reads back OUT of the database. Asserting on Zustand state would
 * pass against the broken code, because the store updates state optimistically whether or
 * not the write landed. That optimism is why this went unnoticed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, platformDb } from '@/lib/db';
import { useSites } from '../useSites';

const site = (name: string, isDefault = false) => ({
  name,
  latitude: -37.8,
  longitude: 144.9,
  timezone: 'Australia/Melbourne',
  isDefault,
  isIndoor: true,
  weatherEnabled: false,
});

describe('site changes persist to the database', () => {
  beforeEach(async () => {
    await db.open();
    await platformDb.sites.clear();
    localStorage.clear();
    useSites.setState({ sites: [], activeSiteId: null, isLoading: false, error: null });
  });

  it('persists a rename', async () => {
    const id = await useSites.getState().addSite(site('Home Greenhouse', true));
    await useSites.getState().loadSites();

    await useSites.getState().updateSite(id, { name: 'North Greenhouse' });

    // Read back out of the database, not out of the store.
    const stored = await platformDb.sites.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('North Greenhouse');
  });

  it('persists a delete', async () => {
    const id = await useSites.getState().addSite(site('Doomed', true));
    await useSites.getState().loadSites();

    await useSites.getState().deleteSite(id);

    expect(await platformDb.sites.count()).toBe(0);
  });

  it('unsets the previous default when a new one is added', async () => {
    await useSites.getState().addSite(site('First', true));
    await useSites.getState().loadSites();
    await useSites.getState().addSite(site('Second', true));

    const stored = await platformDb.sites.toArray();
    const defaults = stored.filter((s) => s.isDefault);
    // Two sites flagged default is the visible symptom of the write missing.
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe('Second');
  });
});
