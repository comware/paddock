# Sprint Dispatch: Planner Module PRD & Tests

## Sprint
- ID: sprint-2026-03-09-planner-prd
- Goal: goal-4 (Planner Module Foundation)
- Handoffs: 3 (2 implementation + commit-verify)
- Estimated: ~2h

## Context
The planner module is feature-complete with:
- Store: usePlannerStore with CRUD, lifecycle, linking, filters, selectors
- Types: Rich type system (80+ types) in types/planner.ts and types/eventTypes.ts
- Integration: usePlannerIntegration hook for Grow/Propagation cross-module linking
- Calendar: PlannerCalendar using react-big-calendar
- Components: EventCreateForm, EventList, EventDetail, EventDetailModal, CalendarEvent
- Routes: /planner (calendar), /events, /events/new, /events/:id

## What's Missing (this sprint fills these gaps)
1. **PRD Documentation** — No PRD exists for the planner module
2. **Component Tests** — The 3 new components (EventCreateForm, EventList, EventDetail) have no tests

## Handoff Order
1. `planner-prd-001-write-prd` — Write comprehensive PRD
2. `planner-prd-002-component-tests` — Add unit tests for new components
3. `planner-prd-999-commit-verify` — Commit, push, verify CI

## Reference PRD
Use docs/prd/propagation-module-prd.md as a format reference for the planner PRD.

## Test Patterns
Use existing test patterns from:
- src/modules/planner/stores/__tests__/usePlannerStore.test.ts
- src/modules/propagation/stores/__tests__/*.test.ts
Testing library: vitest + @testing-library/react

## BOUNDARIES — DO NOT VIOLATE
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
