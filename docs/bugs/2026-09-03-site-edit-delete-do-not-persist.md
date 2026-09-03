# Editing or deleting a site does not persist

**Found:** 2026-09-03, during the platform-extraction review
**Status:** open, pre-existing on `main` — NOT introduced by `refactor/platform-extraction`
**Severity:** high — silent data loss from the user's point of view

## What happens

Rename a site, or delete one. The UI updates. Reload the page and the change is gone.

Nothing errors. Nothing is logged. The Zustand store updates in memory, so everything
looks correct right up until the next load.

## Why

`GrowSite.id` is typed `id?: string`, but the Dexie store is declared `++id` — numeric
autoincrement. So ids are **numbers** at runtime and **strings** at compile time.

`useSites.loadSites` papers over the gap, with a comment that names the problem exactly:

```ts
const rawSites = await platformDb.sites.toArray();
// Normalize IDs to strings (Dexie auto-increment returns numbers)
const sites = rawSites.map((s) => ({ ...s, id: String(s.id) }));
```

Those stringified ids are then handed straight back to Dexie as **keys**:

- `src/platform/stores/useSites.ts:69`  `platformDb.sites.update(currentDefault.id, ...)`
- `src/platform/stores/useSites.ts:111` `platformDb.sites.update(currentDefault.id, ...)`
- `src/platform/stores/useSites.ts:120` `platformDb.sites.update(id, ...)`
- `src/platform/stores/useSites.ts:135` `platformDb.sites.delete(id)`
- `src/platform/stores/useSites.ts:143` `platformDb.sites.update(newDefault.id!, ...)`

Dexie does not coerce key types. A string key never matches a numeric one.

## Reproduced

Against a clean store with the same schema:

```
added, runtime id = 1 (typeof number)
update(String(id)) matched rows: 0
rows remaining after delete(String(id)): 1
update(numeric id) matched rows: 1
```

`update` reports 0 rows modified and `delete` is a no-op. Both return without throwing,
which is why this has gone unnoticed.

## Why the tests did not catch it

`useSites.test.ts` copies the store's logic into the test file and asserts against the
copy. It never calls the real store and never touches a database, so it passes whether or
not `useSites` works. Seven other store tests share that shape.

Until `fake-indexeddb` was installed there was no `indexedDB` under test at all, so this
class of bug was structurally uncatchable.

## Fixing it

The mismatch, not the symptom, is the thing to fix. Options:

1. **Type the ids as numbers** — `id?: number` on `GrowSite`, `GrowWeatherHistory` and
   `GrowTimeEntry`, and delete the `String(s.id)` normalisation. Matches runtime. Ripples
   into every consumer comparing a site id to a string, including `localStorage`-persisted
   `activeSiteId`, which is a string by nature and would need `Number(...)` on read.
2. **Switch the stores to string primary keys** — drop `++id`, generate ids in
   application code. Matches the declared types and every other id in the schema, but is
   itself a data migration.

Option 2 is likely the better end state, since the rest of the codebase treats ids as
strings, but it is a migration and should not be bolted onto an unrelated branch.

Whichever is chosen, write the test first, against a real database — the bug is trivially
reproducible once a test can actually reach IndexedDB.

## Related

- The same mismatch exists for `growTimeEntries` and `growWeatherHistory`; only sites has
  been confirmed to misbehave in the UI, because it is the one with edit and delete.
- `refactor/platform-extraction` briefly narrowed the table declarations to
  `Table<GrowSite, string>`, which asserted the wrong key type as fact. That was reverted
  to the neutral `Table<GrowSite>` so this bug is no louder than it was.
