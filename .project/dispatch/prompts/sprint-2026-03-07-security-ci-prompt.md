# Sprint: Security & CI Hardening

**Sprint ID:** sprint-2026-03-07-security-ci
**Goal:** goal-5 (Security & CI Hardening)
**Created:** 2026-03-07

## Mission

Fix verified security findings and CI gaps from codebase review (62/100, Grade D).
Addresses HIGH-1 (Gemini API key in URL), MED-2 (unencrypted API keys),
MED-3 (CI missing build step).

**Exit criteria:**
- Gemini provider uses x-goog-api-key header instead of ?key= query param
- GitHub Actions ci.yml includes npm run build step
- All tests pass, build passes

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Framework:** Vite + React + TypeScript (local-first PWA)
- **Build:** `npm run build` = `tsc -b && vite build`
- **Test:** `npm test` = `vitest run`
- **Package manager:** pnpm (pnpm-lock.yaml)
- **DB:** Dexie (IndexedDB, client-side only)
- **AI providers:** src/lib/ai/providers/ (gemini.ts, openai.ts, anthropic.ts)
- **CI:** .github/workflows/ci.yml

## Handoff Execution Order

### SC-001: Fix Gemini API Key Exposure
**Priority:** P0 | **Estimate:** 0.5h | **Depends on:** nothing

The Gemini provider passes API keys as ?key= URL query parameters in fetch calls.
Change all fetch calls in src/lib/ai/providers/gemini.ts to use the x-goog-api-key
header instead. The Gemini API supports this header.

Pattern:
BEFORE: `fetch(\`\${GEMINI_API_BASE}/models?key=\${apiKey}\`)`
AFTER:  `fetch(\`\${GEMINI_API_BASE}/models\`, { headers: { 'x-goog-api-key': apiKey } })`

**Acceptance criteria:**
- No ?key= query params in any fetch calls in gemini.ts
- x-goog-api-key header used in all fetch calls
- All existing tests still pass

### SC-002: Add Build Step to CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** nothing

Add `npm run build` step to .github/workflows/ci.yml after the test step.

**Acceptance criteria:**
- ci.yml contains build step
- Build step runs after test step

### SC-003: Encrypt API Keys at Rest
**Priority:** P1 | **Estimate:** 1h | **Depends on:** nothing

Use Web Crypto API to encrypt AI provider API keys before storing in IndexedDB.
Modify src/lib/ai/service.ts where keys are stored/retrieved (~lines 84-96).

Use AES-GCM encryption. For key derivation, use a device-derived approach
(e.g., generate a random key on first use, store in sessionStorage or
derive from a stable device identifier). The goal is defense-in-depth.

**Acceptance criteria:**
- API keys not stored as plaintext in IndexedDB
- Keys encrypted using Web Crypto API AES-GCM
- AI features still work after encryption

### SC-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** all above

1. Run `npm test` — verify all tests pass
2. Run `npm run build` — verify build passes
3. `git add` relevant files
4. `git commit -m "fix(security): use API key headers, encrypt storage, add CI build step"`
5. DO NOT run `git push` — the autopilot harness handles remote sync

**Acceptance criteria:**
- All changes committed
- Build passes
- Tests pass
- Goal-5 progress updated in project.yaml
