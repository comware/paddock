# Sprint: Code Health III — Split Large Stores & Utils

**Sprint ID:** sprint-2026-03-07-code-health-iii
**Goal:** goal-11 (Code Health III — Split Large Stores & Utils)
**Created:** 2026-03-07

## Mission

Split 12 remaining source files >500 LOC into focused modules. This sprint targets
the 5 largest Zustand stores + analyticsCalculations.ts + types/index.ts.
Pure refactoring — no behavior changes. All 929 tests must continue to pass.

**Exit criteria:**
- All 5 large store files under 400 LOC each
- analyticsCalculations.ts split into focused modules under 300 LOC each
- types/index.ts split into domain-specific type files under 300 LOC each
- All 929+ tests pass
- Build succeeds

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Build:** `pnpm run build` (tsc -b && vite build) — NOT Next.js
- **Test:** `pnpm vitest run` (929 tests across 28 test files)
- **Package manager:** pnpm (use pnpm, not npm or yarn)
- **Framework:** React + TypeScript + Vite + React Router
- **UI Library:** MUI (Material UI) components used throughout
- **State:** Zustand stores in src/modules/*/stores/
- **Shared Components:** src/modules/propagation/components/shared/FormFields.tsx has 8 reusable form components

BOUNDARIES — DO NOT VIOLATE:
- Do NOT run `git push` — the autopilot harness handles remote sync
- Do NOT install system-level tools (brew install, npm install -g)
- Do NOT modify files outside the project directory
- Do NOT modify .claude/ state files — only the harness writes state
- Do NOT run commands that require user interaction

After completing all handoffs, return your results. Do NOT:
- Mark goals complete (the harness does this)
- Update focus in project.yaml (the harness does this)
- Archive or move sprint files (the harness does this)
- Commit .claude/ state files (the harness does this)
- Push to remote (the harness decides when to push)

## Handoff Execution Order

### CH3-001: Split 5 Large Zustand Stores
**Priority:** P0 | **Estimate:** 1.5h | **Depends on:** nothing

Split these 5 store files into smaller focused modules:

1. **usePropagules.ts (658 LOC)** → core CRUD + filters + batch actions
2. **useStations.ts (580 LOC)** → core CRUD + capacity + environment
3. **useGraduations.ts (530 LOC)** → core + workflow logic
4. **useBatches.ts (522 LOC)** → core CRUD + stage transitions
5. **usePlannerStore.ts (557 LOC)** → core + date/schedule calculations

Strategy: Extract helper functions, selectors, and action groups into separate files.
Keep the main store file as the public API. Update imports across codebase.
Run `pnpm vitest run` after EACH store split to catch regressions early.

<comware:handoff_start id="ch3-001-split-stores" />

**Tasks:**
1. Read each store file to understand its structure
2. Identify logical groupings (CRUD, calculations, selectors, actions)
3. Extract groups into focused sub-module files
4. Update the main store to import/re-export from sub-modules
5. Update all imports across consuming components
6. Run tests after each store to verify no regressions

**Acceptance criteria:**
- usePropagules.ts under 400 LOC (verified via: wc -l)
- useStations.ts under 400 LOC (verified via: wc -l)
- useGraduations.ts under 400 LOC (verified via: wc -l)
- useBatches.ts under 400 LOC (verified via: wc -l)
- usePlannerStore.ts under 400 LOC (verified via: wc -l)
- All tests pass (verified via: pnpm vitest run exits 0)

<comware:handoff_complete id="ch3-001-split-stores" />

### CH3-002: Split analyticsCalculations.ts and types/index.ts
**Priority:** P0 | **Estimate:** 0.75h | **Depends on:** nothing

Split these 2 large utility/type files:

1. **analyticsCalculations.ts (707 LOC)** → split by calculation domain
   (successRate, cost, timeline calculations), keep barrel re-export
2. **types/index.ts (707 LOC)** → split by domain
   (batch, station, propagule, graduation, common types), keep barrel re-export

<comware:handoff_start id="ch3-002-split-utils" />

**Tasks:**
1. Read analyticsCalculations.ts, identify calculation domains
2. Extract into focused files (successRate, cost, timeline)
3. Update barrel file to re-export
4. Read types/index.ts, identify type domains
5. Extract into focused type files
6. Update barrel file to re-export
7. Update all imports across codebase
8. Run tests and build to verify

**Acceptance criteria:**
- analyticsCalculations.ts under 300 LOC or split into sub-modules each under 300 LOC
- types/index.ts under 300 LOC or split into sub-modules each under 300 LOC
- All tests pass (verified via: pnpm vitest run exits 0)
- Build passes (verified via: pnpm run build exits 0)

<comware:handoff_complete id="ch3-002-split-utils" />

### CH3-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** all above

1. `pnpm run build` — verify build passes
2. `pnpm vitest run` — verify all tests pass
3. `git status` — review all changes
4. `git add` — stage new and modified files (avoid secrets)
5. `git commit -m "refactor: split large stores and utils for code health (goal-11)"`
6. Update goal-11 in `.claude/project.yaml`:
   - Mark completed success_criteria as `completed: true`
   - Recalculate progress percentage

DO NOT mark sprint complete until build is green.
DO NOT push to remote — the harness handles this.

<comware:handoff_start id="ch3-999-commit-verify" />
<comware:handoff_complete id="ch3-999-commit-verify" />
<comware:done />
