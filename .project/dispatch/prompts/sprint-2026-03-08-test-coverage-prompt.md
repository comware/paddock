# Sprint Dispatch: Test Coverage Expansion

## Sprint
- **ID:** sprint-2026-03-08-test-coverage
- **Goal:** goal-12 (Test Coverage Expansion — Utilities & Stores)
- **Estimated:** ~2h
- **Handoffs:** 3 (2 implementation + 1 commit-verify)

## Context
Paddock has 28 test files across ~250 source files (ratio 0.12). This sprint adds 7 new test files
for untested utility modules to reach 35+ test files. All tests use vitest (describe/it/expect).

## Existing Test Patterns
- Tests are in `__tests__/` directories adjacent to source
- Use vitest: `describe`, `it`, `expect`, `vi.fn()`, `vi.mock()`
- Mock IndexedDB/db with `vi.mock('@/lib/db')`
- See `src/modules/propagation/stores/__tests__/` for examples

## Execution Order
1. `tc-001-util-tests` — Create 4 test files for propagation utilities (stageHelpers, analyticsCalculations, costCalculations, batchNumbering)
2. `tc-002-exporter-metric-tests` — Create 3 test files for exporters and metrics (unifiedExporter, motherPlantMetrics, exporters)
3. `tc-999-commit-verify` — Commit, push, verify CI

## BOUNDARIES — DO NOT VIOLATE:
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

## Signal Protocol
After each handoff: `<comware:handoff_complete id="tc-001-util-tests">`
When sprint complete: `<comware:done>`
