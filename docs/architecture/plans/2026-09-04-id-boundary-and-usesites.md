# Id Boundary + useSites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the id conversion boundary, and use it to fix the one store that is
permanently broken — so renaming, deleting and re-defaulting a site actually persist.

**Architecture:** Ids are strings in application memory and numbers in IndexedDB. A helper
module converts at the boundary and throws rather than passing `NaN` down, because a bad key
in Dexie is a silent no-op and that silence is the entire bug. `useSites` already stringifies
on read, so it needs only the write side — which makes it the smallest possible proof of the
pattern before it is rolled out.

**Tech Stack:** TypeScript, Dexie 4, Zustand, Vitest, fake-indexeddb.

**Spec:** `docs/architecture/2026-09-03-id-convention-design.md`

---

## Scope

The spec covers three pieces of work. This plan is the first only:

| Plan | Covers | Ships |
|---|---|---|
| **A (this one)** | `toKey`/`toId` boundary; fix `useSites` | A working fix for the live bug |
| B | Version 13 repair migration for polluted FK columns | Data integrity across all tables |
| C | Roll the boundary out to the remaining 18 stores | Ends the session-only failures |

A is deliberately first and standalone: it fixes the only *permanently* broken store, and it
proves both the helper's shape and the testing approach before either is replicated 18 times.

## Before you start

**The existing store tests are not a model.** `src/platform/stores/__tests__/useSites.test.ts`
copies the store's logic into the test file and asserts against the copy — it never calls the
real store and never opens a database, so it passes whether or not `useSites` works. Seven other
stores do the same. `src/test/mocks/db.ts` seeds string ids (`id: 'site-1'`), describing the
world the types claim rather than the one Dexie produces.

**The critical testing rule for this plan:** assert on what came back **out of the database**,
or on the row count returned by `.update()`. Never on Zustand state. The store updates state
optimistically, which is precisely why this bug survived unnoticed.

## File structure

| File | Responsibility |
|---|---|
| `src/lib/db/keys.ts` (create) | `toKey`/`toId` — the only place ids change type |
| `src/lib/db/__tests__/keys.test.ts` (create) | Unit tests, especially the throwing cases |
| `src/platform/stores/useSites.ts` (modify) | Wrap its 5 Dexie key arguments in `toKey` |
| `src/platform/stores/__tests__/useSites.persistence.test.ts` (create) | Real-database regression tests. New file, so the existing mirror-logic test is left alone |

---

### Task 1: The conversion boundary

**Files:**
- Create: `src/lib/db/keys.ts`
- Test: `src/lib/db/__tests__/keys.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/db/__tests__/keys.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toKey, toId } from '../keys';

describe('toKey', () => {
  it('converts a string id to a numeric key', () => {
    expect(toKey('42')).toBe(42);
  });

  it('passes a number through', () => {
    expect(toKey(42)).toBe(42);
  });

  // Each of these would otherwise reach Dexie and match nothing, silently.
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['non-numeric', 'abc'],
    ['a uuid', 'a3f9c1e2'],
    ['a float', 1.5],
    ['NaN', NaN],
  ])('throws on %s rather than passing a bad key down', (_label, input) => {
    expect(() => toKey(input as string | number | undefined | null)).toThrow(/Not a database key/);
  });
});

describe('toId', () => {
  it('converts a numeric key to a string id', () => {
    expect(toId(42)).toBe('42');
  });

  it('is idempotent on a string', () => {
    expect(toId('42')).toBe('42');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/keys.test.ts`
Expected: FAIL — `Failed to resolve import "../keys"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/db/keys.ts`:

```ts
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
```

Note the explicit `id === null || id === ''` guard: `Number(null)` and `Number('')` are both
`0`, which is an integer and would otherwise pass.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/db/__tests__/keys.test.ts`
Expected: PASS, 11 tests (2 + 7 for `toKey`, 2 for `toId`).

- [ ] **Step 5: Export from the db barrel**

In `src/lib/db/index.ts`, add alongside the existing exports:

```ts
export { toKey, toId } from './keys';
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/keys.ts src/lib/db/__tests__/keys.test.ts src/lib/db/index.ts
git commit -m "feat(db): add the id conversion boundary

