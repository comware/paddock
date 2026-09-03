/**
 * Schema migration helpers.
 *
 * Dexie cannot rename a store in place, so a rename is a copy into a new table followed -
 * in a later version - by dropping the old one.
 */

import type { Transaction } from 'dexie';

/**
 * Copy every row from one table to another, preserving primary keys.
 *
 * Keys must survive: `growTrays.siteId` and every other foreign key in the database point
 * at these ids, and a copy that renumbers them silently detaches every reference.
 *
 * Throws if the destination did not receive every row, which aborts the surrounding
 * version transaction. An upgrade that refuses to finish is recoverable; one that half
 * succeeds and drops the source later is not.
 *
 * Measures rows ADDED (the count delta across the bulkAdd), not the destination's total
 * row count - so this guard is correct even when pointed at a destination that already
 * holds unrelated rows.
 */
export async function copyTableRows(
  tx: Transaction,
  from: string,
  to: string
): Promise<number> {
  const rows = await tx.table(from).toArray();
  if (rows.length === 0) return 0;

  const before = await tx.table(to).count();
  await tx.table(to).bulkAdd(rows);
  const copied = (await tx.table(to).count()) - before;

  if (copied !== rows.length) {
    throw new Error(
      `Migration aborted: copied ${copied} of ${rows.length} rows from ${from} to ${to}`
    );
  }

  return copied;
}
