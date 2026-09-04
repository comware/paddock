# Rename Grow to Microgreens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the `grow` module to `microgreens`, and stop it being mandatory — so a
grower who only runs vegetables is not forced to carry it.

**Architecture:** A directory move, an import sweep, a route rename with aliases, and one
genuine data migration. The Dexie tables keep their `grow*` names: renaming those is a data
migration with no user-visible benefit, and this sub-project is explicitly "no data".

**Tech Stack:** TypeScript, React Router, Zustand, Dexie 4, Vitest.

**Spec:** `docs/architecture/2026-09-03-enterprise-modules-design.md`

---

## Why it is not purely mechanical

The plan's own risk table called this "Low - mechanical, no data". Two things in it are not.

**1. Every existing install has `enabled_modules: ['grow']` stored in IndexedDB.**
`useModulesStore.load()` filters stored ids against `MODULE_DEFINITIONS`:

```ts
const enabled = stored.filter((id) => MODULE_DEFINITIONS.some((m) => m.id === id));
set({ enabled: [...new Set([...REQUIRED, ...enabled])] });
```

Rename the id and `'grow'` matches nothing, so it is dropped. Today `REQUIRED` puts it back —
but this sub-project also removes `required: true`, so `REQUIRED` becomes empty and the user
lands on `enabled: []` with an empty navigation. The file's own comment warns about exactly
this. Settings has its own link in `TopNav` so it is recoverable, but it is still a bad
regression and it needs a migration.

**2. `/grow/*` URLs exist in the wild.** The module's own routes file already keeps
site-less aliases "for links, bookmarks and the mobile navigation", so the codebase has
decided this matters. The rename must redirect rather than 404.

## Scope

| | Count |
|---|---|
| Files inside `src/modules/grow/` | 99 |
| Files importing `@/modules/grow` | 6 |
| Route string references | ~9 |
| User-visible "Grow" copy | 3 |

Dexie table names (`growTrays`, `growObservations`, …) are **out of scope** and stay.

---

### Task 1: The module registry, and the migration that keeps the nav alive

Do this first. It is the only part that can leave a user worse off.

**Files:**
- Modify: `src/stores/useModulesStore.ts`
- Test: `src/stores/__tests__/useModulesStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/stores/__tests__/useModulesStore.test.ts` (read it first — it may need
`fake-indexeddb`-backed setup, which `src/test/setup.ts` already provides):

```ts
describe('renaming grow to microgreens', () => {
  beforeEach(async () => {
    await db.open();
    await platformDb.settings.clear();
    useModulesStore.setState({ enabled: [], isLoaded: false });
  });

  it('carries an existing install forward', async () => {
    // What every install created before the rename has stored.
    await platformDb.settings.add({ key: 'enabled_modules', value: ['grow', 'propagation'] });

    await useModulesStore.getState().load();

    const { enabled } = useModulesStore.getState();
    expect(enabled).toContain('microgreens');
    expect(enabled).toContain('propagation');
    expect(enabled).not.toContain('grow');
  });

  it('never leaves a user with an empty navigation', async () => {
    // The failure this migration exists to prevent: 'grow' no longer matches a module id,
    // gets filtered out, and nothing puts it back now that required is gone.
    await platformDb.settings.add({ key: 'enabled_modules', value: ['grow'] });

    await useModulesStore.getState().load();

    expect(useModulesStore.getState().enabled.length).toBeGreaterThan(0);
  });

  it('persists the migrated value, so it only converts once', async () => {
    await platformDb.settings.add({ key: 'enabled_modules', value: ['grow'] });

    await useModulesStore.getState().load();

    const setting = await platformDb.settings.where('key').equals('enabled_modules').first();
    expect(setting?.value).toContain('microgreens');
    expect(setting?.value).not.toContain('grow');
  });

  it('leaves microgreens switchable off, unlike grow', () => {
    const microgreens = MODULE_DEFINITIONS.find((m) => m.id === 'microgreens');
    expect(microgreens).toBeDefined();
    expect(microgreens?.required).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/stores/__tests__/useModulesStore.test.ts`