Ids are strings in the app and numbers in IndexedDB. toKey throws rather than
passing NaN down - a bad key in Dexie matches nothing without throwing, which
is the silence this module exists to end."
```

---

### Task 2: Prove useSites is broken

Write the failing tests before touching the store. They must fail against the CURRENT code —
that is what demonstrates the bug is real rather than theoretical.

**Files:**
- Create: `src/platform/stores/__tests__/useSites.persistence.test.ts`

- [ ] **Step 1: Write the regression tests**

Create `src/platform/stores/__tests__/useSites.persistence.test.ts`:

```ts
/**
 * Real-database tests for site persistence.
 *
 * Deliberately separate from useSites.test.ts, which mirrors the store's logic into the
 * test file and asserts against the copy - it cannot see this bug and passes either way.
 *
 * Every assertion here reads back OUT of the database. Asserting on Zustand state would
 * pass against the broken code, because the store updates state optimistically whether or
 * not the write landed. That optimism is why this went unnoticed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, platformDb } from '@/lib/db';
import { useSites } from '../useSites';

const site = (name: string, isDefault = false) => ({
  name,
  latitude: -37.8,
  longitude: 144.9,
  timezone: 'Australia/Melbourne',
  isDefault,
  isIndoor: true,
  weatherEnabled: false,
});

describe('site changes persist to the database', () => {
  beforeEach(async () => {
    await db.open();
    await platformDb.sites.clear();
    localStorage.clear();
    useSites.setState({ sites: [], activeSiteId: null, isLoading: false, error: null });
  });

  it('persists a rename', async () => {
    const id = await useSites.getState().addSite(site('Home Greenhouse', true));
    await useSites.getState().loadSites();

    await useSites.getState().updateSite(id, { name: 'North Greenhouse' });

    // Read back out of the database, not out of the store.
    const stored = await platformDb.sites.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('North Greenhouse');
  });

  it('persists a delete', async () => {
    const id = await useSites.getState().addSite(site('Doomed', true));
    await useSites.getState().loadSites();

    await useSites.getState().deleteSite(id);

    expect(await platformDb.sites.count()).toBe(0);
  });

  it('unsets the previous default when a new one is added', async () => {
    await useSites.getState().addSite(site('First', true));
    await useSites.getState().loadSites();
    await useSites.getState().addSite(site('Second', true));

    const stored = await platformDb.sites.toArray();
    const defaults = stored.filter((s) => s.isDefault);
    // Two sites flagged default is the visible symptom of the write missing.
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe('Second');
  });
});
```

- [ ] **Step 2: Run and confirm they FAIL**

Run: `npx vitest run src/platform/stores/__tests__/useSites.persistence.test.ts`

Expected: **FAIL — all three.** The rename test should show the name unchanged, the delete
test should show a count of 1, and the default test should show 2 defaults.

**If any of these PASSES, stop and report it.** A passing test here means either the bug is
not what the spec describes or the test is not reaching the real code path, and both change
what this plan should do. Do not proceed to Task 3 until you have seen all three fail for the
right reason — read the failure output and confirm it matches the descriptions above.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/platform/stores/__tests__/useSites.persistence.test.ts
git commit -m "test(platform): show that site edits do not persist

Three failing tests against a real database. The existing useSites test
asserts against a copy of the store's logic pasted into the test file, so it
passes either way and cannot see this."
```

Committing red is deliberate: the commit is evidence the bug was real, and the next commit
shows exactly what fixed it.

---

### Task 3: Fix useSites

**Files:**
- Modify: `src/platform/stores/useSites.ts` (5 call sites)

- [ ] **Step 1: Import the boundary**

Change the db import at the top of `src/platform/stores/useSites.ts`:

```ts
import { platformDb, toKey, toId, type GrowSite } from '@/lib/db';
```

- [ ] **Step 2: Use toId on read**

Line ~39 currently reads:

```ts
      // Normalize IDs to strings (Dexie auto-increment returns numbers)
      const sites = rawSites.map((s) => ({ ...s, id: String(s.id) }));
```

Replace with:

```ts
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const sites = rawSites.map((s) => ({ ...s, id: toId(s.id!) }));
```

- [ ] **Step 3: Use toKey on every write**

Wrap the key argument — and ONLY the key argument — at each of these five call sites. Line
numbers are approximate; match on the code:

```ts
// ~line 69 and ~line 111, both inside the "unset the previous default" branches:
await platformDb.sites.update(toKey(currentDefault.id), { isDefault: false });

// ~line 120, updateSite:
await platformDb.sites.update(toKey(id), { ...updates, updatedAt: new Date() });

// ~line 135, deleteSite:
await platformDb.sites.delete(toKey(id));

// ~line 143, promoting a new default after a delete:
platformDb.sites.update(toKey(newDefault.id!), { isDefault: true });
```

Do NOT change anything else in the file. `addSite` returning `toId(id)` is already correct in
substance — leave `String(id)` there or switch it to `toId(id)` for consistency, but change
no behaviour.

- [ ] **Step 4: Run the tests from Task 2**

Run: `npx vitest run src/platform/stores/__tests__/useSites.persistence.test.ts`
Expected: PASS, 3 tests — the same three that failed in Task 2.

- [ ] **Step 5: Run everything**

Run: `npm test`
Expected: PASS. Baseline is 1433; you added 11 in Task 1 and 3 in Task 2, so expect 1447.
Report the actual count and flag any test that changed status — particularly the existing
`useSites.test.ts`, which should be unaffected because it never calls the real store.

Run: `npm run build` — expect exit 0.
Run: `npm run lint` — expect the 63 errors / 21 warnings baseline, no new ones.

- [ ] **Step 6: Commit**

```bash
git add src/platform/stores/useSites.ts
git commit -m "fix(platform): make site edits actually persist

useSites stringified ids on read and passed those strings back to Dexie as
keys. Dexie does not coerce, so update matched no rows and delete did nothing
- neither throwing, and the store updated state optimistically either way, so
the UI confirmed a save that never happened.

Fixes the three tests added in the previous commit."
```

---

## Done when

- The three persistence tests pass, and passed only after Task 3
- `npm test && npm run build && npm run lint` all clean
- Renaming a site in the running app survives a reload

## Not done here

Deliberately out of scope — see the spec:

- **The 15 session-only broken stores.** Same defect, narrower window: they load raw numerics
  so a reload heals them, and only rows created and edited in one session are affected.
  Plan C.
- **The polluted FK columns.** Rows written in-session hold string foreign keys while their
  neighbours hold numbers; `aiMessages.conversationId` loses a conversation's history after a
  reload. Needs the version 13 repair migration. Plan B.
- **The eight mirror-the-logic store tests.** They should be rewritten against real databases.
  Bundling that here would bury a four-line fix inside a large diff.
