/**
 * The one place an id changes type.
 *
 * Ids are strings above this line - that is what every interface declares, what URLs and
 * localStorage hold, and what `useParams` hands back. They are numbers below it, because
 * every store is declared `++id`.
 *
 * Keeping the conversion in one named place makes the boundary greppable, which matters
 * because the failure mode is invisible: Dexie does not coerce key types, so a string key
 * matches nothing, `update` reports zero rows and `delete` does nothing - without throwing.
 */

/**
 * Convert an application id to a database key.
 *
 * Throws rather than returning NaN. A NaN key reproduces the exact bug this module exists
 * to end, one level deeper and even harder to see: `Number(undefined)` is NaN, and
 * `table.update(NaN, ...)` fails silently like any other non-matching key.
 */
export function toKey(id: string | number | undefined | null): number {
  const key = Number(id);
  if (id === null || id === '' || !Number.isInteger(key)) {
    throw new Error(`Not a database key: ${JSON.stringify(id)}`);
  }
  return key;
}

/** Convert a database key to an application id. */
export function toId(key: number | string): string {
  return String(key);
}

/**
 * Normalise a row's id to a string, for rows coming out of Dexie.
 *
 * Stores keep both a raw array and an enriched view. Loading fills the raw array with
 * numeric ids while adding pushes a string one, so the array holds a mix and an id taken
 * from it works or fails depending on where the row came from. Mapping every loaded row
 * through this makes state uniformly string, which is what the interfaces already declare.
 */
export function withId<T extends { id?: unknown }>(row: T): T & { id: string } {
  if (row.id === undefined || row.id === null) {
    throw new Error('Row has no id; it did not come from the database');
  }
  return { ...row, id: toId(row.id as number | string) };
}

/**
 * The key forms a foreign-key query must match while the database holds both.
 *
 * Foreign keys are stored as the application holds them - strings - because they are
 * compared in memory against state ids, which `withId` makes strings. Only a foreign key
 * used as a primary key (looking up the row it points at) goes through `toKey`.
 *
 * Foreign keys are stored values rather than keys, and legacy rows were written before this
 * rule was settled - some hold a number, some hold a string. Dexie does not coerce on
 * `.equals()`, so querying with one form silently hides every row stored in the other.
 *
 * Until a repair migration normalises the legacy numeric values to strings, reads have to
 * accept both.
 *
 * When that migration has run, this can be deleted and its call sites become plain string
 * equality. Grep for `fkMatch` to find them.
 */
export function fkMatch(id: string | number): [number, string] {
  return [toKey(id), toId(id)];
}