Expected: FAIL — there is no `microgreens` module id yet.

- [ ] **Step 3: Rename the module and add the migration**

In `src/stores/useModulesStore.ts`:

- `ModuleId`: `'grow'` becomes `'microgreens'`
- The definition: `id: 'microgreens'`, `name: 'Microgreens'`, `path: '/microgreens'`, and
  **delete the `required: true` line**
- `DEFAULT_ENABLED`: `['microgreens']`
- Update the `DEFAULT_ENABLED` doc comment — it says "A fresh install starts with Grow alone"
  and explains the reasoning. Keep the reasoning, change the name.
- Delete the comment on `ModuleId` / the definitions block claiming grow cannot be turned off,
  if present — it is no longer true.

Add the migration inside `load()`, before the filter:

```ts
/**
 * What an install created before the rename has stored.
 *
 * The stored list is filtered against MODULE_DEFINITIONS, so an id that no longer exists is
 * silently dropped - and with `required` gone there is nothing to put it back. A grower who
 * had only this module would load into an empty navigation.
 */
const RENAMED: Record<string, ModuleId> = { grow: 'microgreens' };
```

and in `load()`:

```ts
      const migrated = Array.isArray(stored)
        ? stored.map((id) => RENAMED[id as string] ?? id)
        : stored;
```

then filter `migrated` instead of `stored`. If anything changed, write it back so the
conversion happens once rather than on every load — reuse the same update/add logic
`setEnabled` uses.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/stores/__tests__/useModulesStore.test.ts`
Expected: PASS.

Then `npm test` — other tests referencing `'grow'` as a module id will now fail. That is
expected; note which, and fix them in this task since they are part of the same rename.

- [ ] **Step 5: Commit**

```bash
git add src/stores
git commit -m "feat: rename the grow module to microgreens, and let it be turned off

Grow was required because every other module fed it. That stops being true
once vegetables is a sibling rather than a dependent.

Existing installs have 'grow' in their stored module list, which no longer
matches any id - and with required gone, nothing would put it back. They would
load into an empty navigation, so the stored value is migrated."
```

---

### Task 2: Move the directory

**Files:** `src/modules/grow/` → `src/modules/microgreens/` (99 files), plus 6 importers.

- [ ] **Step 1: Move with git so history follows**

```bash
git mv src/modules/grow src/modules/microgreens
```

- [ ] **Step 2: Update every import**

Six files import `@/modules/grow`:
`src/routes.tsx`, `src/modules/settings/components/ExperimentConfig.tsx`,
`src/modules/planner/hooks/usePlannerIntegration.ts`,
`src/modules/propagation/components/Stations/StationForm.tsx`,
`src/modules/propagation/components/MotherPlants/MotherPlantForm.tsx`,
`src/modules/propagation/components/Batches/NewBatchForm.tsx`

Plus any relative imports inside the moved module that reference it by absolute path.

```bash
grep -rln "@/modules/grow" src | xargs sed -i '' 's|@/modules/grow|@/modules/microgreens|g'
```

Then verify none remain:

```bash
grep -rn "modules/grow" src --include=*.ts --include=*.tsx
```
Expected: no output.

- [ ] **Step 3: Verify**

`npx tsc --noEmit` (clean), `npm test` (all passing), `npm run build` (exit 0).

The suite should be **unchanged in count** — this task moves files and rewrites import paths,
nothing else. If the count changes, something was lost; investigate.

- [ ] **Step 4: Commit**

```bash
git add -A src
git commit -m "refactor: move the grow module to microgreens"
```

---

### Task 3: Routes, with aliases

**Files:** `src/routes.tsx`, `src/modules/microgreens/routes.tsx`, and anything linking to `/grow`.

- [ ] **Step 1: Rename the route and keep the old one working**

In `src/routes.tsx`, `path: 'grow/*'` becomes `path: 'microgreens/*'`. Then add a redirect so
existing bookmarks, links and anything an agent has been told about keep working:

```tsx
          // Paddock's grow module became microgreens when vegetables arrived as a sibling.
          // Links, bookmarks and the WebMCP tool descriptions still say /grow, so redirect
          // rather than 404 - the module's own routes file already keeps aliases for the
          // same reason.
          {
            path: 'grow/*',
            element: <Navigate to="/microgreens" replace />,
          },
