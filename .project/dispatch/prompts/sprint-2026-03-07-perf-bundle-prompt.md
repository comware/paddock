# Sprint: Performance — Bundle Splitting

**Sprint ID:** sprint-2026-03-07-perf-bundle
**Goal:** goal-6 (Performance — Bundle Splitting)
**Created:** 2026-03-07

## Mission

Split the 1.8MB main JS bundle. The root cause: src/routes.tsx statically imports
module route files which statically import ALL components, defeating React.lazy() 
code splitting. Also isolate react-big-calendar (~200KB) into its own vendor chunk.

**Exit criteria:**
- Main JS chunk under 500KB
- Route modules use lazy() component imports
- react-big-calendar in separate chunk
- All tests pass, build passes

**Project path:** /Users/jima/comware/workspace/paddock

## Key Codebase Context

- **Framework:** Vite + React + TypeScript (local-first PWA)
- **Build:** `npm run build` = `tsc -b && vite build`
- **Test:** `npm test` = `vitest run`
- **Package manager:** pnpm (pnpm-lock.yaml)
- **Router:** react-router-dom with createBrowserRouter
- **Bundle config:** vite.config.ts has manualChunks for vendor libs
- **Current main chunk:** index-*.js at 1,855 KB
- **Modules:** grow, propagation, planner, settings, markets, sales

## Current Architecture Problem

src/routes.tsx does:
```
import { growRoutes } from '@/modules/grow/routes';       // STATIC
import { propagationRoutes } from '@/modules/propagation/routes'; // STATIC
import { plannerRoutes } from '@/modules/planner/routes'; // STATIC
```

These route files statically import ALL components (TrayList, BatchList, etc.).
Even though routes.tsx uses React.lazy() for module entry points, the children
array imports pull everything into the main chunk.

## Handoff Execution Order

### PB-001: Move Route Children Inside Lazy Boundaries
**Priority:** P0 | **Estimate:** 1h | **Depends on:** nothing

Break the static import chain. Two valid approaches:

**Approach A (Recommended):** Remove static route imports from routes.tsx.
Use `path: 'grow/*'` with just the lazy module element. Each module's index.tsx
handles its own sub-routing internally using `<Routes>` or `useRoutes()`.

**Approach B:** Keep route structure in routes.tsx but lazy-load each route
component individually in the module route files (grow/routes.tsx etc).

Either way, the static import chain routes.tsx → module/routes.tsx → components
must be broken so Vite can code-split each module into separate chunks.

Important: Cross-module imports exist (propagation imports useSites from grow).
These shared stores should stay in a common chunk or be handled carefully.

**Acceptance criteria:**
- No static component imports in route files
- Main JS chunk under 500KB
- All tests pass
- Build succeeds

### PB-002: Isolate react-big-calendar in Separate Chunk
**Priority:** P1 | **Estimate:** 0.25h | **Depends on:** nothing

Add to vite.config.ts manualChunks:
```
'vendor-calendar': ['react-big-calendar'],
```

**Acceptance criteria:**
- react-big-calendar in manualChunks config
- Build produces vendor-calendar chunk
- Build succeeds

### PB-999: Commit and Verify CI
**Priority:** P0 | **Estimate:** 0.25h | **Depends on:** all above

1. Run `npm test` — verify all tests pass
2. Run `npm run build` — verify build passes and show chunk sizes
3. `git add` relevant files
4. `git commit -m "perf: split 1.8MB bundle via lazy routes and calendar chunk"`
5. DO NOT run `git push` — the autopilot harness handles remote sync

**Acceptance criteria:**
- All changes committed
- Build passes
- Tests pass
- Main chunk under 500KB
