# Id Boundary Rollout Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the id boundary to the remaining stores, so a record created and then edited
in the same session actually saves.

**Architecture:** Ids are strings in application memory and numbers in IndexedDB.
`src/lib/db/keys.ts` converts. `useSites` already does this (Plan A); this plan replicates it
across thirteen stores holding forty key-operation call sites.

**Tech Stack:** TypeScript, Dexie 4, Zustand, Vitest, fake-indexeddb.

**Spec:** `docs/architecture/2026-09-03-id-convention-design.md`
**Precedent:** commit `9ab8ef6` — the `useSites` fix. Same shape, thirteen more times.

---

## The bug being fixed here

Distinct from the one Plan A fixed, and narrower.

Every store keeps two arrays: `rawX` straight from Dexie, and an enriched view derived from it.
Loading populates `rawX` with **numeric** ids. But `addX` pushes `{ ...x, id: String(id) }` into
that same array — a **string** id. So `rawX` holds a mix.

An id taken from state and passed to `.update()` or `.delete()` therefore works or fails
depending on whether the row came from the database or was added this session. A page reload
heals it, which is why it has gone unnoticed: **create a record, correct it before reloading,
and the correction is silently lost.** Sowing a tray and fixing its seed weight. Adding a
supply and correcting its cost. Neither errors; both appear to work.

The fix makes every id in state a string, and converts at each Dexie call.

## Per-store change

Three mechanical edits per store, all following `useSites`:

1. **Read** — map rows out of Dexie through `withId` (Task 1), so state is uniformly string.
2. **Add** — `String(id)` becomes `toId(id)`. Same result; one convention.
3. **Write** — every key argument wrapped in `toKey`.

**Note on repetition:** the pattern is shown in full once per task and then applied from an
exact file:line table. This is deliberate — thirteen verbatim repetitions of an identical
four-line diff would obscure the two stores that genuinely differ (`usePropagules`,
`conversations`), which are called out individually.

## File structure

| File | Change |
|---|---|
| `src/lib/db/keys.ts` | Add `withId` |
| `src/lib/db/__tests__/keys.test.ts` | Cover it |
| 6 grow stores | Read + add + write |
| 8 propagation stores | Read + add + write |
| `usePlannerStore.ts`, `lib/ai/conversations.ts` | Read + add + write |
| 2 new `*.persistence.test.ts` files | Prove the session-only bug, then its fix |

---

### Task 1: A helper for the read side

**Files:**
- Modify: `src/lib/db/keys.ts`, `src/lib/db/__tests__/keys.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/db/__tests__/keys.test.ts`:

```ts
import { withId } from '../keys';

describe('withId', () => {
  it('stringifies a numeric id', () => {
    expect(withId({ id: 42, name: 'Bed 3' })).toEqual({ id: '42', name: 'Bed 3' });
  });

  it('leaves a string id alone', () => {
    expect(withId({ id: '42', name: 'Bed 3' })).toEqual({ id: '42', name: 'Bed 3' });
  });

  it('does not mutate the row it was given', () => {
    const row = { id: 42, name: 'Bed 3' };
    withId(row);
    expect(row.id).toBe(42);
  });

  it('throws on a row with no id rather than producing "undefined"', () => {
    // A row without an id has not come from Dexie. Silently making it the string
    // "undefined" would give it an id that matches nothing - the same silence again.
    expect(() => withId({ name: 'Bed 3' } as { id?: number; name: string })).toThrow(/no id/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/keys.test.ts`
Expected: FAIL — `withId` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/db/keys.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/db/__tests__/keys.test.ts`
Expected: PASS, 15 tests (11 existing + 4 new).

- [ ] **Step 5: Export and commit**

Add `withId` to the existing `export { toKey, toId } from './keys';` line in `src/lib/db/index.ts`.

Run `npm test` — expect 1451 (1447 + 4). Report the actual number.

```bash
git add src/lib/db/keys.ts src/lib/db/__tests__/keys.test.ts src/lib/db/index.ts
git commit -m "feat(db): add withId for normalising rows out of Dexie