```

Check whether a wildcard redirect can preserve the sub-path (`/grow/analytics` →
`/microgreens/analytics`). If React Router makes that awkward, redirecting to the module root
is acceptable — say which you did and why.

- [ ] **Step 2: Update internal links**

```bash
grep -rn "'/grow" src --include=*.ts --include=*.tsx | grep -v __tests__
```

Roughly nine references — `/grow`, `/grow/analytics`, `/grow/trays`, `/grow/guides`,
`/grow/sites/manage`, `/grow/daily`, `/grow/time`, `/grow/calendar`. Point them all at
`/microgreens...`. Include `src/components/ErrorBoundary.tsx:39`.

Also check `src/lib/webmcp/` — if any tool description or resource URI mentions `/grow`,
update it, since that text is what an agent is told.

- [ ] **Step 3: Verify**

`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint` (63/21 baseline).

- [ ] **Step 4: Commit**

```bash
git add -A src
git commit -m "refactor: move the module's routes to /microgreens, redirecting /grow"
```

---

### Task 4: Copy, and the deprecated aliases

- [ ] **Step 1: User-visible copy**

- `src/components/ErrorBoundary.tsx:39` — `{ name: 'Grow', path: '/grow', icon: '🌱' }`
- `src/modules/planner/components/EventCreateForm.tsx:165` — `<optgroup label="Grow">`

Check for others: `grep -rn "Grow" src --include=*.tsx | grep -v __tests__ | grep -v "growDb"`.
Be careful — "grow", "growing" and "growing medium" appear legitimately in domain copy. Only
change the ones naming the MODULE.

- [ ] **Step 2: Remove the deprecated database aliases**

`src/lib/db/schema.ts`'s `growDb` still carries `sites` and `weatherHistory` as deprecated
aliases pointing at the platform tables, with a comment saying they are removed "in
sub-project 2 where the rename is already touching those imports". This is that sub-project.

Find every consumer of `growDb.sites` / `growDb.weatherHistory` and point it at `platformDb`,
then delete the two aliases and their comment.

Likewise `src/modules/microgreens/stores/index.ts` and `hooks/index.ts` re-export `useSites`
and `useWeather` from `@/platform` — with comments saying the same. Consumers should import
from `@/platform` directly; remove the re-exports.

**If removing a re-export means touching many consumer files, that is expected** — the point
of deferring it to this sub-project was that the rename is already editing those imports.

- [ ] **Step 3: Verify and commit**

`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint`.

```bash
git add -A src
git commit -m "refactor: retire the grow aliases now the rename has landed

growDb.sites and the module's re-exports of useSites and useWeather were kept
so the platform extraction did not have to touch every consumer at once. The
rename is editing those imports anyway."
```

---

### Task 5: Sweep

- [ ] **Step 1** — `grep -rn "modules/grow" src` → no output.
- [ ] **Step 2** — `grep -rn "growDb\.\(sites\|weatherHistory\)" src` → no output.
- [ ] **Step 3** — `grep -rn "'grow'" src --include=*.ts --include=*.tsx | grep -v __tests__` →
  only the `RENAMED` migration map and any Dexie table name. List and justify each hit.
- [ ] **Step 4** — Confirm `/grow` still resolves: check the redirect route exists and that a
  test or manual reasoning covers it.
- [ ] **Step 5** — `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint`.

## Done when

- Navigation shows "Microgreens", and it can be switched off
- An install that had `['grow']` stored loads with `['microgreens']`
- `/grow` redirects rather than 404s
- No `modules/grow` or `growDb.sites` references remain

## Not done here

- **Dexie table names.** `growTrays`, `growObservations` and the rest keep their names. Renaming
  them is a data migration with no user-visible benefit; it can happen alongside a migration
  that has another reason to exist.
- **Adding `vegetables` to the registry.** The spec lists it here, but the module does not exist
  yet — a nav entry pointing at a 404 is worse than none. It belongs with sub-project 3.
