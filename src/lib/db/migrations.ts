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

/**
 * Throw unless every row in `from` is already present in `to`, by primary key.
 *
 * The guard that runs immediately before a table is dropped. The copy happened a release
 * earlier, in a transaction that could not have half-succeeded - but "could not have" is a
 * claim about code, and this is a claim about the database actually in front of us. There
 * is no downgrade path in IndexedDB, so the only safe order is prove, then drop.
 *
 * A failure aborts the version transaction and leaves both tables in place. The grower is
 * stuck on the old version, which is recoverable; dropping rows that were never copied is
 * not.
 */
export async function assertRowsCopied(
  tx: Transaction,
  from: string,
  to: string
): Promise<void> {
  const source = await tx.table(from).toArray();
  if (source.length === 0) return;

  const present = new Set(await tx.table(to).toCollection().primaryKeys());
  const missing = source.filter((row) => !present.has(row.id));

  if (missing.length > 0) {
    throw new Error(
      `Migration aborted: ${missing.length} of ${source.length} rows in ${from} are not in ` +
        `${to}. Both tables have been left in place. Ids: ${missing
          .slice(0, 10)
          .map((r) => r.id)
          .join(', ')}`
    );
  }
}