Stores hold a mix of numeric ids from loading and string ids from adding, so
an id taken from state works or fails depending on where the row came from."
```

---

### Task 2: Prove the session-only bug

As in Plan A: **these tests must FAIL, and be committed failing.** A green test here means the
task was done wrong. Do not touch any store in this task.

**Files:**
- Create: `src/modules/grow/stores/__tests__/useTrays.persistence.test.ts`
- Create: `src/modules/propagation/stores/__tests__/useSupplies.persistence.test.ts`

Two stores, one per module, chosen because they are the highest-traffic editable entities.

- [ ] **Step 1: Write the grow test**

Create `src/modules/grow/stores/__tests__/useTrays.persistence.test.ts`:

```ts
/**
 * The session-only id bug, for trays.
 *
 * Loading fills state with numeric ids; adding pushes a string one. So editing a tray that
 * was created earlier in the same session - before any reload - passes a string key to
 * Dexie, which matches nothing. It does not throw, and the store updates state either way.
 *
 * Every assertion reads back out of the database. Asserting on store state would pass
 * against the broken code.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, growDb } from '@/lib/db';
import { useTrays } from '../useTrays';

const tray = () => ({
  siteId: '1',
  trayNumber: 1,
  variety: 'Sunflower',
  dateSown: new Date('2026-01-01'),
  seedWeight: 50,
  growingMedium: 'coco_coir',
  preSoaked: true,
  blackoutDays: 3,
  problemsObserved: '',
  lessonsLearned: '',
});

describe('tray edits persist within the session they were created in', () => {
  beforeEach(async () => {
    await db.open();
    await growDb.trays.clear();
    useTrays.setState({ rawTrays: [], trays: [], isLoading: false, error: null });
  });

  it('persists an edit to a tray added in this session', async () => {
    // No loadTrays() in between - this is the whole point. The row is in state with the
    // string id that addTray put there.
    const id = await useTrays.getState().addTray(tray());

    await useTrays.getState().updateTray(id, { seedWeight: 65 });

    const stored = await growDb.trays.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].seedWeight).toBe(65);
  });

  it('persists a delete of a tray added in this session', async () => {
    const id = await useTrays.getState().addTray(tray());

    await useTrays.getState().deleteTray(id);

    expect(await growDb.trays.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Write the propagation test**

Create `src/modules/propagation/stores/__tests__/useSupplies.persistence.test.ts` with the
same shape, against `useSupplies` and `propDb.supplies`. Read
`src/modules/propagation/stores/useSupplies.ts` first to get the real signatures of
`addSupply`, `updateSupply`, `deleteSupply` and the required fields of a supply — do not
guess them. Assert that an edit to a supply added in the same session persists, and that a
delete removes the row.

- [ ] **Step 3: Run and confirm they FAIL**

Run both files. Expected: **FAIL — all four**, because the writes did not land (the stored
`seedWeight` is still 50; the count is still 1).

**Read the failure output and confirm the reason.** If any test fails on a setup error, a bad
signature or a missing field, fix the TEST and re-run until it fails for the right reason.

**If any test PASSES, STOP and report it.** Either the bug is not what we think for that
store, or the test is not reaching the real path. Do not adjust the test to force red.

- [ ] **Step 4: Commit red**

```bash
git add src/modules/grow/stores/__tests__/useTrays.persistence.test.ts src/modules/propagation/stores/__tests__/useSupplies.persistence.test.ts
git commit -m "test: show that same-session edits do not persist

Four failing tests. Editing a record created earlier in the same session
passes a string id to Dexie, which matches nothing and does not throw."
```

---

### Task 3: The grow stores

**Files (6):** `useTrays.ts`, `useObservations.ts`, `useTimeEntries.ts`, `useTrayComments.ts`,
`usePlannedPlantings.ts`, `useExperiment.ts` — all under `src/modules/grow/stores/`.

- [ ] **Step 1: Apply the pattern, shown here in full for `useTrays.ts`**

Import:

```ts
import { growDb, toKey, toId, withId, type GrowTray } from '@/lib/db';
```

Read path — line ~147:

```ts
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const rawTrays = (await growDb.trays.toArray()).map(withId);
      const trays = rawTrays.map(enrichTray);
```

Add path — line ~166, `String(id)` becomes `toId(id)`:

```ts
      const newTray = { ...tray, id: toId(id) } as GrowTray;
```

Write paths — wrap the key argument only:

```ts
      await growDb.trays.update(toKey(id), updatedData);        // ~183
      await growDb.trays.delete(toKey(id));                     // ~202
      growDb.trays.update(toKey(t.id!), { siteId: defaultSiteId, updatedAt: new Date() })  // ~317
```

- [ ] **Step 2: Apply the same three edits to the other five**

Exact key-op sites to wrap in `toKey`:

| File | Lines |
|---|---|
| `useObservations.ts` | 130 `update`, 145 `delete`, 166 `update` |
| `useTimeEntries.ts` | 190 `update`, 205 `delete`, 226 `update` |
| `useTrayComments.ts` | 89 `update`, 105 `delete` |
| `usePlannedPlantings.ts` | 147 `update`, 166 `delete` |
| `useExperiment.ts` | 108 `update(experiment.id, ...)`, 138 `update(decision.id, ...)` |

For each, also map its `toArray()` result through `withId` and change its `String(id)` on add
to `toId(id)`. Find the load and add sites by reading the file — do not assume they match
`useTrays`' line numbers.

`useObservations.ts` loads in more than one place (there is a second `.map` around line 243) —
check every `toArray()` in the file, not just the first.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/modules/grow/stores/__tests__/useTrays.persistence.test.ts`
Expected: PASS, 2 tests.

Run: `npm test` — the two propagation tests from Task 2 should still FAIL (Task 4 fixes those);
everything else passes. Report the numbers.

Run: `npm run build` — exit 0. Run: `npm run lint` — 63/21 baseline unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/modules/grow/stores
git commit -m "fix(grow): convert ids at the database boundary

Loading filled state with numeric ids while adding pushed strings, so editing
a record created in the same session passed a key Dexie could not match."
```

---

### Task 4: The propagation stores

**Files (8):** `useBatches.ts`, `usePropagules.ts`, `useStations.ts`, `useMotherPlants.ts`,
`useSupplies.ts`, `useSpeciesConfigs.ts`, `useGraduations.ts`, `useBatchCosts.ts` — all under
`src/modules/propagation/stores/`.

Same three edits. Key-op sites:

| File | Lines |
|---|---|
| `useBatches.ts` | 132 `update`, 150 `delete` |
| `useStations.ts` | 187 `update`, 219 `delete` |
| `useMotherPlants.ts` | 211 `update`, 230 `delete` |
| `useSupplies.ts` | 186 `update`, 206 `delete` |
| `useSpeciesConfigs.ts` | 232 `update`, 252 `delete` |
| `useGraduations.ts` | 242 `delete` |
| `useBatchCosts.ts` | 334 `delete(costId)` |
| `usePropagules.ts` | 69, 112, 130, 176, 184, 235 — **see below** |

- [ ] **Step 1: Apply the pattern to the seven straightforward stores**

Note several enrich functions live in sibling files (`useBatches.helpers.ts`,
`useStations.types.ts`, `usePropagules.types.ts`, `useGraduations.types.ts`). The `withId`
call goes at the `toArray()` site in the store, not in the sibling.

- [ ] **Step 2: `usePropagules.ts` needs care — it is the one that differs**

Six key operations, and two are foreign keys rather than the row's own id:

```ts
const batch = await propDb.batches.get(toKey(input.batchId));   // ~69  - FK as key
await propDb.propagules.update(toKey(id), updatedData);          // ~112
await propDb.propagules.delete(toKey(id));                       // ~130
await propDb.batches.update(toKey(batch.id!), { ... });           // ~176 - other table's id
try { await propDb.propagules.delete(toKey(id)); } catch {}       // ~184
await propDb.propagules.update(toKey(id), { stage: 'failed', updatedAt: new Date() }); // ~235
```

Line 69 takes `input.batchId` — a foreign key supplied by a caller, which may legitimately be
absent. `toKey` THROWS on `undefined`. Check whether `input.batchId` is optional in
`CreatePropaguleInput`; if it is, guard before converting rather than letting the throw
escape, and say so in your report.

Line 184 sits inside a `catch {}` that swallows errors. A `toKey` throw there would be
silently eaten — the exact failure mode this work exists to end. Note it in your report; do
not widen the catch.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/modules/propagation/stores/__tests__/useSupplies.persistence.test.ts`
Expected: PASS, 2 tests.

Run: `npm test` — expect **all** tests passing now, including the four from Task 2. Report the
count. Run `npm run build` and `npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/propagation/stores
git commit -m "fix(propagation): convert ids at the database boundary"
```

---

### Task 5: Planner and AI

**Files:** `src/modules/planner/stores/usePlannerStore.ts`, `src/lib/ai/conversations.ts`

- [ ] **Step 1: `usePlannerStore.ts`**

Same three edits. Read at ~100, add at ~119, key ops at 135 `update` and 153 `delete`.

- [ ] **Step 2: `conversations.ts` — already correct, make it consistent**

This file already coerces, with `parseInt(id, 10)` into a `numericId` local before each Dexie
call (lines ~84, 101, 134, 142). It is not broken. Replace `parseInt(id, 10)` with `toKey(id)`
so there is one convention rather than two, and so a bad id throws here as it does everywhere
else — `parseInt('abc', 10)` returns `NaN`, which Dexie silently fails to match.

Line ~169 `aiDb.messages.update(messages[0].id, ...)` takes an id read straight off a Dexie
row, so it is numeric and safe — wrap it in `toKey` anyway for uniformity, and confirm the
tests still pass.

Also map this file's `toArray()` results through `withId`.

- [ ] **Step 3: Verify and commit**

Run `npm test`, `npm run build`, `npm run lint`. All should be clean.

```bash
git add src/modules/planner/stores src/lib/ai/conversations.ts
git commit -m "fix(planner,ai): convert ids at the database boundary

conversations.ts already coerced with parseInt, which returns NaN on a bad id
and fails silently in Dexie. Now it throws like everywhere else."
```

---

### Task 6: Prove nothing was missed

- [ ] **Step 1: Sweep for unwrapped key operations**

```bash
grep -rnE "(growDb|propDb|plannerDb|platformDb|aiDb)\.[a-zA-Z]+\.(update|delete|get|bulkDelete)\(" \
  src --include=*.ts --include=*.tsx | grep -v __tests__ | grep -v "toKey("
```

Expected: **no output**, or only lines where the key demonstrably comes straight off a Dexie
row without passing through state (`useTheme.ts`, `lib/ai/service.ts` use
`.where(...).first()` results). List anything that remains and justify each one — do not
silently accept a hit.

- [ ] **Step 2: Sweep for un-normalised reads**

```bash
grep -rnE "await (growDb|propDb|plannerDb|platformDb|aiDb)\.[a-zA-Z]+\.toArray\(\)" \
  src --include=*.ts | grep -v __tests__ | grep -v "withId"
```

List each hit and say whether its ids reach a Dexie key operation. Read-only aggregations
(`useAnalytics.ts`, `useMediums.ts`) are fine unmapped; say so explicitly rather than
mapping them for tidiness.

- [ ] **Step 3: Final verification**

`npm test` (all passing), `npm run build` (exit 0), `npm run lint` (63/21 unchanged).

- [ ] **Step 4: Commit any stragglers found, then report**

---

## Done when

- All six persistence tests pass, and each passed only after its store was fixed
- Both sweeps in Task 6 come back clean or fully justified
- `npm test && npm run build && npm run lint` clean

## Not done here

- **The FK repair migration (Plan B).** This plan stops *new* pollution; it does not clean up
  foreign-key columns that already hold strings. Whether any do is a question about the data —
  run `scripts/diagnose-id-types.js` in the browser to find out before writing that migration.
- **The eight mirror-the-logic store tests.** They assert against a copy of each store's logic
  and cannot see any of this. They should be rewritten against real databases; that is its own
  piece of work.
- **The detail-route lookups.** `useParams` strings compared against state ids now work,
  because state is uniformly string after this plan. No change needed — but no test covers it
  either. Worth one.
