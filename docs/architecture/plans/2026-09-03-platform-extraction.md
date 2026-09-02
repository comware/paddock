# Platform Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `growSites` and `growWeatherHistory` out from under the grow module into a
shared `platform`, without losing a row.

**Architecture:** Dexie cannot rename a store in place. Version 11 creates `sites` and
`weatherHistory` and copies rows across; version 12 drops the originals a release later,
so a bad copy is recoverable. The `growDb` facade is re-pointed at the new tables so the
nine files that touch the database directly keep working, and `useSites`/`useWeather` move
to `src/platform` with re-exports so the twenty-eight files that import them do not change
at all.

**Tech Stack:** TypeScript, Dexie 4, Zustand, Vitest (happy-dom), fake-indexeddb.

**Spec:** `docs/architecture/2026-09-03-enterprise-modules-design.md`

---

## Before you start

The existing tests in this repo are not a guide. `useTrayMigration.test.ts` only asserts
that the module exports a function; eight store tests assert against a copy of the store's
logic pasted into the test file. Do not imitate either pattern. Task 1 exists because
database behaviour is currently untestable here.

## File structure

| File | Responsibility |
|---|---|
| `src/test/setup.ts` (modify) | Install `fake-indexeddb` so Dexie works under test |
| `src/test/mocks/db.ts` (modify) | Remove the false claim that it already uses fake-indexeddb |
| `src/lib/db/migrations.ts` (create) | `copyTableRows` - the one piece of migration logic worth testing in isolation |
| `src/lib/db/__tests__/migrations.test.ts` (create) | Behavioural tests for the copy, against a real IndexedDB |
| `src/lib/db/schema.ts` (modify) | Versions 11 and 12; `platformDb`; re-pointed `growDb` facade |
| `src/lib/db/__tests__/schema.test.ts` (modify) | Version number and table list expectations |
| `src/platform/stores/useSites.ts` (move) | Site store, unchanged logic |
| `src/platform/hooks/useWeather.ts` (move) | Weather hook, unchanged logic |
| `src/platform/index.ts` (create) | Public surface of the platform module |
| `src/modules/grow/stores/index.ts` (modify) | Re-export `useSites` from platform |
| `src/modules/grow/hooks/index.ts` (modify) | Re-export `useWeather` from platform |

---

### Task 1: Make database behaviour testable

**Files:**
- Modify: `src/test/setup.ts`
- Modify: `src/test/mocks/db.ts:5` (the comment)
- Test: `src/lib/db/__tests__/migrations.test.ts` (created here, filled in Task 2)

- [ ] **Step 1: Install the dependency**

```bash
npm install --save-dev fake-indexeddb
```

- [ ] **Step 2: Write a test that needs a real IndexedDB**

Create `src/lib/db/__tests__/migrations.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import Dexie from 'dexie';

describe('test harness', () => {
  const dbs: Dexie[] = [];
  afterEach(async () => {
    for (const d of dbs) { d.close(); await d.delete(); }
    dbs.length = 0;
  });

  it('can open a Dexie database and round-trip a row', async () => {
    const db = new Dexie('harness-check');
    dbs.push(db);
    db.version(1).stores({ things: '++id, name' });
    await db.open();

    await db.table('things').add({ id: 1, name: 'hello' });
    const rows = await db.table('things').toArray();

    expect(rows).toEqual([{ id: 1, name: 'hello' }]);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run src/lib/db/__tests__/migrations.test.ts`
Expected: FAIL — Dexie cannot find an `indexedDB` implementation under happy-dom.

- [ ] **Step 4: Wire fake-indexeddb into the setup file**

In `src/test/setup.ts`, add this import as the **first** import in the file, above
`@testing-library/jest-dom/vitest`. It must run before any module reaches for `indexedDB`:

