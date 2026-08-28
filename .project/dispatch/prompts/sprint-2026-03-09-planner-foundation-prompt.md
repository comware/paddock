# Sprint Dispatch: Planner Module Foundation

## Sprint
- ID: sprint-2026-03-09-planner-foundation
- Goal: goal-4 (Planner Module Foundation)
- Handoffs: 3 (2 implementation + commit-verify)
- Estimated: ~3h

## Context
The planner module already has solid infrastructure:
- **Store:** usePlannerStore with full CRUD, status lifecycle, linking, filters, selectors
- **Types:** Rich type system in types/planner.ts and types/eventTypes.ts
- **Integration:** usePlannerIntegration hook for Grow/Propagation cross-module linking
- **Calendar:** PlannerCalendar using react-big-calendar with event display
- **Components:** CalendarEvent, EventDetailModal

## What's Missing (this sprint fills these gaps)
1. **Event Creation Form** — Calendar can display events but has no UI to create them
2. **Event List/Detail Views** — Routes are commented out, no list or detail components
3. Goal progress needs updating from 0% to reflect existing + new work

## Handoff Order
1. `planner-001-event-create-form` — EventCreateForm + wire calendar slot → form
2. `planner-002-event-list-detail` — EventList + EventDetail + routes
3. `planner-999-commit-verify` — Commit, push, verify CI

## Patterns to Follow
- Component style: See existing PlannerCalendar.tsx, EventDetailModal.tsx
- Store usage: usePlannerStore() hook, see existing components
- Styling: Tailwind CSS with dark mode (dark: prefix), rounded-xl cards, slate colors
- Types: Import from '@/modules/planner/types' barrel
- Navigation: react-router-dom useNavigate, useParams

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
