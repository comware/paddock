# Paddock: one id convention

**Date:** 2026-09-03
**Status:** Approved design, not yet implemented
**Supersedes:** the fix sketch in `docs/bugs/2026-09-03-site-edit-delete-do-not-persist.md`

## Summary

Every Dexie store in Paddock is declared `++id`, so primary keys are **numbers** at runtime.
All fifteen id-bearing interfaces declare `id?: string`. URLs, `localStorage` and React keys
are strings by nature. Nothing reconciles the two, so each store improvises.

This is one inconsistency with two opposite symptoms, which is why neither can be fixed
without deciding the other:

- **Writes fail** where a stringified id reaches Dexie as a key. Dexie does not coerce, so
  `update` matches zero rows and `delete` is a no-op. Neither throws.
- **Reads fail** where a `useParams()` string is compared to a numeric in-memory id.
  `"3" === 3` is false, so detail routes resolve to `undefined` after a reload.

Fixing the first by going numeric breaks the second. Fixing the second by going string
breaks the first. Hence a single decision rather than a pile of patches.

**The decision: strings are the application's id type; IndexedDB's are numbers; a thin
boundary converts.** Nothing above the database layer ever sees a numeric id.

## The bug as it stands

Confirmed against a real store:

```
added, runtime id = 1 (typeof number)
update(String(id)) matched rows: 0      <- silent no-op
delete(String(id)) -> row still present <- silent no-op
update(numeric id) matched rows: 1
```

Three failure profiles across the stores:

**Permanently broken — `src/platform/stores/useSites.ts`.** The only store that stringifies
on *read* (`:39`), so its ids are strings from the moment they load and every write misses:
`update` at `:120`, `delete` at `:135`, and the default-site writes at `:69`, `:111`, `:143`.
Renaming a site, deleting a site and changing the default all revert on reload. Two sites can
end up both flagged `isDefault`.

**Session-only broken — fifteen stores.** They load raw numerics but stringify on *add*, so a
row created and then edited before an intervening reload silently fails to save. Trays
(`useTrays.ts:183`, `:202`), planner events, supplies, stations, propagules, mother plants,
batches, batch costs, observations, time entries, tray comments, planned plantings,
experiments, species configs, graduations. Sowing a tray and correcting it in the same
session loses the correction, with the UI confirming success.

**Detail routes broken after reload.** `useParams()` gives a string; store selectors compare
with `===` against numeric state. `useSupplies.ts:322`, `useBatches.ts:321` and the same shape
behind `StationDetail`, `MotherPlantDetail`, `PropaguleDetail`, `EventDetail`,
`SiteDetailLayout`. `useSites` is the one that works here — because of the very stringify that
breaks its writes.

**Foreign keys are already polluted.** FK columns are stored values, not keys, so a row written
in-session holds a string FK while its neighbours hold numbers. `aiMessages.conversationId` is
the clearest case: a conversation started this session stores string FKs, and after a reload
`where('conversationId').equals(numericId)` finds none of its messages. Any fix needs a repair
pass, whichever direction it picks.

**One store already does it right.** `src/lib/ai/conversations.ts` coerces with
`parseInt(id, 10)` before every Dexie call. It is the existing proof the approach works.

## Decision

> **Inside IndexedDB, ids and foreign keys are numbers. In application memory, they are
> strings. Conversion happens only at the database boundary.**

Chosen over the alternatives:

**Not "numbers everywhere."** It matches runtime exactly and needs no conversion on read, which
is genuinely attractive. But it means changing all fifteen interfaces, coercing `useParams` in
~8 detail routes, and coercing every `localStorage` read — and one missed `Number()` silently
reintroduces the same class of bug in the same silent way. It also fights what the codebase has
already decided everywhere except the schema.

**Not "string primary keys in the database."** This looked best before the survey and is
actually the worst. Primary keys are referenced by stored foreign keys across 27 tables —
`growTrays.siteId`, `propBatches.motherPlantId`, `plannerEvents.trayId` and the rest. Changing
key type means remapping every FK value in one migration, with no downgrade path. The prize is
deleting a conversion helper; the risk is every relationship in the database.

**Not "fix `useSites` only."** It ships today and leaves silent data loss in trays and
propagation, leaves the detail routes broken, and leaves the vegetables module to be built on
an ambiguous convention — where its three new tables would inherit the defect on day one.

## The fix

Three parts. They must land together: parts 1 and 2 alone leave FK columns mixed.

### 1. A boundary that fails loud

New module `src/lib/db/keys.ts`:

```ts
/**
 * Convert an application id to a database key.
 *
 * Ids are strings above this line and numbers below it. Dexie does not coerce, so a string
 * key silently matches nothing - `update` reports zero rows and `delete` is a no-op, neither
 * throwing. That silence is the whole bug, so this throws rather than passing NaN down and
 * reproducing it one level deeper.
 */
export function toKey(id: string | number | undefined): number {
  const key = Number(id);
  if (!Number.isInteger(key)) {
    throw new Error(`Not a database key: ${JSON.stringify(id)}`);
  }
  return key;
}

/** The inverse, for reads. Kept as a named function so the boundary is greppable. */
export function toId(key: number | string): string {
  return String(key);
}
```

`Number.isInteger` rather than `isNaN` is deliberate: it rejects `NaN`, `undefined`, `""`,
`"abc"` and `1.5` alike. Every one of those would otherwise become a silent no-op.

### 2. Every store converts at its edges

- **On read:** every load maps rows through `toId`, as `useSites` already does. After this,
  in-memory ids are strings everywhere — which is what the interfaces have always claimed and
  what makes the detail routes work unchanged.
- **On write:** every `.update()`, `.delete()`, `.get()`, `.bulkDelete()` and
  `.where('id').equals()` wraps its key in `toKey`.
- **On foreign keys:** any FK written into a row goes through `toKey`; any FK used in
  `.where('someId').equals()` does too.

`src/lib/webmcp/proposals.ts:70-73` already documents this bug and routes around it with
`.where(...).modify()`. That comment can go once the boundary exists.

### 3. A repair migration for the polluted columns

A Dexie version that walks every FK column and normalises string values to numbers. Columns:

| Table | Columns |
|---|---|
| `weatherHistory` | `siteId` |
| `growTrays`, `growObservations`, `growTimeEntries` | `siteId` |
| `growPlannedPlantings` | `siteId`, `convertedTrayId` |
| `growTrayComments` | `trayId` |
| `aiMessages` | `conversationId` |
| `plannerEvents` | `siteId`, `trayId`, `batchId` |
| `propMotherPlants`, `propStations` | `siteId` |
| `propStationLogs` | `stationId` |
| `propBatches` | `siteId`, `stationId`, `motherPlantId` |
| `propPropagules` | `batchId`, `siteId`, `stationId` |
| `propStageTransitions`, `propGraduations` | `batchId`, `propaguleId` |
| `propBatchCosts` | `batchId`, `supplyId` |

Convert only values that are strings *and* parse to integers. A string FK that does not parse
is orphaned data the migration must not invent a target for — count and log those rather than
coercing them to `NaN`.

This runs after the platform extraction's version 12, so it is **version 13**, and the deferred
`growSites`/`growWeatherHistory` drop moves to version 14.

## Testing

The existing tests cannot catch this and must not be the model. `src/test/mocks/db.ts` seeds
`id: 'site-1'` and `` id: `tray-${...}` `` — string fixtures describing the world the types
claim rather than the one Dexie produces. Eight store tests assert against a copy of the
store's logic and never reach a database.

Every regression test here must:

- run against real `fake-indexeddb` (already installed, wired in `src/test/setup.ts`)
- **assert on the row count returned by `.update()`, not on store state.** Store state updates
  optimistically, which is exactly why this went unnoticed for so long. A test that checks
  `useSites.getState().sites` passes against the broken code.

Minimum coverage:

1. `updateSite` then reload from the database — the change persisted. Fails today.
2. `deleteSite` then reload — the row is gone. Fails today.
3. Setting a new default unsets the old one, verified after reload. Fails today.
4. Create-then-edit within one session, without an intervening load, for a representative
   session-only store (`useTrays`). Fails today.
5. A detail-route lookup by `useParams`-shaped string id resolves after a reload.
6. `toKey` throws on `undefined`, `""`, `"abc"` and `1.5`.
7. The repair migration converts string FKs to numbers, leaves numeric ones alone, and counts
   rather than mangles unparseable ones.

## Scope

In: the boundary helper, every store's read and write paths, the FK repair migration, and the
tests above.

Out:
- Changing primary keys to strings (rejected above).
- The `id?: string` interface declarations — they become *true* under this design and need no
  change.
- `useSites.test.ts` and the seven other mirror-the-logic store tests. They should be rewritten
  against real databases, but that is its own piece of work and bundling it here would hide
  this fix inside a much larger diff.

## Sequencing

Before the vegetables module. `VegBed`, `VegPlanting` and `VegHarvest` are specified with
`id?: string` against `++id` stores, so building them first triplicates this defect in a module
whose whole point is frequent editing — correcting a harvest weight, deleting a planting.

After `refactor/platform-extraction` merges, since that branch makes database behaviour
testable at all and this fix is untestable without it.