```ts
// Dexie needs a real IndexedDB. happy-dom does not provide one, so tests that touch the
// database silently had no way to run - which is why the migration hooks here are only
// covered by tests asserting that they export a function. This makes database behaviour
// testable for real.
import 'fake-indexeddb/auto';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/__tests__/migrations.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 6: Fix the false comment in the mocks file**

In `src/test/mocks/db.ts`, replace line 5:

```
 * Uses fake-indexeddb under the hood for realistic behavior.
```

with:

```
 * These are plain in-memory fixtures and fakes - they do not touch IndexedDB. For tests
 * that need real database behaviour, use the `db` instance directly; `src/test/setup.ts`
 * installs fake-indexeddb globally.
```

- [ ] **Step 7: Confirm nothing else broke**

Run: `npm test`
Expected: PASS. Note the total test count — later tasks should not reduce it.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/test/setup.ts src/test/mocks/db.ts src/lib/db/__tests__/migrations.test.ts
git commit -m "test: give Dexie a real IndexedDB under test

happy-dom provides no indexedDB, so nothing touching the database could be
tested. That is why the migration hooks are covered only by tests asserting
they export a function. Needed before renaming a table with live data in it."
```

---

### Task 2: The row copy

**Files:**
- Create: `src/lib/db/migrations.ts`
- Test: `src/lib/db/__tests__/migrations.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the `harness check` describe block in `src/lib/db/__tests__/migrations.test.ts`
with (keep the imports and the `afterEach` cleanup):

```ts
import { copyTableRows } from '../migrations';

