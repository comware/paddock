import { describe, it, expect, afterEach } from 'vitest';
import Dexie, { type Transaction } from 'dexie';
import { copyTableRows } from '../migrations';

describe('copyTableRows', () => {
  const dbs: Dexie[] = [];
  afterEach(async () => {
    for (const d of dbs) { d.close(); await d.delete(); }
    dbs.length = 0;
  });

  async function makeDb(name: string) {
    const db = new Dexie(name);
    dbs.push(db);
    db.version(1).stores({ from: '++id, name', to: '++id, name' });
    await db.open();
    return db;
  }

  it('copies every row and preserves ids exactly', async () => {
    const db = await makeDb('copy-preserves');
    await db.table('from').bulkAdd([
      { id: 1, name: 'alpha' },
      { id: 7, name: 'beta' },
    ]);

    await db.transaction('rw', db.table('from'), db.table('to'), async (tx) => {
      await copyTableRows(tx, 'from', 'to');
    });

    const rows = await db.table('to').orderBy('id').toArray();
    expect(rows).toEqual([
      { id: 1, name: 'alpha' },
      { id: 7, name: 'beta' },
    ]);
  });

  it('copies an empty table without error', async () => {
    const db = await makeDb('copy-empty');

    await db.transaction('rw', db.table('from'), db.table('to'), async (tx) => {
      await copyTableRows(tx, 'from', 'to');
    });

    expect(await db.table('to').count()).toBe(0);
  });

  it('aborts the transaction on a real key collision during the copy', async () => {
    const db = await makeDb('copy-short');
    await db.table('from').bulkAdd([{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }]);
    // Pre-seed a colliding id so bulkAdd itself fails partway through.
    await db.table('to').add({ id: 2, name: 'squatter' });

    // Dexie 4's bulkAdd throws a BulkError on a key collision rather than silently
    // writing fewer rows than requested, so this exercises the abort path but not the
    // count-check guard itself - that is covered separately below with a fake table.
    await expect(
      db.transaction('rw', db.table('from'), db.table('to'), async (tx) => {
        await copyTableRows(tx, 'from', 'to');
      })
    ).rejects.toThrow(/bulkAdd/);

    // The transaction rolled back: the pre-seeded row is untouched and nothing else landed.
    const rows = await db.table('to').toArray();
    expect(rows).toEqual([{ id: 2, name: 'squatter' }]);
  });

  it('throws naming the shortfall when the destination ends up with fewer rows than copied', async () => {
    // bulkAdd cannot be made to silently drop a row under real IndexedDB semantics (a
    // collision throws immediately, per the test above), so this exercises the count-check
    // guard directly against a minimal fake Transaction rather than a real Dexie one.
    const rows = [{ id: 1 }, { id: 2 }];
    const fakeTx = {
      table: (name: string) => {
        if (name === 'from') return { toArray: async () => rows };
        if (name === 'to') return { bulkAdd: async () => undefined, count: async () => 1 };
        throw new Error(`unexpected table: ${name}`);
      },
    } as unknown as Transaction;

    await expect(copyTableRows(fakeTx, 'from', 'to')).rejects.toThrow(/copied 1 of 2/);
  });
});

describe('v10 to v11 upgrade', () => {
  const NAME = 'upgrade-fixture';
  afterEach(async () => { await Dexie.delete(NAME); });

  it('carries sites across with their ids intact', async () => {
    // Open at version 10 with the pre-extraction schema and seed it.
    const old = new Dexie(NAME);
    old.version(10).stores({
      growSites: '++id, &name, isDefault',
      growWeatherHistory: '++id, siteId, date, [siteId+date]',
    });
    await old.open();
    await old.table('growSites').add({
      id: 42, name: 'Home Greenhouse', latitude: -37.8, longitude: 144.9,
      timezone: 'Australia/Melbourne', isDefault: true, isIndoor: true,
      weatherEnabled: false, createdAt: new Date(0), updatedAt: new Date(0),
    });
    await old.table('growWeatherHistory').add({
      id: 1, siteId: 42, date: new Date(0), temperature: 12, humidity: 70,
      conditions: 'Clear', source: 'manual', fetchedAt: new Date(0), createdAt: new Date(0),
    });
    old.close();

    // Reopen declaring version 11, which triggers the upgrade.
    const next = new Dexie(NAME);
    next.version(10).stores({
      growSites: '++id, &name, isDefault',
      growWeatherHistory: '++id, siteId, date, [siteId+date]',
    });
    next.version(11)
      .stores({ sites: '++id, &name, isDefault', weatherHistory: '++id, siteId, date, [siteId+date]' })
      .upgrade(async (tx) => {
        await copyTableRows(tx, 'growSites', 'sites');
        await copyTableRows(tx, 'growWeatherHistory', 'weatherHistory');
      });
    await next.open();

    const sites = await next.table('sites').toArray();
    expect(sites).toHaveLength(1);
    // The id must survive: growTrays.siteId points at it.
    expect(sites[0].id).toBe(42);
    expect(sites[0].name).toBe('Home Greenhouse');

    const weather = await next.table('weatherHistory').toArray();
    expect(weather).toHaveLength(1);
    expect(weather[0].siteId).toBe(42);

    // Originals still present for the recovery window.
    expect(await next.table('growSites').count()).toBe(1);
    next.close();
  });

  it('is a no-op on a database already at version 11', async () => {
    const build = () => {
      const d = new Dexie(NAME);
      d.version(10).stores({ growSites: '++id, &name, isDefault', growWeatherHistory: '++id, siteId, date, [siteId+date]' });
      d.version(11)
        .stores({ sites: '++id, &name, isDefault', weatherHistory: '++id, siteId, date, [siteId+date]' })
        .upgrade(async (tx) => {
          await copyTableRows(tx, 'growSites', 'sites');
          await copyTableRows(tx, 'growWeatherHistory', 'weatherHistory');
        });
      return d;
    };

    const first = build();
    await first.open();
    await first.table('sites').add({ id: 1, name: 'Only', isDefault: true });
    first.close();

    const second = build();
    await second.open();
    expect(await second.table('sites').count()).toBe(1);
    second.close();
  });

  it('carries data when a browser jumps from 10 straight to 12', async () => {
    const NAME = 'jump-fixture';
    const old = new Dexie(NAME);
    old.version(10).stores({ growSites: '++id, &name, isDefault' });
    await old.open();
    await old.table('growSites').add({ id: 9, name: 'Jumped', isDefault: true });
    old.close();

    const next = new Dexie(NAME);
    next.version(10).stores({ growSites: '++id, &name, isDefault' });
    next.version(11)
      .stores({ sites: '++id, &name, isDefault' })
      .upgrade(async (tx) => { await copyTableRows(tx, 'growSites', 'sites'); });
    next.version(12).stores({ growSites: null });
    await next.open();

    const sites = await next.table('sites').toArray();
    expect(sites).toHaveLength(1);
    expect(sites[0].id).toBe(9);
    expect(next.tables.map((t) => t.name)).not.toContain('growSites');

    next.close();
    await Dexie.delete(NAME);
  });
});
