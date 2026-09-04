# Vegetables Module: Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vegetables data layer usable — beds, plantings, and a harvest log you can
actually keep on a Saturday morning.

**Architecture:** Follows the propagation module's shape: flat routes, a `ModuleNav`, creation
via modals rather than separate routes, and card grids that collapse on mobile. Scoped to the
active site from `@/platform`, the way propagation is, rather than the site-centric routing
microgreens uses.

**Tech Stack:** React 19, React Router 6, TypeScript, Zustand, Tailwind, Vitest + Testing Library.

**Spec:** `docs/architecture/2026-09-03-enterprise-modules-design.md`
**Data layer:** merged — `src/modules/vegetables/{stores,utils}`

---

## Ordering, and why registration comes last

The module is registered in the navigation in the FINAL task, not the first. Until then it is
unreachable, which is correct: a nav entry leading to a page you cannot do anything on is
worse than no entry. By the time it appears, beds can be created, plantings recorded, and
harvests logged.

The same reasoning kept `vegetables` out of `useModulesStore` during the microgreens rename.

## What the data layer already gives you

Read `src/modules/vegetables/stores/` before starting. Summary:

| Store | Actions | Selectors |
|---|---|---|
| `useBeds` | `loadBeds`, `addBed`, `updateBed`, `deleteBed` | `bedsBySite`, `activeBeds` |
| `usePlantings` | `loadPlantings`, `addPlanting`, `updatePlanting`, `deletePlanting`, `setStatus`, `finish` | `plantingsInBed`, `plantingsByStatus`, `plantingsBySite`, `activePlantings`, `successionChain` |
| `useHarvests` | `loadForPlanting`, `logHarvest`, `updateHarvest`, `deleteHarvest` | `harvestsForPlanting`, `summaryFor` |

Behaviours the UI must respect rather than re-implement:

- **`deleteBed` refuses** when plantings reference the bed, setting `error` with a count. Show
  that message; do not pre-empt it with your own check that could drift.
- **`deletePlanting` cascades** to its harvests. Warn the user before calling it — say how many
  harvests will go with it.
- **`logHarvest` against a `finished` planting reopens it** and sets `lastReopenedPlantingId`.
  Surface that: "this planting was marked finished — reopened."
- **`logHarvest` against a `failed` planting is refused.** Show the store's error.
- **`summariseHarvests` returns per-unit totals.** Render every unit. Never sum across them,
  and never show only the first.

## Conventions

- Match the propagation module's component idiom — read `components/Stations/StationList.tsx`,
  `StationCard.tsx` and `StationForm.tsx` first. Creation and editing happen in a `Modal`.
- Shared pieces: `@/components/ui` (`Modal`, `ConfirmDialog`, `Tabs`), `@/components/shared`
  (`EmptyState`).
- The active site comes from `useSites` in `@/platform`.
- **Do not import from `@/modules/microgreens` or `@/modules/propagation`.** Vegetables is a
  sibling enterprise; sharing a component across them means extracting it to `@/components`
  first, which is out of scope here — say so rather than reaching across.
- Tests: render real components with Testing Library against the real stores and
  `fake-indexeddb`. Do not paste component logic into a test and assert against the copy —
  eight older store tests here do that and passed through every bug this session.

**Type-checking:** `npx tsc --noEmit` checks NOTHING in this repo (root `tsconfig.json` has
`"files": []`). Use `npm run build`, which runs `tsc -b`.

Baseline at the start: **1515 tests**, build exit 0, lint **63 errors / 21 warnings**.

---

### Task 1: Beds

**Files:** `src/modules/vegetables/components/Beds/{BedList,BedCard,BedForm,index}.tsx` and tests.

- [ ] **Step 1** — `BedForm`: a `Modal` for creating and editing. Fields: `name` (required),
  `lengthM`, `widthM`, `notes`, `isActive`. `siteId` comes from the active site, not a field.
  Show area (`lengthM × widthM`) as a computed hint when both are given — a market gardener
  thinks in bed metres.

- [ ] **Step 2** — `BedCard`: name, dimensions, active state, and **what is growing in it now**
  — the count of that bed's plantings whose status is `growing` or `harvesting`, from
  `usePlantings.plantingsInBed`. A bed's whole purpose is to hold something; a card that does
  not say what is in it is a card about nothing.

- [ ] **Step 3** — `BedList`: grid of cards, a filter for active/inactive/all, an
  `EmptyState` when there are none, and an "Add bed" button opening `BedForm`.

  Deleting: confirm first via `ConfirmDialog`, then call `deleteBed`. **If the store sets an
  error because plantings reference the bed, show that message** — do not swallow it and do
  not duplicate the check.

- [ ] **Step 4** — Tests, against real stores:
  - the list renders beds and shows an empty state when there are none
  - adding a bed through the form persists it (assert via `vegDb.beds`)
  - deleting a bed with a planting in it shows the store's refusal message and the bed stays
  - the card shows the count of what is growing in that bed

- [ ] **Step 5** — `npm test`, `npm run build`, `npm run lint` (63/21). Commit.

---

### Task 2: Plantings — list and form

**Files:** `src/modules/vegetables/components/Plantings/{PlantingList,PlantingCard,PlantingForm,index}.tsx` and tests.

- [ ] **Step 1** — `PlantingForm`: a `Modal`. Fields: `crop` (required), `variety`, `bedId`
  (select from active beds — required), `bedPortion`, `method` (`direct_sown` |
  `transplanted`), `dateSown` / `dateTransplanted` (show the one matching the method),
  `plantCount`, `spacingCm`, `expectedFirstHarvest`, `notes`.

  **Succession support:** when opened from an existing planting ("sow the next one"),
  pre-fill crop, variety, bed and spacing from it, and set `previousPlantingId`. That is the
  whole point of the succession link — measuring the interval against what it yielded.