describe('copyTableRows', () => {
  const dbs: Dexie[] = [];
  afterEach(async () => {
    for (const d of dbs) { d.close(); await d.delete(); }
    dbs.length = 0;
  });

  async function makeDb(name: string) {
    const db = new Dexie(name);
    dbs.push(db);
    db.version(1).stores({ from: '++id, name', to: '++id, name' });
    await db.open();
    return db;
  }

  it('copies every row and preserves ids exactly', async () => {
    const db = await makeDb('copy-preserves');
    await db.table('from').bulkAdd([
      { id: 1, name: 'alpha' },
      { id: 7, name: 'beta' },
    ]);

    await db.transaction('rw', db.table('from'), db.table('to'), async (tx) => {
      await copyTableRows(tx, 'from', 'to');
    });

    const rows = await db.table('to').orderBy('id').toArray();
    expect(rows).toEqual([
      { id: 1, name: 'alpha' },
      { id: 7, name: 'beta' },
    ]);
  });

  it('copies an empty table without error', async () => {
    const db = await makeDb('copy-empty');

    await db.transaction('rw', db.table('from'), db.table('to'), async (tx) => {
      await copyTableRows(tx, 'from', 'to');
    });

    expect(await db.table('to').count()).toBe(0);
  });

  it('aborts the transaction if the copy is short', async () => {
    const db = await makeDb('copy-short');
    await db.table('from').bulkAdd([{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }]);
    // Pre-seed a colliding id so bulkAdd drops one row rather than writing both.
    await db.table('to').add({ id: 2, name: 'squatter' });

    await expect(
      db.transaction('rw', db.table('from'), db.table('to'), async (tx) => {
        await copyTableRows(tx, 'from', 'to');
      })
    ).rejects.toThrow(/copied 1 of 2/);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/db/__tests__/migrations.test.ts`
Expected: FAIL — `Failed to resolve import "../migrations"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/db/migrations.ts`:

```ts
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
 */
export async function copyTableRows(
  tx: Transaction,
  from: string,
  to: string
): Promise<number> {
  const rows = await tx.table(from).toArray();
  if (rows.length === 0) return 0;

  await tx.table(to).bulkAdd(rows);

  const copied = await tx.table(to).count();
  if (copied !== rows.length) {
    throw new Error(
      `Migration aborted: copied ${copied} of ${rows.length} rows from ${from} to ${to}`
    );
  }

  return copied;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/db/__tests__/migrations.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/migrations.ts src/lib/db/__tests__/migrations.test.ts
git commit -m "feat(db): add copyTableRows migration helper

Preserves primary keys, since every foreign key in the database points at
them, and aborts the version transaction on a short copy."
```

---

### Task 3: Version 11 — create and copy

**Files:**
- Modify: `src/lib/db/schema.ts` (version block, ends line ~448)
- Test: `src/lib/db/__tests__/schema.test.ts:23` (version assertion), `:26` (table list)

- [ ] **Step 1: Write the failing test**

Append to `src/lib/db/__tests__/schema.test.ts`:

```ts
describe('version 11 platform extraction', () => {
  it('is at schema version 11', () => {
    expect(db.verno).toBe(11);
  });

  it('exposes sites and weatherHistory as tables', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('sites');
    expect(names).toContain('weatherHistory');
  });

  it('keeps the originals so a bad copy stays recoverable', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('growSites');
    expect(names).toContain('growWeatherHistory');
  });
});
```

Also update the two existing assertions:
- Line ~23: `expect(db.verno).toBe(10)` becomes `toBe(11)`
- Line ~26: the `should have all 21 expected tables` test — change `21` to `23` in the
  test name and add `'sites'` and `'weatherHistory'` to `expectedTables`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/schema.test.ts`
Expected: FAIL — `expected 10 to be 11`.

- [ ] **Step 3: Add version 11**

In `src/lib/db/schema.ts`, add the import at the top alongside the existing imports:

```ts
import { copyTableRows } from './migrations';
```

Then immediately after the `this.version(10).stores({...})` block and before the closing
brace of the constructor:

```ts
    // Sites and weather belong to the platform, not to grow. Propagation and the planner
    // already store `siteId` reaching through the grow prefix for them.
    //
    // Dexie has no in-place rename, so this creates the new tables and copies rows over.
    // The originals are left in place and dropped in version 12, which keeps a release
    // where both exist - a bad copy is then recoverable rather than terminal.
    this.version(11)
      .stores({
        sites: '++id, &name, isDefault',
        weatherHistory: '++id, siteId, date, [siteId+date]',
      })
      .upgrade(async (tx) => {
        await copyTableRows(tx, 'growSites', 'sites');
        await copyTableRows(tx, 'growWeatherHistory', 'weatherHistory');
      });
```

Add the table declarations to the class body alongside the existing ones:

```ts
  sites!: Table<GrowSite, string>;
  weatherHistory!: Table<GrowWeatherHistory, string>;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/db/__tests__/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the upgrade test that proves data survives**

Append to `src/lib/db/__tests__/migrations.test.ts`:

```ts
describe('v10 to v11 upgrade', () => {
  const NAME = 'upgrade-fixture';
  afterEach(async () => { await Dexie.delete(NAME); });

  it('carries sites across with their ids intact', async () => {
    // Open at version 10 with the pre-extraction schema and seed it.
    const old = new Dexie(NAME);
    old.version(10).stores({
      growSites: '++id, &name, isDefault',
      growWeatherHistory: '++id, siteId, date, [siteId+date]',
    });
    await old.open();
    await old.table('growSites').add({
      id: 42, name: 'Home Greenhouse', latitude: -37.8, longitude: 144.9,
      timezone: 'Australia/Melbourne', isDefault: true, isIndoor: true,
      weatherEnabled: false, createdAt: new Date(0), updatedAt: new Date(0),
    });
    await old.table('growWeatherHistory').add({
      id: 1, siteId: 42, date: new Date(0), temperature: 12, humidity: 70,
      conditions: 'Clear', source: 'manual', fetchedAt: new Date(0), createdAt: new Date(0),
    });
    old.close();

    // Reopen declaring version 11, which triggers the upgrade.
    const next = new Dexie(NAME);
    next.version(10).stores({
      growSites: '++id, &name, isDefault',
      growWeatherHistory: '++id, siteId, date, [siteId+date]',
    });
    next.version(11)
      .stores({ sites: '++id, &name, isDefault', weatherHistory: '++id, siteId, date, [siteId+date]' })
      .upgrade(async (tx) => {
        await copyTableRows(tx, 'growSites', 'sites');
        await copyTableRows(tx, 'growWeatherHistory', 'weatherHistory');
      });
    await next.open();

    const sites = await next.table('sites').toArray();
    expect(sites).toHaveLength(1);
    // The id must survive: growTrays.siteId points at it.
    expect(sites[0].id).toBe(42);
    expect(sites[0].name).toBe('Home Greenhouse');

    const weather = await next.table('weatherHistory').toArray();
    expect(weather).toHaveLength(1);
    expect(weather[0].siteId).toBe(42);

    // Originals still present for the recovery window.
    expect(await next.table('growSites').count()).toBe(1);
    next.close();
  });

  it('is a no-op on a database already at version 11', async () => {
    const build = () => {
      const d = new Dexie(NAME);
      d.version(10).stores({ growSites: '++id, &name, isDefault', growWeatherHistory: '++id, siteId, date, [siteId+date]' });
      d.version(11)
        .stores({ sites: '++id, &name, isDefault', weatherHistory: '++id, siteId, date, [siteId+date]' })
        .upgrade(async (tx) => {
          await copyTableRows(tx, 'growSites', 'sites');
          await copyTableRows(tx, 'growWeatherHistory', 'weatherHistory');
        });
      return d;
    };

    const first = build();
    await first.open();
    await first.table('sites').add({ id: 1, name: 'Only', isDefault: true });
    first.close();

    const second = build();
    await second.open();
    expect(await second.table('sites').count()).toBe(1);
    second.close();
  });
});
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/lib/db/__tests__/migrations.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/__tests__/schema.test.ts src/lib/db/__tests__/migrations.test.ts
git commit -m "feat(db): version 11 copies sites and weather to platform tables

Originals stay until version 12 so a bad copy is recoverable. Ids are asserted
to survive - growTrays.siteId and the propagation tables point at them."
```

---

### Task 4: Re-point the facade

**Files:**
- Modify: `src/lib/db/schema.ts` (the `growDb` and `platformDb` exports, ~line 455-473)
- Modify: `src/lib/db/index.ts` (export `platformDb` types)
- Test: `src/lib/db/__tests__/schema.test.ts`

This is what stops the other nine files needing to change yet.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/db/__tests__/schema.test.ts`:

```ts
describe('platform facade', () => {
  it('exposes sites and weather on platformDb', () => {
    expect(platformDb.sites.name).toBe('sites');
    expect(platformDb.weatherHistory.name).toBe('weatherHistory');
  });

  it('keeps growDb.sites working, pointed at the new table', () => {
    // Existing call sites still say growDb.sites. They keep working, and they read the
    // platform table - so there is exactly one source of truth during the transition.
    expect(growDb.sites.name).toBe('sites');
    expect(growDb.weatherHistory.name).toBe('weatherHistory');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/schema.test.ts`
Expected: FAIL — `expected 'growSites' to be 'sites'`.

- [ ] **Step 3: Update the exports**

In `src/lib/db/schema.ts`, change `platformDb`:

```ts
export const platformDb = {
  settings: db.platformSettings,
  sites: db.sites,
  weatherHistory: db.weatherHistory,
};
```

and in the `growDb` export, change these two lines only:

```ts
export const growDb = {
  // Deprecated aliases. Sites and weather belong to platformDb now; these remain so the
  // existing call sites keep working through the transition, and are removed in
  // sub-project 2 where the rename is already touching those imports.
  sites: db.sites,
  weatherHistory: db.weatherHistory,
  trays: db.growTrays,
  // The remaining nine entries (observations, timeEntries, varietyConfigs,
  // mediumConfigs, trayComments, experiments, decisions, plannedPlantings) are
  // unchanged - do not touch them.
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS. Test count is at least what Task 1 recorded.

- [ ] **Step 5: Verify the app still builds**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/index.ts src/lib/db/__tests__/schema.test.ts
git commit -m "feat(db): point growDb.sites at the platform table

growDb keeps the old names as deprecated aliases so the nine files touching
the database directly keep working. One source of truth either way."
```

---

### Task 5: Move the store and hook

**Files:**
- Create: `src/platform/stores/useSites.ts` (moved), `src/platform/hooks/useWeather.ts` (moved), `src/platform/index.ts`
- Delete: `src/modules/grow/stores/useSites.ts`, `src/modules/grow/hooks/useWeather.ts`
- Modify: `src/modules/grow/stores/index.ts`, `src/modules/grow/hooks/index.ts`
- Move: `src/modules/grow/stores/__tests__/useSites.test.ts` to `src/platform/stores/__tests__/useSites.test.ts`

Twenty-eight files import `useSites` or `useWeather`. None of them change — the barrel
files re-export.

- [ ] **Step 1: Move the files with git so history follows**

```bash
mkdir -p src/platform/stores/__tests__ src/platform/hooks
git mv src/modules/grow/stores/useSites.ts src/platform/stores/useSites.ts
git mv src/modules/grow/hooks/useWeather.ts src/platform/hooks/useWeather.ts
git mv src/modules/grow/stores/__tests__/useSites.test.ts src/platform/stores/__tests__/useSites.test.ts
```

- [ ] **Step 2: Update the moved files' own imports**

In `src/platform/stores/useSites.ts`, change the db import to use the platform facade:

```ts
import { platformDb, type GrowSite } from '@/lib/db';
```

and replace every `growDb.sites` with `platformDb.sites` (7 occurrences in this file).

For `src/platform/hooks/useWeather.ts`, find what needs changing rather than guessing:

```bash
grep -n "growDb\|from '\.\./\|from '@/modules/grow" src/platform/hooks/useWeather.ts
```

Change each hit: `growDb.weatherHistory` becomes `platformDb.weatherHistory` (import
`platformDb` from `@/lib/db`), and any `../stores` import of the sites store becomes
`../stores/useSites`. Any import still reaching into `@/modules/grow` means something
grow-specific leaked into the weather hook - stop and report it rather than moving it.

- [ ] **Step 3: Create the platform barrel**

Create `src/platform/index.ts`:

```ts
/**
 * Platform - what every enterprise needs.
 *
 * Sites and weather are not grow's, though they lived there while grow was the only
 * module. Propagation already stores `siteId`, and vegetables will too.
 */

export { useSites, type SitesState } from './stores/useSites';
export { useWeather } from './hooks/useWeather';
```

- [ ] **Step 4: Re-export from grow so nothing else breaks**

In `src/modules/grow/stores/index.ts`, replace the `useSites` export line with:

```ts
// Sites moved to the platform. Re-exported here so existing imports keep working;
// removed in sub-project 2 when the module is renamed and those imports change anyway.
export { useSites, type SitesState } from '@/platform';
```

In `src/modules/grow/hooks/index.ts`, replace the `useWeather` export line with:

```ts
export { useWeather } from '@/platform';
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, same count as before the move.

- [ ] **Step 6: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A src/platform src/modules/grow
git commit -m "refactor: move sites and weather into src/platform

Grow re-exports both, so the 28 files importing useSites or useWeather are
untouched. Those re-exports go in sub-project 2, where the module rename is
already editing those imports."
```

---

### Task 6: Version 12 — drop the originals

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: `src/lib/db/__tests__/schema.test.ts`, `src/lib/db/__tests__/migrations.test.ts`

Only start this once Task 5 is merged and the app has been run against real data at
version 11. That release is the recovery window; dropping the originals closes it.

- [ ] **Step 1: Update the remaining direct call sites first**

These four files still name the old tables. Change `growSites` to `sites` and
`growWeatherHistory` to `weatherHistory` in each:

- `src/lib/db/seed-demo-weather.ts` (2 occurrences)
- `src/lib/db/seed-demo-history.ts` (2 occurrences)
- `src/lib/errorRecovery.ts` (1)
- `src/lib/webmcp/context.ts` (1), `src/lib/webmcp/register.ts` (1)
- `src/modules/grow/components/Analytics/WeatherOutcome.tsx` (1)

Run: `grep -rn "growSites\|growWeatherHistory" src --include=*.ts --include=*.tsx`
Expected after the edits: matches only in `src/lib/db/schema.ts` and the test files.

- [ ] **Step 2: Write the failing test**

In `src/lib/db/__tests__/schema.test.ts`, update `expect(db.verno).toBe(11)` to `toBe(12)`,
change the table-count test name from 23 to 21, remove `'growSites'` and
`'growWeatherHistory'` from `expectedTables`, and replace the
`keeps the originals so a bad copy stays recoverable` test with:

```ts
  it('has dropped the pre-extraction tables', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).not.toContain('growSites');
    expect(names).not.toContain('growWeatherHistory');
  });
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/schema.test.ts`
Expected: FAIL — `expected 11 to be 12`.

- [ ] **Step 4: Add version 12**

In `src/lib/db/schema.ts`, after the version 11 block:

```ts
    // The copy has shipped and been exercised against real data. Drop the originals.
    //
    // A browser jumping straight from 10 to 12 runs both upgrades in order, so the copy
    // still happens before this removes its source.
    this.version(12).stores({
      growSites: null,
      growWeatherHistory: null,
    });
```

Remove the now-dead `growSites!` and `growWeatherHistory!` table declarations from the
class body.

- [ ] **Step 5: Prove the 10-to-12 jump still carries the data**

Append to `src/lib/db/__tests__/migrations.test.ts`:

```ts
it('carries data when a browser jumps from 10 straight to 12', async () => {
  const NAME = 'jump-fixture';
  const old = new Dexie(NAME);
  old.version(10).stores({ growSites: '++id, &name, isDefault' });
  await old.open();
  await old.table('growSites').add({ id: 9, name: 'Jumped', isDefault: true });
  old.close();

  const next = new Dexie(NAME);
  next.version(10).stores({ growSites: '++id, &name, isDefault' });
  next.version(11)
    .stores({ sites: '++id, &name, isDefault' })
    .upgrade(async (tx) => { await copyTableRows(tx, 'growSites', 'sites'); });
  next.version(12).stores({ growSites: null });
  await next.open();

  const sites = await next.table('sites').toArray();
  expect(sites).toHaveLength(1);
  expect(sites[0].id).toBe(9);
  expect(next.tables.map((t) => t.name)).not.toContain('growSites');

  next.close();
  await Dexie.delete(NAME);
});
```

- [ ] **Step 6: Run everything**

Run: `npm test && npm run build && npm run lint`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): version 12 drops the pre-extraction tables

Sites and weather now live only in the platform tables. A browser upgrading
from 10 straight to 12 runs both upgrades in order, covered by a test."
```

---

### Task 7: Enterprise on time entries

**Files:**
- Modify: `src/lib/db/schema.ts` (the `GrowTimeEntry` interface ~line 103, plus version 13)
- Test: `src/lib/db/__tests__/migrations.test.ts`, `src/lib/db/__tests__/schema.test.ts`

Do this now rather than with vegetables. Every time entry in the database today is
microgreens time, because that is the only enterprise there is - so the backfill below is
accurate. Once vegetables ships, entries logged in between become permanently ambiguous,
which is the loss this field exists to prevent.

The field is deliberately **not indexed**. Nothing queries by it yet, and an index can be
added in a later version when something does.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/db/__tests__/migrations.test.ts`:

```ts
describe('v13 enterprise backfill', () => {
  const NAME = 'enterprise-fixture';
  afterEach(async () => { await Dexie.delete(NAME); });

  it('marks existing time entries as microgreens', async () => {
    const old = new Dexie(NAME);
    old.version(12).stores({ growTimeEntries: '++id, date, week, siteId, [siteId+date]' });
    await old.open();
    await old.table('growTimeEntries').bulkAdd([
      { id: 1, date: new Date(0), week: 1, sowing: 30, harvesting: 0, notes: '' },
      { id: 2, date: new Date(0), week: 2, sowing: 0, harvesting: 45, notes: '' },
    ]);
    old.close();

    const next = new Dexie(NAME);
    next.version(12).stores({ growTimeEntries: '++id, date, week, siteId, [siteId+date]' });
    next.version(13).upgrade(async (tx) => {
      await tx.table('growTimeEntries').toCollection().modify((entry) => {
        entry.enterprise = 'microgreens';
      });
    });
    await next.open();

    const entries = await next.table('growTimeEntries').orderBy('id').toArray();
    expect(entries.map((e) => e.enterprise)).toEqual(['microgreens', 'microgreens']);
    // The minutes must be untouched.
    expect(entries[1].harvesting).toBe(45);
    next.close();
  });
});
```

And in `src/lib/db/__tests__/schema.test.ts`, update the version assertion from
`expect(db.verno).toBe(12)` to `toBe(13)`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/schema.test.ts`
Expected: FAIL — `expected 12 to be 13`.

- [ ] **Step 3: Add the type and the version**

In `src/lib/db/schema.ts`, above the `GrowTimeEntry` interface:

```ts
/**
 * Which enterprise a record belongs to.
 *
 * Not a separate books-per-enterprise model - Paddock is one farm with one set of books.
 * This exists on time entries alone, because hours are the one thing that cannot be
 * reconstructed after the fact. Costs come off receipts and a tray's yield is on the
 * tray, but "45 minutes harvesting on Tuesday" at a site running two enterprises is
 * ambiguous forever if it was not captured at the time.
 */
export type EnterpriseId = 'microgreens' | 'vegetables' | 'propagation';
```

Add the field to `GrowTimeEntry`, after `siteId`:

```ts
  enterprise?: EnterpriseId;    // Absent on rows predating vegetables; see version 13
```

Then after the version 12 block:

```ts
    // Backfill the enterprise tag while it can still be known.
    //
    // Every entry that exists at this point is microgreens time - it is the only
    // enterprise there is. Doing this before vegetables ships means "absent" afterwards
    // means "the grower did not say", rather than being indistinguishable from a
    // pre-vegetables row. No stores() clause: the field is not indexed, so this is a data
    // migration only.
    this.version(13).upgrade(async (tx) => {
      await tx.table('growTimeEntries').toCollection().modify((entry) => {
        entry.enterprise = 'microgreens';
      });
    });
```

- [ ] **Step 4: Export the type**

In `src/lib/db/index.ts`, add `EnterpriseId` to the existing `export type { ... }` block.

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/index.ts src/lib/db/__tests__/
git commit -m "feat(db): tag time entries with their enterprise

Backfills existing entries as microgreens, which is accurate today because it
is the only enterprise. After vegetables ships it would be a guess, and hours
are the one record that cannot be reconstructed later."
```

---

## Done when

- `grep -rn "growSites\|growWeatherHistory" src` returns matches only in `schema.ts`
- `GrowTimeEntry.enterprise` exists and existing rows read back as `'microgreens'`
- `npm test && npm run build && npm run lint` all pass
- Opening the app on an existing database shows the same sites as before

Sub-project 2 (rename `grow` to `microgreens`) follows, and removes the deprecated
`growDb.sites` alias and the grow re-exports along with it.
