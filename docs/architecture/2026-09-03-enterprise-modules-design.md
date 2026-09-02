# Paddock: Enterprise Modules

**Date:** 2026-09-03
**Status:** Approved design, not yet implemented

## Summary

Paddock's modules are named after one crop type. `grow` is microgreens - trays,
blackout days, seed weight - but it also owns sites and weather, which every module
needs. `propagation` already reaches through it for `siteId`, which is the tell that the
boundary is in the wrong place.

This design splits Paddock into three enterprises over a thin shared platform:

- **microgreens** - trays, blackout, single harvest (today's `grow`, renamed and trimmed)
- **vegetables** - beds, successions, harvested over weeks (new)
- **propagation** - cuttings, rooting, graduation (unchanged)

One farm, one set of books. Enterprises are separate workflows, not separate businesses
with separate accounts. The exception is time, explained under *Decisions* below.

## Decisions

Each of these came out of the same test, and it is worth stating the test once because
it drove every call in this document:

> Deferring a feature is cheap when you can add it later against the same data. It is
> expensive when the data required to build it never existed. Judge by whether waiting
> destroys information, not by how likely the feature is.

Applied four times:

**1. Enterprise tag on time entries - build now.**
`GrowTimeEntry` holds a site, a date and a pile of minutes. Nothing links it to a tray or
a crop. Run two enterprises at one site and "45 minutes harvesting on Tuesday" is
ambiguous forever - it cannot be reconstructed from anything. Costs are recoverable from
receipts, a tray's yield is on the tray, but hours are gone. One optional field now; a
migration plus unrecoverable history later.

This does **not** mean per-enterprise books. No finance work, no reporting. Just don't
discard the attribution while capturing it is free.

**2. Beds are rows, not strings - build now.**
Rotation history is derivable: with `bedId` and dates on plantings, "what was in bed 3
last season" is a query. What is not derivable is bed-level state - compost applied,
soil test results, permanent irrigation. Those aren't needed yet, but they need an id to
hang off. A bed as free text means string-matching historical plantings later and living
with typos. As a row it makes every future bed feature purely additive.

This also matches the existing shape: `GrowTray` stores `siteId` against a real
`growSites` table, not a site name.

**3. Harvests are events, not totals - build now.**
A total can always be summed from events; events can never be recovered from a total.
Storing a running total on the planting would permanently cost the yield curve - the
thing that says whether a succession interval is right or whether a variety fades after
the third pick.

Auto-closing a planting on an expected end date was rejected: that is a prompt ("this
hasn't been picked in three weeks - finished?"), not a schema decision, and it can be
added later without encoding a guess in the data.

**4. Enterprise as a first-class entity - do not build.**
One farm, one set of books. `enterprise` appears as a field on time entries and nowhere
else. If per-enterprise P&L is ever wanted, the finance module can group by that field
plus the module each record already belongs to.

## Architecture

```
BEFORE                          AFTER
src/modules/                    src/modules/
  grow/         (91 files)        microgreens/     <- renamed, minus sites/weather
  propagation/  (159 files)       vegetables/      <- new
  planner/                        propagation/     <- unchanged
  settings/                       planner/
                                  settings/
                                src/platform/      <- new: sites + weather only
```

### What moves to `platform`

`growSites` and `growWeatherHistory`. Nothing else.

This is smaller than it first appears. `growObservations` looks crop-agnostic - it is
called an observation and holds mood, weather and learnings - but it carries
`traysBlackout`, `traysLight` and `traysHarvestedToday`. It is a microgreens daily log
wearing a generic name, and it stays with microgreens. `growTimeEntries` likewise: the
buckets are broadly farm tasks, but the table is microgreens-shaped today and moving it
buys nothing. Both can be generalised later if vegetables turns out to want the same
shape; neither is on the critical path.

### Module enablement

`useModulesStore` currently marks `grow` as `required: true`, with the comment "Every
other module either feeds it or reports on it." That stops being true here. A market
gardener running beds should not be forced to carry a microgreens module they never open.

- `grow` -> `microgreens`, `required` removed
- `vegetables` added
- `DEFAULT_ENABLED` stays a single module for a fresh install

Note the store is doing two jobs: a navigation preference ("which sections show") and an
implicit architectural dependency ("grow is the trunk"). Only the first is real. Removing
`required` collapses it back to one job.

## Data model

### Vegetables

```ts
/**
 * A growing bed. Thin on purpose: a bed is a place, and what matters about it lives on
 * the plantings that reference it. Rotation history is a query over those plantings
 * rather than a field here. Soil tests and amendments hang off this id when they're
 * needed - which is the whole reason a bed is a row and not a string on the planting.
 */
export interface VegBed {
  id?: string;
  siteId: string;
  name: string;                 // "Bed 3", "North tunnel 2"
  lengthM?: number;
  widthM?: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A block of one crop in one bed, sown or transplanted on one date. The record you open
 * and work in - the vegetable equivalent of a tray.
 *
 * Two plantings can share a bed at once, and a succession is just the next planting of
 * the same crop, linked back so the interval can be measured against what it yielded.
 *
 * No harvest fields here. Vegetables are picked over weeks, so harvests are their own
 * records and totals are summed from them.
 */
export interface VegPlanting {
  id?: string;
  siteId: string;
  bedId: string;
  bedPortion?: string;          // "north half" - free text; beds get subdivided ad hoc
  crop: string;
  variety?: string;
  method: 'direct_sown' | 'transplanted';
  dateSown?: Date;
  dateTransplanted?: Date;
  plantCount?: number;
  spacingCm?: number;
  expectedFirstHarvest?: Date;
  status: 'planned' | 'growing' | 'harvesting' | 'finished' | 'failed';
  dateFinished?: Date;          // Pulled, tilled in, or written off
  finishReason?: string;
  previousPlantingId?: string;  // Succession link
  proposedBy?: 'agent';         // Same provenance convention as planned plantings
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One pick. A total can always be summed from events; events can never be recovered from
 * a total - which is why this is a log and not two fields on the planting.
 */
export interface VegHarvest {
  id?: string;
  plantingId: string;
  date: Date;
  quantity: number;
  unit: 'kg' | 'g' | 'bunches' | 'count';
  qualityGrade?: 'A' | 'B' | 'C';
  sellable: boolean;
  notes?: string;
  createdAt: Date;
}
```

Vegetables gets **no planned-planting table**. `GrowPlannedPlanting` exists as a separate
table for microgreens because one plan spawns N trays and needs a `convertedTrayId`. For
vegetables one planned bed block is one planting, so a planting simply starts in `planned`
status and the WebMCP agent-proposal flow writes that row directly with `proposedBy`.

### Indexes

```ts
this.version(13).stores({
  vegBeds:      '++id, siteId, name, isActive, [siteId+isActive]',
  vegPlantings: '++id, siteId, bedId, crop, status, dateSown, [siteId+status], [bedId+dateSown], [crop+status]',
  vegHarvests:  '++id, plantingId, date, [plantingId+date]',
});
```

`[bedId+dateSown]` is what makes rotation history a cheap query rather than a stored
field - the index that lets beds stay thin.

### Computed, never stored

Following the existing `TrayWithComputed` pattern, these are derived on read and never
denormalised onto the planting: `totalHarvested`, `harvestCount`, `daysHarvesting`,
`daysSincePick`, `yieldPerBedM2`.

### Propagation link

`PropGraduation` already routes `sold` to a structured `saleReferenceId` but routes
`planted_garden` to a free-text `plantedLocation`. Add one optional field:

```ts
plantingId?: string;    // where 'planted_garden' points, when it's your own bed
```

Giving full traceability with no new tables:

```
mother plant -> batch -> rooted -> graduated -+- sold     -> saleReferenceId
                                              +- planted  -> plantingId -> bed -> picks
```

The link lives on the graduation rather than as a `propagationBatchId` on the planting for
three reasons: it is symmetric with `saleReferenceId`; the cardinality is right (a bed can
be topped up from several graduations and also direct-sown, so N->1 is true where 1->1 is
not); and it points the dependency from propagation to vegetables, so vegetables stays
standalone for a grower who never opens propagation.

Existing rows keep their `plantedLocation` text. Nothing is backfilled.

### Planner

`PlannerEventType` gains vegetable events alongside the existing grow and propagation
groups: `bed_prep`, `transplant`, and `harvest_window` (a recurring pick rather than the
single terminal `harvest` the grow events use).

## Sequencing

| # | Sub-project | Touches | Risk |
|---|---|---|---|
| 1 | Extract `platform` (sites + weather) | Dexie v11 rename, ~30 files outside grow | High - table rename with live data |
| 2 | Rename `grow` -> `microgreens`, drop `required` | imports, routes, `useModulesStore` | Low - mechanical, no data |
| 3 | Build `vegetables` | new tables v13, new module, planner events | Medium - all additive |
| 4 | `plantingId` on graduation | one optional field | Trivial |

Strictly 1 -> 2 -> 3 -> 4.

- **1 before 2** because renaming first means moving the sites and weather files twice.
- **1 before 3** because vegetables built first would attach to `growSites`, inheriting
  the exact wrong-prefix problem propagation already has.
- **2 before 3** because adding `vegetables` to the nav and dropping grow's `required`
  both live in 2, and vegetables is not reachable in the UI until that lands.

Each sub-project gets its own implementation plan. This document is the shared spec.

## Migration safety

Sub-project 1 is the only step that can lose data.

**The existing tests are not a template - do not follow them.** There are three
migration hooks (`useTrayMigration`, `useObservationMigration`, `useTimeEntryMigration`)
and each has a test file, but those files only assert that the module exports a function.
They contain no behavioural coverage. Eight store test files are worse: they copy the
store's logic into the test and assert against the copy, so they pass whether or not the
store works. `src/test/mocks/db.ts` claims to use `fake-indexeddb`, which is not installed.

Sub-project 1 must therefore start by making database behaviour testable at all -
installing `fake-indexeddb` and wiring it into `src/test/setup.ts` - before any table is
touched. This is the first task, not a nice-to-have: a rename with live data cannot be
verified against mirrored logic.

**Facade first.** `growDb` in `schema.ts` is a convenience export mapping friendly names
onto tables. Point `growDb.sites` at the renamed table during the transition so
sub-project 1 does not have to touch all ~30 call sites at once. Remove the facade in
sub-project 2, where the rename is already touching those imports.

**Renames are copy-then-delete, across two versions.** Dexie cannot rename a store
in place. Version 11 creates `sites` and `weatherHistory` and copies rows across in its
`upgrade()`, leaving the originals alone. Version 12 sets `growSites: null` and
`growWeatherHistory: null` to drop them.

Splitting this across two versions is deliberate. Copying from a table that the same
version is dropping is not reliable, and keeping the originals for a release means a bad
copy is recoverable rather than terminal. A browser jumping straight from 10 to 12 runs
both upgrades in order, so nothing is skipped. Vegetables tables move to version 13.

**Rollback.** IndexedDB has no downgrade path. Verify the copy count matches the source
count before dropping the old table, and fail the upgrade if it does not - an app that
refuses to start is recoverable, one that silently starts with half its sites is not.

## Error handling

- **Orphan references.** A bed deleted while plantings reference it, or a planting deleted
  with harvests attached. Do **not** copy the existing pattern here: `useTrays.deleteTray`
  deletes the tray only and leaves `growTrayComments` orphaned, and the presence of
  `migrateOrphanTrays` suggests orphans have already caused trouble once. Vegetables should
  cascade - deleting a planting deletes its harvests - and deleting a bed with live
  plantings should be refused rather than silently orphaning them. Retrofitting the same
  fix to trays is out of scope here but worth its own issue.
- **Harvest against a finished planting.** Allowed, with a warning. Real picking runs
  past when you thought you were done, and blocking it would push people to falsify dates.
- **Unit mixing.** A planting harvested in both `bunches` and `kg` cannot be totalled.
  Show per-unit subtotals rather than a wrong single number.
- **Missing enterprise on a time entry.** The field is optional and historical rows will
  not have it. Treat absent as unattributed and exclude from per-enterprise views rather
  than guessing.

## Testing

Mirrors the existing structure - `stores/__tests__`, `utils/__tests__`, `hooks/__tests__`.

**Sub-project 1 (highest value).** First install `fake-indexeddb` so tests exercise
a real database. Then: row counts and field integrity across the rename, a database
already at the new version left untouched on a second run, and an upgrade from 10 straight
to 12 landing the same result as 10 -> 11 -> 12. Write these against the real `db`, not a
mirrored copy of its logic.

**Sub-project 3.** Store tests for planting lifecycle transitions and succession linking.
Util tests for the computed fields, specifically: totals summed from an empty harvest
list, a single pick, many picks, and mixed units. Rotation-history queries against
`[bedId+dateSown]`.

**Sub-project 4.** A graduation with `outcome: 'planted_garden'` and a `plantingId`
resolves to a real planting; one with legacy `plantedLocation` text still loads.

## Out of scope

Deliberately not in this design:

- Per-enterprise books, P&L, or the finance module
- Soil tests, amendments, or rotation planning (beds stay thin; the ids will be there)
- Generalising the daily log or time entries to be crop-agnostic
- A shared harvest-event table across microgreens and vegetables. A tray is technically a
  planting with exactly one harvest, but microgreens works today and unifying buys nothing
  now. The units differ too - grams versus kilos, bunches and counts.
- Sales, markets and CRM, which already exist as intentions in `useModulesStore`
