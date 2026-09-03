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
