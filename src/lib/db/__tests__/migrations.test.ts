import { describe, it, expect, afterEach } from 'vitest';
import Dexie from 'dexie';

describe('test harness', () => {
  const dbs: Dexie[] = [];
  afterEach(async () => {
    for (const d of dbs) { d.close(); await d.delete(); }
    dbs.length = 0;
  });

  it('can open a Dexie database and round-trip a row', async () => {
    const db = new Dexie('harness-check');
    dbs.push(db);
    db.version(1).stores({ things: '++id, name' });
    await db.open();

    await db.table('things').add({ id: 1, name: 'hello' });
    const rows = await db.table('things').toArray();

    expect(rows).toEqual([{ id: 1, name: 'hello' }]);
  });
});
