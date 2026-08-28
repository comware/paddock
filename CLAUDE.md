# Paddock - Farm Management Application

## Quick Reference

**Tech Stack:** Next.js (Vite), React, TypeScript, Zustand, IndexedDB (Dexie)
**Modules:** Grow (microgreens), Propagation (plant propagation), Planner (crop calendar), Settings
**Test Runner:** Vitest + Playwright (E2E)
**Build:** `npm run build` | **Test:** `npm test` | **Dev:** `npm run dev`

## Project Structure

```
src/
  components/     # Shared UI components
  lib/            # Utilities, DB, AI service
  modules/
    grow/         # Microgreens tray tracking
    propagation/  # Plant propagation lifecycle
    planner/      # Crop calendar & events
    settings/     # App configuration
  stores/         # Global state (Zustand)
```

## Sprint Management

- **Project config:** `.project/project.yaml`
- **Sprint templates:** `.project/sprints/templates/`
- **Active sprints:** `.project/sprints/active/`
- **Dispatch registry:** `.project/dispatch/registry.json`

## Commands

| Action | Command |
|--------|---------|
| Project status | `/project:status` |
| Plan sprint | `/project:sprint-workshop` |
| Dispatch sprint | `/project:sprint-dispatch` |
| Next step | `/project:next` |
| Health check | `/project:health-check` |
