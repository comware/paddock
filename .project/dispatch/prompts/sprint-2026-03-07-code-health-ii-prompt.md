# Sprint: Code Health II — Split Next Tier Components

**Sprint ID:** sprint-2026-03-07-code-health-ii
**Goal:** goal-9 (Code Health II — Split Next Tier Components)
**Created:** 2026-03-07

## Mission

Split 5 large components (550-631 LOC) into sub-components under 300 LOC each.
Pure refactoring — no behavior changes.

**Exit criteria:**
- All 5 target components under 300 LOC
- All 906+ tests still pass
- Build succeeds

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Build:** `pnpm run build` (tsc -b && vite build) — NOT Next.js
- **Test:** `pnpm vitest run` (906 tests across 26 test files)
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

### CH2-001: Split 5 Large Components
**Priority:** P0 | **Estimate:** 1.5h | **Depends on:** nothing

Split these 5 components into smaller sub-components:

1. **AIAssistant.tsx** (631 LOC) — `src/components/ai/AIAssistant.tsx`
   Extract logical sections: message list rendering, input/compose area, settings panel, conversation management

2. **SpeciesConfigForm.tsx** (559 LOC) — `src/modules/propagation/components/Settings/SpeciesConfigForm.tsx`
   Extract: stage configuration sections, timing/duration fields, media config panels

3. **PropagationGuideLibrary.tsx** (552 LOC) — `src/modules/propagation/components/Guides/PropagationGuideLibrary.tsx`
   Extract: guide card grid, filter/search bar, guide detail view

4. **MotherPlantForm.tsx** (550 LOC) — `src/modules/propagation/components/MotherPlants/MotherPlantForm.tsx`
   Extract: health assessment section, cutting history display, form field sections

5. **PropaguleUpdateForm.tsx** (560 LOC) — `src/modules/propagation/components/Propagules/PropaguleUpdateForm.tsx`
   Extract: measurement fields, stage transition section, notes/observations section

**Approach for each:**
1. Read the full file to understand its structure
2. Identify 2-4 logical sections that can become sub-components
3. Create new files in the same directory (e.g., `AIMessageList.tsx`, `AIInputArea.tsx`)
4. Move the extracted JSX and associated logic to sub-components
5. Pass required props from the parent
6. Import and compose in the parent — parent should be under 300 LOC
7. Reuse shared FormFields.tsx patterns where applicable

**IMPORTANT:** Pure refactoring only. No behavior changes. No new features.

<comware:handoff_start id="ch2-001-split-components" />

**Tasks:**
1. Split AIAssistant.tsx (631 → <300 LOC)
2. Split SpeciesConfigForm.tsx (559 → <300 LOC)
3. Split PropagationGuideLibrary.tsx (552 → <300 LOC)
4. Split MotherPlantForm.tsx (550 → <300 LOC)
5. Split PropaguleUpdateForm.tsx (560 → <300 LOC)
6. Run build to verify no type errors
7. Run tests to verify no regressions

**Acceptance criteria:**
- All 5 components under 300 LOC
- Build passes
- All tests pass

<comware:handoff_complete id="ch2-001-split-components" />

### CH2-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** all above

1. Run pnpm vitest run — verify all tests pass
2. Run pnpm run build — verify build passes
3. git add modified and new files
4. git commit -m "refactor(code-health): split 5 large components under 300 LOC"
5. DO NOT run git push

<comware:handoff_start id="ch2-999-commit-verify" />
<comware:handoff_complete id="ch2-999-commit-verify" />
<comware:done />