- [ ] **Step 2** — `PlantingCard`: crop and variety, bed name, status, days since sowing, and
  for anything harvesting, the per-unit totals so far from `useHarvests.summaryFor`. Render
  every unit.

- [ ] **Step 3** — `PlantingList`: grid, filters for status / bed / crop, `EmptyState`, and
  "Add planting". Default to hiding `finished` and `failed` — a market gardener opening this
  view wants what is in the ground now — with a filter to show them.

- [ ] **Step 4** — Tests: renders and filters; adding persists; the default view excludes
  finished and failed; a succession pre-fills from its parent and links back.

- [ ] **Step 5** — Verify and commit.

---

### Task 3: Planting detail, and logging a harvest

**Files:** `src/modules/vegetables/components/Plantings/PlantingDetail.tsx`,
`components/Harvests/{HarvestLogModal,HarvestList,index}.tsx` and tests.

This is the screen the module exists for.

- [ ] **Step 1** — `HarvestLogModal`: date (defaulting to today), quantity, unit, quality
  grade, sellable, notes. Logging calls `useHarvests.logHarvest`.

  **After logging, check `lastReopenedPlantingId`.** If this planting was reopened, tell the
  user plainly — "this planting was marked finished, so it has been reopened" — rather than
  letting the status change happen invisibly.

  If the store sets an error (a pick against a `failed` planting), show it and keep the modal
  open with the entry intact. Losing someone's typing because the save was refused is its own
  small betrayal.

- [ ] **Step 2** — `HarvestList`: the picks in date order, each editable and deletable, with
  the running per-unit totals and `daysHarvesting` from `summaryFor`.

- [ ] **Step 3** — `PlantingDetail`: header with crop, variety, bed, status and dates; status
  actions (`setStatus`, `finish` with a reason); the harvest log; the succession chain from
  `successionChain` with links; and "sow the next one" opening `PlantingForm` pre-filled.

  Deleting a planting: `ConfirmDialog` that **says how many harvests will be deleted with
  it**, because the store cascades. Someone about to lose eight weeks of pick records should
  be told before, not after.

- [ ] **Step 4** — Tests:
  - logging a pick persists and appears in the list
  - logging against a finished planting reopens it AND the UI says so
  - logging against a failed planting shows the refusal and keeps the entry
  - the delete confirmation names the harvest count
  - the succession chain renders in order

- [ ] **Step 5** — Verify and commit.

---

### Task 4: Dashboard

**Files:** `src/modules/vegetables/components/Dashboard/{VegDashboard,index}.tsx` and tests.

The landing page. Answer what a grower wants on walking in:

- [ ] **Step 1** — What is ready or nearly ready: plantings whose `expectedFirstHarvest` has
  passed but which are not yet `harvesting`, and everything currently `harvesting`.
- [ ] **Step 2** — Beds in use versus beds free, from `activeBeds` and `plantingsInBed`.
- [ ] **Step 3** — Recent picks across all plantings, most recent first.
- [ ] **Step 4** — An `EmptyState` for a fresh install pointing at "add your first bed".
- [ ] **Step 5** — Tests for each panel. Verify and commit.

---

### Task 5: Make it reachable

Only now does the module appear.

**Files:** `src/modules/vegetables/{index.tsx,routes.tsx}`, `src/routes.tsx`,
`src/stores/useModulesStore.ts`, `src/components/ErrorBoundary.tsx`.

- [ ] **Step 1** — `routes.tsx`, following propagation's:

```
/vegetables                → VegDashboard
/vegetables/beds           → BedList
/vegetables/plantings      → PlantingList
/vegetables/plantings/:id  → PlantingDetail
```

- [ ] **Step 2** — `index.tsx` following `src/modules/propagation/index.tsx` exactly:
  `ModuleNav` with items for Dashboard, Beds and Plantings; wrapped in `ErrorBoundary` with
  `section="Vegetables Module"` and `module="vegetables"`.

- [ ] **Step 3** — Register:
  - `src/routes.tsx`: a lazy `VegetablesModule` and `path: 'vegetables/*'`
  - `src/stores/useModulesStore.ts`: add `'vegetables'` to `ModuleId` and a definition
    (`name: 'Vegetables'`, `path: '/vegetables'`, an icon, a description). **Not required** —
    nothing is, since the microgreens rename.
  - `src/components/ErrorBoundary.tsx`: add `'vegetables'` to the `module` prop union AND a
    `MODULE_NAV` entry. **Both.** They are matched by lowercased display name, and
    `ErrorBoundary.moduleNav.test.tsx` exists because that coupling broke silently once
    already — extend its `MODULE_PATHS` map so the new module is covered too.

- [ ] **Step 4** — Tests: the module id survives a `useModulesStore` round trip; the routes
  resolve; the error-boundary nav test covers vegetables.

- [ ] **Step 5** — Verify and commit.

---

### Task 6: Sweep

- [ ] Every store call goes through the module's stores, not `vegDb` directly from a component
- [ ] No imports from `@/modules/microgreens` or `@/modules/propagation`
- [ ] `npm test`, `npm run build`, `npm run lint` at 63/21
- [ ] Manual reasoning pass: from a fresh install, can you add a bed, sow a planting, log a
      pick, and see the total? Walk it and say so.

## Done when

A grower can add a bed, record a planting in it, log picks over weeks, see per-unit totals,
sow the next succession from the last one, and find all of it from the navigation.

## Not done here

- `plantingId` on `PropGraduation` (sub-project 4) — one optional field, once this is merged
- Soil tests, amendments, rotation planning — beds stay thin; the ids are there
- Analytics beyond the dashboard panels
