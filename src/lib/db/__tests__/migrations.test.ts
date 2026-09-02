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
