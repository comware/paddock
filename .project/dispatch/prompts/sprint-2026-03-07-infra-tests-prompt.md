# Sprint: Infrastructure Testing & Dependency Updates

**Sprint ID:** sprint-2026-03-07-infra-tests
**Goal:** goal-10 (Infrastructure Testing & Dependency Updates)
**Created:** 2026-03-07

## Mission

Add tests for untested infrastructure layers (db schema, AI service) and
update dependencies to fix CVEs. Addresses goal-10.

**Exit criteria:**
- Test file exists for src/lib/db with at least 5 tests
- Test file exists for src/lib/ai/service.ts with at least 5 tests
- react-router-dom version >= 7.13.1 in package.json
- All tests pass
- Build succeeds

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Build:** `pnpm run build` (tsc -b && vite build) — NOT Next.js
- **Test:** `pnpm vitest run` (906 tests across 26 test files)
- **Package manager:** pnpm (use pnpm, not npm or yarn)
- **Framework:** React + TypeScript + Vite + React Router
- **Database:** Dexie (IndexedDB wrapper) — local-first, no server
- **AI Service:** src/lib/ai/ — gemini.ts, openai.ts, anthropic.ts, service.ts, crypto.ts
- **DB Schema:** src/lib/db/schema.ts — PaddockDB class extending Dexie with 9 versions, 21 tables
- **DB Exports:** src/lib/db/index.ts — growDb, platformDb, propDb, plannerDb, aiDb convenience objects
- **Test Pattern:** vitest with `import { describe, it, expect } from 'vitest'`
- **Test Location:** `src/modules/*/stores/__tests__/*.test.ts` (stores) or `src/lib/*/__tests__/*.test.ts` (lib)
- **Mock Pattern:** `import { createMockSite } from '@/test/mocks/db'` (see existing tests for examples)

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

### IT-001: Create Database Schema & Operations Tests
**Priority:** P0 | **Estimate:** 0.75h | **Depends on:** nothing

Create test file at `src/lib/db/__tests__/schema.test.ts` with at least 5 tests.

The database is defined in `src/lib/db/schema.ts`:
- `PaddockDB` class extends Dexie with 9 schema versions
- 21 tables across Grow, AI, Platform, Planner, and Propagation modules
- Convenience exports: `growDb`, `platformDb`, `propDb`, `plannerDb`, `aiDb`

Test areas:
1. Database instance creation — verify `db` is a Dexie instance
2. Table existence — verify all 21 expected tables exist on the db instance
3. Convenience export structure — verify `growDb` has `sites`, `trays`, `observations`, etc.
4. Schema version — verify `db.verno` matches expected version (9)
5. Index definitions — verify key compound indexes exist (e.g., `[siteId+stage]` on propBatches)

Pattern: Use vitest. The Dexie instance exposes `.tables`, `.verno`, and schema metadata
without needing to open IndexedDB in a browser environment.

<comware:handoff_start id="it-001-db-tests" />

**Tasks:**
1. Create `src/lib/db/__tests__/` directory
2. Create `schema.test.ts` with at least 5 tests
3. Verify tests pass: `pnpm vitest run src/lib/db/__tests__/schema.test.ts`

**Acceptance criteria:**
- Test file exists at `src/lib/db/__tests__/schema.test.ts`
- At least 5 tests defined
- Tests pass

<comware:handoff_complete id="it-001-db-tests" />

### IT-002: Create AI Service Tests
**Priority:** P0 | **Estimate:** 0.75h | **Depends on:** nothing

Create test file at `src/lib/ai/__tests__/service.test.ts` with at least 5 tests.

The AI service is defined in `src/lib/ai/service.ts` (209 LOC):
- `AIService` class manages OpenAI, Anthropic, and Gemini providers
- Methods: `getAllModels`, `getProvider`, `getProviderForModel`, `getConfiguredProviders`,
  `getAvailableModels`, `saveApiKey`, `getApiKeyMasked`, `deleteApiKey`, `validateApiKey`,
  `chat`, `chatStream`
- Uses `platformDb.settings` for API key storage
- Uses `encrypt`/`decrypt` from `./crypto.ts`

Test areas:
1. `getAllModels` — returns array of supported models
2. `getProvider('openai')` — returns the OpenAI provider
3. `getProvider('unknown')` — returns undefined
4. `getProviderForModel(validId)` — returns correct provider
5. `getProviderForModel('unknown')` — returns undefined
6. `chat` with unknown model — throws error
7. `chatStream` with unknown model — calls onError callback

Pattern: Use vitest. Mock Dexie/IndexedDB with `vi.mock()`. Import `aiService` (singleton)
or create new `AIService` instances for isolated tests.

<comware:handoff_start id="it-002-ai-service-tests" />

**Tasks:**
1. Create `src/lib/ai/__tests__/` directory if needed
2. Create `service.test.ts` with at least 5 tests
3. Mock database and crypto dependencies
4. Verify tests pass: `pnpm vitest run src/lib/ai/__tests__/service.test.ts`

**Acceptance criteria:**
- Test file exists at `src/lib/ai/__tests__/service.test.ts`
- At least 5 tests defined
- Tests pass

<comware:handoff_complete id="it-002-ai-service-tests" />

### IT-003: Update Dependencies to Fix CVEs
**Priority:** P1 | **Estimate:** 0.25h | **Depends on:** nothing

Update two packages to fix known CVEs:

1. `react-router-dom`: currently `^7.11.0` → update to `^7.13.1` or higher
2. `vite-plugin-pwa`: currently `^1.2.0` → update to latest

```bash
pnpm update react-router-dom --latest
pnpm update vite-plugin-pwa --latest
```

After updating:
- Run `pnpm run build` — verify no breaking changes
- Run `pnpm vitest run` — verify all tests pass
- If build breaks, check migration guides and fix type/API changes

The codebase uses `useRoutes()` and `lazy()` from react-router-dom — these are stable APIs.

<comware:handoff_start id="it-003-update-deps" />

**Tasks:**
1. Update react-router-dom to latest
2. Update vite-plugin-pwa to latest
3. Verify build passes
4. Verify all tests pass

**Acceptance criteria:**
- react-router-dom >= 7.13.1
- vite-plugin-pwa updated past 1.2.0
- Build succeeds
- All tests pass

<comware:handoff_complete id="it-003-update-deps" />

### IT-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** all above

1. Run pnpm vitest run — verify all tests pass
2. Run pnpm run build — verify build passes
3. git add new test files + updated package.json + pnpm-lock.yaml
4. git commit -m "test(infra): add db and ai service tests, update deps for CVE fixes"
5. DO NOT run git push

<comware:handoff_start id="it-999-commit-verify" />
<comware:handoff_complete id="it-999-commit-verify" />
<comware:done />
