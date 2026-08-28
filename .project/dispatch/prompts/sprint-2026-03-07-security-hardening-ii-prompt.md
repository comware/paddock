# Sprint: Security Hardening II — Crypto & CSP

**Sprint ID:** sprint-2026-03-07-security-hardening-ii
**Goal:** goal-8 (Security Hardening II — Crypto & CSP)
**Created:** 2026-03-07

## Mission

Fix crypto key storage (non-extractable CryptoKey), filter API keys from
recovery export, and add Content-Security-Policy meta tag. Addresses MED-1,
MED-2 from quick review (57/100).

**Exit criteria:**
- CryptoKey created with extractable: false in crypto.ts
- exportDataForRecovery filters out ai_api_key entries
- index.html contains CSP meta tag
- All 906+ tests still pass

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Build:** `pnpm run build` (tsc -b && vite build) — NOT Next.js
- **Test:** `pnpm vitest run` (906 tests across 26 test files)
- **Package manager:** pnpm (use pnpm, not npm or yarn)
- **Framework:** React + TypeScript + Vite + React Router
- **Database:** Dexie (IndexedDB wrapper) — local-first, no server
- **AI Service:** src/lib/ai/ — gemini.ts, openai.ts, anthropic.ts, service.ts
- **Crypto:** src/lib/ai/crypto.ts — AES-GCM encryption for API keys
- **Error Recovery:** src/lib/errorRecovery.ts — data backup/export
- **Platform DB:** src/lib/db/ — Dexie databases for app data
- **Entry point:** index.html → src/main.tsx

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

### SH-001: Fix CryptoKey to Non-Extractable
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** nothing

In src/lib/ai/crypto.ts, change CryptoKey generation to use extractable: false.
Store the CryptoKey in IndexedDB (non-extractable keys can be stored via
structured clone). Remove raw key material from localStorage. Keep backward
compat: if old localStorage key exists, import once into IDB then delete.

<comware:handoff_start id="sh-001-crypto-fix" />

**Tasks:**
1. Change generateKey to extractable: false
2. Create IDB storage for the CryptoKey (use platformDb or dedicated store)
3. Update getCryptoKey() to read from IDB
4. Add migration: import old localStorage key → IDB, delete from localStorage
5. Verify encrypt/decrypt still works

**Acceptance criteria:**
- CryptoKey generated with extractable: false
- No raw key material in localStorage
- Encrypt/decrypt still works (tests pass)
- Build succeeds

<comware:handoff_complete id="sh-001-crypto-fix" />

### SH-002: Filter API Keys from Recovery Export
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** nothing

In src/lib/errorRecovery.ts:237, filter the settings array from
platformDb.settings.toArray() to exclude entries matching ai_api_key patterns.

<comware:handoff_start id="sh-002-export-filter" />

**Tasks:**
1. After toArray(), filter out settings with keys matching /api_key/i or similar
2. Or mask values with "[REDACTED]" instead of removing
3. Verify build passes

**Acceptance criteria:**
- Settings export filters or redacts API key entries
- Build succeeds

<comware:handoff_complete id="sh-002-export-filter" />

### SH-003: Add Content-Security-Policy Meta Tag
**Priority:** P1 | **Estimate:** 0.25h | **Depends on:** nothing

Add a CSP meta tag to index.html with a reasonable policy for a local-first PWA.

<comware:handoff_start id="sh-003-csp-header" />

**Tasks:**
1. Add meta http-equiv="Content-Security-Policy" to index.html <head>
2. Set policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com; img-src 'self' data: blob:; font-src 'self'
3. Test that build works with CSP
4. Note if Vite dev server needs adjustment

**Acceptance criteria:**
- CSP meta tag exists in index.html
- Build succeeds

<comware:handoff_complete id="sh-003-csp-header" />

### SH-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** all above

1. Run pnpm vitest run — verify all tests pass
2. Run pnpm run build — verify build passes
3. git add modified files
4. git commit -m "fix(security): non-extractable crypto key, filter export, add CSP"
5. DO NOT run git push

<comware:handoff_start id="sh-999-commit-verify" />
<comware:handoff_complete id="sh-999-commit-verify" />
<comware:done />
