# Sprint: Code Health — Split Large Components & Extract Patterns

**Sprint ID:** sprint-2026-03-07-code-health
**Goal:** goal-7 (Code Health — Reduce Complexity & Duplication)
**Created:** 2026-03-07

## Mission

Split 5 propagation components over 700 LOC into focused sub-components and extract
shared form validation patterns. Pure refactoring — no logic changes. All 906+ tests
must continue passing.

**Exit criteria:**
- No component files over 500 LOC in the top 5 hotspots (target: under 300 each)
- Shared form patterns extracted to reduce duplication
- All 906+ tests still pass
- Build succeeds

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Framework:** Vite + React + TypeScript
- **Package manager:** pnpm (use `pnpm vitest run` for tests, `pnpm run build` for build)
- **State:** Zustand stores in `src/modules/*/stores/`
- **DB:** Dexie (IndexedDB) — local-first, no backend
- **Forms:** react-hook-form + zod for validation
- **Tests:** Vitest (906 tests across 26 files)
- **Components:** Functional React with hooks
- **Imports:** Use relative imports within modules, `@/` alias for cross-module

BOUNDARIES — DO NOT VIOLATE:
- Do NOT run `git push` — the autopilot harness handles remote sync
- Do NOT install system-level tools (brew install, go install, npm install -g, pip install)
- Do NOT modify files outside the project directory
- Do NOT modify .claude/ state files — only the harness writes state
- Do NOT run commands that require user interaction (sudo, ssh prompts)

After completing all handoffs, return your results. Do NOT:
- Mark goals complete (the harness does this)
- Update focus in project.yaml (the harness does this)
- Archive or move sprint files (the harness does this)
- Commit .claude/ state files (the harness does this)
- Push to remote (the harness decides when to push)

## Handoff Execution Order

### CH-001: Split Top 5 Large Components Into Focused Sub-Components
**Priority:** P0 | **Estimate:** 1.25h | **Depends on:** nothing

Split these 5 files into smaller, focused modules:

1. **NewBatchForm.tsx** (779 LOC) → shell + BatchBasicInfo + BatchStageConfig + BatchQuantitySection
2. **StageTransitionModal.tsx** (755 LOC) → shell + TransitionChecklist + TransitionMetrics
3. **MotherPlantDetail.tsx** (718 LOC) → shell + MotherPlantInfo + MotherPlantCuttings + MotherPlantHealth
4. **BatchDetail.tsx** (715 LOC) → shell + BatchTimeline + BatchMetrics + BatchActions
5. **PropaguleDetail.tsx** (694 LOC) → shell + PropaguleInfo + PropaguleObservations

Rules:
- Each extracted component gets its own file in the same directory
- Parent components import and compose the children
- No logic changes — pure extraction refactoring
- Each resulting parent file should be under 300 LOC
- Maintain all existing props and behavior

**Tasks:**
1. Read each file to understand its structure and natural splitting points
2. For each file, identify logical sections that can become separate components
3. Create new component files with the extracted code
4. Update parent component to import and use the new children
5. Run tests after each file split to catch regressions early

**Acceptance criteria:**
- Each of the 5 parent files under 300 LOC
- All tests pass (`pnpm vitest run`)
- Build succeeds (`pnpm run build`)

<comware:handoff_start id="ch-001-split-components" />

Split each component, running tests between splits to catch regressions early.

<comware:handoff_complete id="ch-001-split-components" />

### CH-002: Extract Shared Form Validation Patterns
**Priority:** P1 | **Estimate:** 0.5h | **Depends on:** ch-001

Create `src/modules/propagation/components/shared/FormFields.tsx` with reusable form field components.

Extract patterns duplicated across:
- NewBatchForm and its children
- SupplyForm.tsx (689 LOC)
- StationForm.tsx (528 LOC)
- GraduationForm.tsx (583 LOC)

Create shared components for the most common patterns:
- RequiredTextField, NumericRangeField, DateField, SelectField

Refactor at least 2 form components to use the shared fields.

**Acceptance criteria:**
- FormFields.tsx exists with 3+ exported components
- At least 2 form components import from shared FormFields
- All tests pass, build succeeds

<comware:handoff_start id="ch-002-extract-form-patterns" />

Extract shared patterns, then update form components to use them.

<comware:handoff_complete id="ch-002-extract-form-patterns" />

### CH-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** ch-001, ch-002

1. Run `pnpm vitest run` — verify all tests pass
2. Run `pnpm run build` — verify build passes
3. `git add` relevant files (new + modified component files)
4. `git commit -m "refactor: split large components and extract shared form patterns"`
5. DO NOT run `git push`

<comware:handoff_start id="ch-999-commit-verify" />
<comware:handoff_complete id="ch-999-commit-verify" />
<comware:done />
