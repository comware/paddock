# Vegetables Module: Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The data layer for growing vegetables in beds — beds, plantings, and harvests as
events — with the computed figures a market gardener actually asks for.

**Architecture:** Three tables at Dexie version 13. Plantings are the record you open; beds
are thin places; harvests are an append-only log, because vegetables are picked over weeks
and a total can always be summed from events while events can never be recovered from a
total. Every store follows the id boundary established in `src/lib/db/keys.ts`.

**Tech Stack:** TypeScript, Dexie 4, Zustand, Vitest, fake-indexeddb.

**Spec:** `docs/architecture/2026-09-03-enterprise-modules-design.md`

---

## Scope

This plan is the **data layer only** — schema, stores, computed fields, tests. No components,
no routes, no navigation entry. A second plan covers the UI.

Splitting here is deliberate: the data layer is fully testable on its own, and the design
decisions that are expensive to reverse (harvests as events, beds as thin rows, ids as
strings) all live in it. Getting them wrong under a half-built UI would be worse.

**Version numbering:** vegetables takes **13**. `schema.ts` currently reserves 13 in a comment
for the deferred `growSites`/`growWeatherHistory` drop; since vegetables ships first, that
comment must be updated to stop naming a specific number.

## The conventions this must follow

Established earlier and non-negotiable here — `src/lib/db/keys.ts`:

| Helper | Use |
|---|---|
| `toKey(id)` | An id used as a PRIMARY KEY — `.update(k)`, `.delete(k)`, `.get(k)`. Throws on bad input. |
| `toId(key)` | The key returned by `.add()`, so state holds a string |
| `withId(row)` | Every row read out of Dexie |
| `fkMatch(id)` | Foreign-key reads — `.where('xId').anyOf(fkMatch(id))` |

**Foreign keys are stored as strings**, because they are compared in memory against state
ids. `siteId`, `bedId`, `plantingId` and `previousPlantingId` are all strings and stay that
way. Only a foreign key used to look up the row it points at goes through `toKey`.

**Tests assert on what came back out of the database**, never on Zustand state. The store
updates optimistically whether or not a write landed — that is how four separate data-loss
bugs stayed hidden in this codebase.

## File structure

| File | Responsibility |
|---|---|
| `src/lib/db/schema.ts` (modify) | The three interfaces and version 13 |
| `src/modules/vegetables/types/index.ts` (create) | Enums, input types, computed types |
| `src/modules/vegetables/stores/useBeds.ts` (create) | Bed CRUD |
| `src/modules/vegetables/stores/usePlantings.ts` (create) | Planting lifecycle and successions |
| `src/modules/vegetables/stores/useHarvests.ts` (create) | The harvest log |
| `src/modules/vegetables/utils/harvestTotals.ts` (create) | Summing events into figures |
| `src/modules/vegetables/stores/index.ts` (create) | Barrel |
| `*/__tests__/*` (create) | Real-database tests per store, plus unit tests for the totals |

---

### Task 1: Schema and version 13

**Files:** `src/lib/db/schema.ts`, `src/lib/db/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/db/__tests__/schema.test.ts`:

```ts
describe('version 13 vegetables', () => {
  it('is at schema version 13', () => {
    expect(db.verno).toBe(13);
  });

  it('exposes the three vegetable tables', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('vegBeds');
    expect(names).toContain('vegPlantings');
    expect(names).toContain('vegHarvests');
  });

  it('indexes a planting by bed and sow date, so rotation history is a query', () => {
    // Beds stay thin precisely because "what was in bed 3 last season" is derivable.
    const indexes = db.table('vegPlantings').schema.indexes.map((i) => i.name);
    expect(indexes).toContain('[bedId+dateSown]');
  });

  it('exposes vegDb', () => {
    expect(vegDb.beds.name).toBe('vegBeds');
    expect(vegDb.plantings.name).toBe('vegPlantings');
    expect(vegDb.harvests.name).toBe('vegHarvests');
  });
});
```

