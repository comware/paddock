# Contributing to Paddock

Thank you for your interest in contributing to Paddock, a local-first small farm management platform.

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

## Getting Started

```bash
# Clone the repository
git clone https://github.com/comware/paddock.git
cd paddock

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app runs at `http://localhost:5173` by default (Vite dev server).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Language | TypeScript (~5.9) |
| State | Zustand |
| Storage | IndexedDB via Dexie |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form + Zod |
| Routing | React Router 7 |
| Unit tests | Vitest + Testing Library |
| E2E tests | Playwright |
| Linting | ESLint 9 (flat config) |

## Project Structure

```
src/
  components/     # Shared UI components
  lib/            # Utilities, DB layer, AI service
  modules/
    grow/         # Microgreens tray tracking
    propagation/  # Plant propagation lifecycle
    planner/      # Crop calendar & events
    settings/     # App configuration
  stores/         # Global state (Zustand)
```

Each module follows a consistent internal structure:
- `components/` -- React components
- `stores/` -- Zustand stores
- `hooks/` -- Custom hooks
- `types/` -- TypeScript types
- `utils/` -- Module-specific utilities

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (single run) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:ui` | Open Vitest UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Open Playwright UI |

## Development Workflow

1. Create a feature branch from `main`.
2. Make your changes following the conventions below.
3. Ensure all checks pass before opening a PR:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
4. Open a pull request targeting `main`.

## Commit Messages

This project uses **Conventional Commits**. Format:

```
type(scope): short description
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

Scopes match module names: `grow`, `propagation`, `planner`, `settings`, `a11y`, `ci`, `coverage`.

Examples from this repo:
- `feat(planner): add event creation, list, and detail views`
- `fix(a11y): resolve 12 UX/UI accessibility findings`
- `test(coverage): add 7 test files for utilities and exporters`
- `refactor: split large stores and utils for code health`

## Coding Conventions

- **TypeScript** -- strict mode; avoid `any`.
- **Components** -- functional components with hooks; no class components.
- **State** -- use Zustand stores; keep stores focused on a single domain.
- **Styling** -- Tailwind CSS utility classes; avoid inline styles or CSS modules.
- **Validation** -- use Zod schemas for form and data validation.
- **Date handling** -- use `date-fns` (not native Date formatting).
- **Tests** -- co-locate tests in `__tests__/` directories next to source files.

## Testing Guidelines

- Write unit tests for stores, utilities, and non-trivial hooks.
- Use Testing Library for component tests (query by role/label, not implementation details).
- Use Playwright for critical user flows (E2E).
- Aim for meaningful coverage, not 100% line coverage.

## Data & Privacy

Paddock is offline-first and stores all data locally in IndexedDB. Never introduce network calls that transmit user farm data to external services without explicit opt-in.

## Questions?

Open a GitHub issue for bugs, feature requests, or questions about contributing.