Update the existing table-count test: it asserts `toHaveLength(27)` and is named for 27 —
both become 30, and the three new names go into `expectedTables` under a
`// Vegetables module (3 tables)` grouping comment. Update the `verno` assertions from 12
to 13 (there is more than one — check).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/schema.test.ts`
Expected: FAIL — `expected 12 to be 13`.

- [ ] **Step 3: Add the interfaces**

In `src/lib/db/schema.ts`, after the grow types, add a `VEGETABLES MODULE TYPES` section
matching the file's existing banner-comment style:

```ts
/**
 * A growing bed. Thin on purpose: a bed is a place, and what matters about it lives on the
 * plantings that reference it. Rotation history is a query over those plantings rather than
 * a field here - which is the whole reason a bed is a row and not a string on the planting.
 * Soil tests and amendments hang off this id when they are needed.
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
 * A block of one crop in one bed, sown or transplanted on one date. The record you open and
 * work in - the vegetable equivalent of a tray.
 *
 * Two plantings can share a bed at once, and a succession is just the next planting of the
 * same crop, linked back so the interval can be measured against what it yielded.
 *
 * No harvest fields here. Vegetables are picked over weeks, so harvests are their own
 * records and the totals are summed from them.
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
  proposedBy?: 'agent';         // Same provenance convention as growPlannedPlantings
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One pick. A total can always be summed from events; events can never be recovered from a
 * total - which is why this is a log and not two fields on the planting. It is also what
 * makes a yield curve over the life of a planting possible at all.
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

Add the table declarations to the class body in the existing style (no key type argument —
`Table<VegBed>`, matching how the others are declared).

Add version 13 after version 12:

```ts
    // Vegetables: beds, plantings, and harvests as an append-only log.
    //
    // Purely additive - no upgrade() body, because there is nothing to migrate. A grower
    // who never enables the module simply has three empty tables.
    this.version(13).stores({
      vegBeds: '++id, siteId, name, isActive, [siteId+isActive]',
      vegPlantings:
        '++id, siteId, bedId, crop, status, dateSown, [siteId+status], [bedId+dateSown], [crop+status]',
      vegHarvests: '++id, plantingId, date, [plantingId+date]',
    });
```

Add the convenience export beside the others:

```ts
export const vegDb = {
  beds: db.vegBeds,
  plantings: db.vegPlantings,
  harvests: db.vegHarvests,
};
```

**Also update the version-12 comment block.** It currently says "The drop lands as version 13
in the release AFTER this one has run against real data." Vegetables has taken 13, so change
it to say the drop lands in a later version without naming a number.

Export the three interfaces and `vegDb` from `src/lib/db/index.ts`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test` — report the count. Run `npm run build` (which runs `tsc -b`, the real type
check — `npx tsc --noEmit` checks nothing in this repo because the root tsconfig has
`"files": []`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db
git commit -m "feat(db): add the vegetables tables at version 13

Beds are thin because rotation history is a query over plantings, not a field.
Harvests are a log because vegetables are picked over weeks, and a total can
always be summed from events while events can never be recovered from a total.

Purely additive; version 13 was reserved in a comment for the deferred
growSites drop, which moves to a later number since vegetables ships first."
```

---

### Task 2: The harvest totals

Pure functions first, because they are the part with real logic and they need no database.

**Files:** `src/modules/vegetables/utils/harvestTotals.ts`, and its `__tests__`

- [ ] **Step 1: Write the failing tests**

Create `src/modules/vegetables/utils/__tests__/harvestTotals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summariseHarvests } from '../harvestTotals';
import type { VegHarvest } from '@/lib/db';

const pick = (over: Partial<VegHarvest> = {}): VegHarvest => ({
  plantingId: '1',
  date: new Date('2026-03-01'),
  quantity: 2,
  unit: 'kg',
  sellable: true,
  createdAt: new Date('2026-03-01'),
  ...over,
});

describe('summariseHarvests', () => {
  it('reports nothing picked for an empty log', () => {
    const s = summariseHarvests([]);
    expect(s.harvestCount).toBe(0);
    expect(s.totals).toEqual({});
    expect(s.firstHarvest).toBeUndefined();
    expect(s.lastHarvest).toBeUndefined();
    expect(s.daysHarvesting).toBe(0);
  });

  it('sums a single unit', () => {
    const s = summariseHarvests([pick({ quantity: 2 }), pick({ quantity: 3.5 })]);
    expect(s.totals).toEqual({ kg: 5.5 });
    expect(s.harvestCount).toBe(2);
  });

  it('keeps units apart rather than adding them together', () => {
    // A planting picked in both kg and bunches has no single meaningful total. Showing
    // one would be a number that means nothing.
    const s = summariseHarvests([
      pick({ quantity: 2, unit: 'kg' }),
      pick({ quantity: 6, unit: 'bunches' }),
    ]);
    expect(s.totals).toEqual({ kg: 2, bunches: 6 });
  });

  it('spans first to last pick, inclusive', () => {
    const s = summariseHarvests([
      pick({ date: new Date('2026-03-01') }),
      pick({ date: new Date('2026-03-15') }),
      pick({ date: new Date('2026-03-08') }),
    ]);
    expect(s.firstHarvest).toEqual(new Date('2026-03-01'));
    expect(s.lastHarvest).toEqual(new Date('2026-03-15'));
    expect(s.daysHarvesting).toBe(15); // inclusive of both ends
  });

  it('counts a single pick as one day, not zero', () => {
    const s = summariseHarvests([pick({ date: new Date('2026-03-01') })]);
    expect(s.daysHarvesting).toBe(1);
  });

  it('separates sellable from the rest', () => {
    const s = summariseHarvests([
      pick({ quantity: 4, sellable: true }),
      pick({ quantity: 1, sellable: false }),
    ]);
    expect(s.totals).toEqual({ kg: 5 });
    expect(s.sellableTotals).toEqual({ kg: 4 });
  });
});
```

- [ ] **Step 2** — Run, verify it fails on the missing module.

- [ ] **Step 3: Implement**

Create `src/modules/vegetables/utils/harvestTotals.ts`. Derive `HarvestSummary` from the
tests above: `totals` and `sellableTotals` keyed by unit, `harvestCount`, `firstHarvest`,
`lastHarvest`, `daysHarvesting`.

Write a doc comment explaining **why totals are per-unit** — a planting picked in both kg and
bunches has no single meaningful figure, and inventing one would be worse than showing two.

- [ ] **Step 4** — Run, verify green. **Step 5** — Commit.

---

### Task 3: `useBeds`

**Files:** `src/modules/vegetables/stores/useBeds.ts`, `__tests__/useBeds.test.ts`

Follow `src/modules/microgreens/stores/useSites.ts` for shape — it is the store most like
this one — and `src/platform/stores/useSites.ts` for the id boundary.

- [ ] **Step 1: Write real-database tests first**

Cover: adding a bed returns a string id; loading normalises ids; updating persists (read it
back from `vegDb.beds`, not from state); deleting persists; **deleting a bed that has live
plantings is refused** (the spec calls for this — a bed with plantings must not be silently
orphaned); `isActive` filtering.

Use `fake-indexeddb` via the existing setup. Model the file on
`src/modules/propagation/stores/__tests__/useSupplies.persistence.test.ts`.

- [ ] **Step 2-4** — Red, implement, green.

The store: `loadBeds`, `addBed`, `updateBed`, `deleteBed`, plus a `bedsBySite` selector. Ids
through `withId`/`toId`/`toKey` exactly as the other stores now do.

`deleteBed` must check for plantings referencing the bed and reject rather than orphan them.
Read `usePlantings` for that — if Task 4 has not landed yet, query `vegDb.plantings` directly
with `.where('bedId').anyOf(fkMatch(id))`.

- [ ] **Step 5** — Commit.

---

### Task 4: `usePlantings`

**Files:** `src/modules/vegetables/stores/usePlantings.ts`, `__tests__/`

- [ ] **Step 1: Write real-database tests first**

Cover:
- add / load / update / delete, all asserted against the database
- **deleting a planting deletes its harvests** — the spec requires a cascade here rather than
  the orphaning `useTrays.deleteTray` does with tray comments
- status transitions: `planned → growing → harvesting → finished`, and `failed` from any
- `finish(id, reason)` sets `dateFinished` and `finishReason`
- a succession: creating a planting with `previousPlantingId` links back, and a selector
  returns the chain in order
- `plantingsByBed` and `plantingsByStatus` selectors
- **rotation history**: what was in a given bed, ordered by `dateSown`, via the
  `[bedId+dateSown]` index — this is the query that justifies beds being thin, so it needs a
  test

- [ ] **Step 2-4** — Red, implement, green. **Step 5** — Commit.

---

### Task 5: `useHarvests`

**Files:** `src/modules/vegetables/stores/useHarvests.ts`, `__tests__/`

- [ ] **Step 1: Write real-database tests first**

Cover:
- logging a pick against a planting; loading them back by planting via
  `.where('plantingId').anyOf(fkMatch(id))`
- correcting a pick persists; deleting one persists
- **logging a pick against a `finished` planting is allowed, with the planting reopened to
  `harvesting`** — real picking runs past when you thought you were done, and blocking it
  would push people to falsify dates. The spec says allow with a warning; the store should
  surface that rather than silently swallow it
- the summary for a planting matches `summariseHarvests` over its picks

- [ ] **Step 2-4** — Red, implement, green. **Step 5** — Commit.

---

### Task 6: Barrel, and a sweep

- [ ] **Step 1** — `src/modules/vegetables/stores/index.ts` exporting the three stores and
  their state types; `types/index.ts` for shared enums and input types.

- [ ] **Step 2** — Sweep, reporting every hit with a verdict:

```bash
# every key op in the new module must be wrapped
grep -rnE "vegDb\.[a-zA-Z]+\.(update|delete|get|bulkDelete)\(" src/modules/vegetables --include=*.ts | grep -v "toKey("

# every read must be normalised
grep -rnE "await vegDb\.[a-zA-Z]+\.toArray\(\)" src/modules/vegetables --include=*.ts | grep -v withId

# foreign-key reads must be tolerant
grep -rnE "\.where\('(bedId|plantingId|siteId)'\)" -A2 src/modules/vegetables --include=*.ts | grep "equals("
```

All three should return nothing.

- [ ] **Step 3** — `npm test`, `npm run build`, `npm run lint` (63/21 baseline). Commit.

## Done when

- Three tables at version 13, and the existing suite is unaffected
- Each store's writes are proven against a real database
- Deleting a planting takes its harvests; deleting a bed with plantings is refused
- Rotation history for a bed is a working query
- Mixed-unit harvests report per-unit totals rather than one meaningless number

## Not done here

- **Components, routes, and the module registry entry.** A second plan. The module will not
  appear in the navigation until then — which is correct, since a nav entry pointing at
  nothing is worse than no entry.
- **`plantingId` on `PropGraduation`** (sub-project 4). One optional field, once plantings
  exist.
- **Soil tests, amendments, rotation planning.** Beds stay thin; the ids will be there.
