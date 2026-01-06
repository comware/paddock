# Product Requirements Document
## Paddock Platform - Grow Module

**Document Version**: 2.0
**Date**: January 2026
**Author**: Chief of Staff Agent
**Status**: Ready for Development

---

## 1. Executive Summary

### 1.1 Platform Context

**Paddock** is a local-first platform for managing a small farm operation. It consists of multiple modules that will be developed incrementally as the business evolves:

| Module | Purpose | Status |
|--------|---------|--------|
| **Grow** | Microgreens experiment tracking | This PRD |
| Sales | Orders, invoicing, payments | Future |
| Markets | Stall planning, inventory, schedules | Future |
| CRM | Restaurant & customer relationships | Future |
| Finance | Costs, revenue, projections | Future |
| Planner | Crop calendar, succession planning | Future |

This PRD covers the **Grow** module - the first module to be built, focused on the 6-week microgreens validation experiment.

### 1.2 Problem Statement

A prospective small-farm operator is running a 6-week microgreens experiment to validate whether they can reliably grow quality produce and whether they enjoy the work. Currently, tracking is done via CSV spreadsheets which are:
- Cumbersome to update (especially from mobile while in the growing area)
- Prone to data entry errors
- Lacking automatic calculations and visualizations
- Not providing real-time feedback on progress toward goals

### 1.3 Solution

The **Paddock Grow** module - a page within the Paddock platform providing:
- Quick data entry optimized for daily use
- Automatic calculations (yield ratios, success rates, time totals)
- Visual progress tracking toward Week 6 decision criteria
- Local persistence with no server required
- Optional biometric authentication (Touch ID on Mac)

### 1.4 Success Criteria

| Metric | Target |
|--------|--------|
| Daily log entry time | < 2 minutes |
| Tray entry time | < 30 seconds |
| Data survives browser refresh | 100% |
| Works offline | Yes |
| Mobile-friendly | Yes (responsive) |

---

## 2. Platform Architecture

### 2.1 Overview

Paddock is a **local-first monorepo** application designed to run on a developer's workstation. All modules share:
- A common shell/layout with navigation
- A unified IndexedDB database (one database, multiple object stores)
- Shared UI components and design system
- Common utilities (date handling, calculations, export)

```
┌─────────────────────────────────────────────────────────────────┐
│                        PADDOCK SHELL                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🌱 Paddock         [Grow] [Sales] [Markets] [...] [⚙️]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │                    MODULE CONTENT                        │  │
│  │                  (e.g., Grow Module)                     │  │
│  │                                                          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Dashboard] [Trays] [Daily Log] [Time] [Analytics]      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Navigation Hierarchy

```
Paddock (Platform)
├── Grow (Module) ← This PRD
│   ├── Dashboard
│   ├── Trays
│   ├── Daily Log
│   ├── Time Tracking
│   ├── Analytics
│   └── Decision Scorecard
├── Sales (Future)
├── Markets (Future)
├── CRM (Future)
├── Finance (Future)
├── Planner (Future)
└── Settings (Platform-level)
    ├── Data Export/Import
    ├── Security (Biometric)
    └── Preferences
```

### 2.3 Authentication (Optional Biometric)

Since this runs locally on a personal workstation, full authentication is not required. However, for convenience and light security, **optional biometric authentication** using Touch ID (Mac) or Windows Hello can be enabled.

**Implementation: WebAuthn API**

The Web Authentication API (WebAuthn) allows passwordless authentication using platform authenticators like Touch ID.

```typescript
// lib/auth/biometric.ts

interface BiometricAuth {
  isAvailable: () => Promise<boolean>;
  enroll: () => Promise<boolean>;
  verify: () => Promise<boolean>;
  isEnabled: () => boolean;
  disable: () => void;
}

export const biometricAuth: BiometricAuth = {
  // Check if platform supports WebAuthn with platform authenticator
  isAvailable: async (): Promise<boolean> => {
    if (!window.PublicKeyCredential) return false;

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  // Enroll biometric (creates credential stored in browser)
  enroll: async (): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Paddock',
            id: 'localhost'  // Works for local development
          },
          user: {
            id: userId,
            name: 'paddock-user',
            displayName: 'Paddock User'
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',  // Touch ID, Windows Hello
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000
        }
      });

      if (credential) {
        // Store credential ID for future verification
        const credentialId = (credential as PublicKeyCredential).rawId;
        localStorage.setItem('paddock_credential_id',
          btoa(String.fromCharCode(...new Uint8Array(credentialId)))
        );
        localStorage.setItem('paddock_biometric_enabled', 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric enrollment failed:', error);
      return false;
    }
  },

  // Verify with biometric
  verify: async (): Promise<boolean> => {
    const credentialIdBase64 = localStorage.getItem('paddock_credential_id');
    if (!credentialIdBase64) return false;

    try {
      const credentialId = Uint8Array.from(atob(credentialIdBase64), c => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: 'localhost',
          allowCredentials: [{
            type: 'public-key',
            id: credentialId,
            transports: ['internal']
          }],
          userVerification: 'required',
          timeout: 60000
        }
      });

      return assertion !== null;
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return false;
    }
  },

  isEnabled: (): boolean => {
    return localStorage.getItem('paddock_biometric_enabled') === 'true';
  },

  disable: (): void => {
    localStorage.removeItem('paddock_credential_id');
    localStorage.removeItem('paddock_biometric_enabled');
  }
};
```

**User Flow:**

1. **First Launch**: App loads directly (no auth required by default)
2. **Enable Biometric** (optional via Settings):
   - User clicks "Enable Touch ID"
   - System prompts for fingerprint
   - Credential stored locally
3. **Subsequent Launches** (if enabled):
   - Lock screen appears
   - User touches Touch ID sensor
   - App unlocks

**Lock Screen Component:**

```typescript
// components/LockScreen.tsx
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'failed'>('idle');

  const handleUnlock = async () => {
    setStatus('verifying');
    const success = await biometricAuth.verify();
    if (success) {
      onUnlock();
    } else {
      setStatus('failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900">
      <div className="text-6xl mb-8">🌱</div>
      <h1 className="text-2xl font-bold text-white mb-4">Paddock</h1>
      <button
        onClick={handleUnlock}
        disabled={status === 'verifying'}
        className="px-6 py-3 bg-green-600 text-white rounded-lg"
      >
        {status === 'verifying' ? 'Verifying...' : '🔐 Unlock with Touch ID'}
      </button>
      {status === 'failed' && (
        <p className="text-red-400 mt-4">Verification failed. Try again.</p>
      )}
      <button
        onClick={onUnlock}
        className="mt-8 text-slate-400 text-sm underline"
      >
        Skip (disable biometric in settings)
      </button>
    </div>
  );
}
```

**Requirements:**
- WebAuthn only works on HTTPS or localhost (✓ for local dev)
- Works in Chrome, Safari, Firefox, Edge
- Touch ID on Mac requires Safari or Chrome
- Falls back gracefully if unavailable

---

## 3. User Personas

### 3.1 Primary User: The Experimenter

**Name**: Jamie (representing the user)
**Context**: Running a 6-week microgreens validation experiment at home
**Technical Level**: Developer (building this app themselves)
**Usage Pattern**:
- Quick morning check-in (2 min) while checking trays
- Longer weekly review session (15-30 min)
- Final Week 6 decision analysis

**Needs**:
- Fast data entry, especially from phone
- See progress at a glance
- Know if they're on track for "Hell Yes" criteria
- Export data for backup/analysis

---

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 Dashboard (Home)

**Purpose**: At-a-glance view of experiment status

**Requirements**:
- Display current week and day of experiment
- Show active trays count (blackout vs. light phase)
- Display key metrics:
  - Total trays planted
  - Success rate (A+B grades / total harvested)
  - Average yield ratio
  - Total time logged this week
- Progress indicators for Week 6 decision criteria:
  - [ ] 20+ trays planted
  - [ ] 80%+ success rate
  - [ ] Fit score tracking
- Quick action buttons:
  - "Log Daily Observation"
  - "New Tray"
  - "Record Harvest"
  - "Log Time"

#### 3.1.2 Tray Management

**Purpose**: Track each tray from sowing to harvest

**Data Model - Tray**:
```typescript
interface Tray {
  id: string;                    // UUID
  trayNumber: number;            // Sequential (1, 2, 3...)
  variety: 'sunflower' | 'pea' | 'radish' | 'broccoli' | string;
  dateSown: Date;
  seedWeight: number;            // grams
  growingMedium: 'coco_coir' | 'soil' | 'hemp_mat' | string;
  preSoaked: boolean;

  // Blackout phase
  blackoutDays: number;
  dateToLight: Date | null;
  germinationRate: number | null; // percentage

  // Harvest
  dateHarvested: Date | null;
  harvestWeight: number | null;  // grams
  qualityGrade: 'A' | 'B' | 'C' | 'F' | null;
  sellable: boolean | null;

  // Meta
  problemsObserved: string;
  lessonsLearned: string;
  photoUrl: string | null;       // local file path or data URL

  // Computed (derived, not stored)
  // daysToHarvest: number
  // yieldRatio: number
  // status: 'blackout' | 'light' | 'harvested' | 'failed'
}
```

**Features**:
- List view of all trays with status indicators
- Filter by: status (active/harvested/failed), variety, week
- Sort by: date sown, tray number, variety
- Quick status update buttons (move to light, mark harvested)
- Form for new tray with smart defaults:
  - Auto-increment tray number
  - Remember last variety used
  - Default blackout days by variety
- Harvest form with:
  - Weight input
  - Quality grade selector (visual: A=green, B=yellow, C=orange, F=red)
  - Auto-calculate yield ratio
  - Problems/lessons text fields

#### 3.1.3 Daily Log

**Purpose**: Quick daily observations journal

**Data Model - DailyObservation**:
```typescript
interface DailyObservation {
  id: string;
  date: Date;                    // Unique per day
  week: number;                  // 1-6
  dayOfWeek: number;             // 1-7

  // Conditions
  temperature: number | null;    // Celsius
  humidity: number | null;       // Percentage

  // Tray counts (can be auto-calculated from Tray data)
  traysBlackout: number;
  traysLight: number;
  traysHarvestedToday: number;

  // Journal
  problemsSpotted: string;
  actionsTaken: string;
  moodEnergy: number;            // 1-10 scale
  keyLearning: string;
  tomorrowPriority: string;
}
```

**Features**:
- Single form for today's entry
- Mood/energy slider (1-10) with emoji feedback
- Auto-populate tray counts from Tray data
- View past entries in calendar or list view
- Mood trend visualization over time

#### 3.1.4 Time Tracking

**Purpose**: Accurate time spent on growing tasks

**Data Model - TimeEntry**:
```typescript
interface TimeEntry {
  id: string;
  date: Date;
  week: number;

  // Time in minutes per category
  wateringChecking: number;
  sowing: number;
  harvesting: number;
  packaging: number;
  cleanup: number;
  researchLearning: number;
  other: number;

  notes: string;
}
```

**Features**:
- Quick time entry form with +5, +10, +15, +30 minute buttons
- Running timer option (start/stop for each category)
- Daily and weekly totals auto-calculated
- Visual comparison: actual vs. target (8-10 hrs/week)
- Category breakdown pie chart

#### 3.1.5 Variety Analytics

**Purpose**: Compare performance across varieties

**Derived from Tray data** (computed, not stored separately):

**Features**:
- Per-variety stats table:
  - Trays grown
  - Success rate
  - Average yield ratio
  - Average days to harvest
  - Grade distribution
- Profitability calculator:
  - Input: seed cost per kg, price per punnet
  - Output: margin per tray
- Recommendation: "Best performing variety" highlight
- Visual: Bar chart comparing varieties

#### 3.1.6 Week 6 Decision Scorecard

**Purpose**: Final go/no-go analysis

**Data Model - DecisionScorecard**:
```typescript
interface DecisionScorecard {
  id: string;
  completedDate: Date;

  // Personal fit (stored)
  enjoyedRoutine: number;        // 1-10
  satisfiedGrowing: number;
  comfortableFailures: number;
  maintainedConsistency: number;
  familySupportive: number;
  willingToScale: number;

  // Computed metrics (pulled from other data)
  // totalTraysPlanted: number
  // successRate: number
  // avgYieldRatio: number
  // totalTimeHours: number
  // etc.

  // Decision
  decision: 'hell_yes' | 'extend' | 'pivot' | 'stop' | null;

  // Reflections
  surprises: string;
  harderThanExpected: string;
  easierThanExpected: string;
  wouldDoDifferently: string;
  neededForConfidence: string;
}
```

**Features**:
- Auto-populate all metrics from tracked data
- Personal fit questionnaire with sliders
- Visual pass/fail indicators for each criterion
- Decision selection with guided prompts
- Final summary exportable as PDF/markdown

#### 3.1.7 Data Management

**Features**:
- Export all data as JSON (backup)
- Import from JSON (restore)
- Export as CSV (for spreadsheet analysis)
- Clear all data (with confirmation)
- View raw data (debug mode)

---

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
- Initial load: < 2 seconds
- Data operations: < 100ms
- Works smoothly with 100+ trays

#### 3.2.2 Reliability
- Data persists across browser sessions
- Survives browser crashes (auto-save)
- No data loss on refresh

#### 3.2.3 Usability
- Mobile-first responsive design
- Works on phone while standing in growing area
- Large touch targets (44px minimum)
- Dark mode option (reduce eye strain in dark growing area)

#### 3.2.4 Compatibility
- Modern browsers: Chrome, Firefox, Safari, Edge
- No IE11 support required
- Progressive Web App (PWA) capable for home screen install

---

## 4. Technical Specifications

### 4.1 Recommended Stack

**For a developer building for personal use:**

| Layer | Recommendation | Rationale |
|-------|----------------|-----------|
| Framework | React + Vite | Fast dev experience, familiar ecosystem |
| Styling | Tailwind CSS | Rapid UI development, utility-first |
| State | Zustand or Jotai | Lightweight, no boilerplate |
| Persistence | Dexie.js (IndexedDB) | See 4.2 below |
| Charts | Recharts or Chart.js | Simple, React-friendly |
| Forms | React Hook Form | Lightweight, good DX |
| Date handling | date-fns | Lightweight, immutable |

**Alternative minimal stack:**
- Vanilla JS + Alpine.js
- Water.css or Pico CSS
- localStorage (for <5MB data)

### 4.2 Local Persistence Solution

**Recommended: Dexie.js wrapping IndexedDB**

**Why IndexedDB over localStorage:**
- localStorage: 5MB limit, synchronous (blocks UI), string-only
- IndexedDB: ~50MB+ limit, async, stores objects natively

**Why Dexie.js:**
- Clean Promise-based API
- Handles schema migrations
- Query syntax similar to MongoDB
- Well-maintained, small bundle

**Database Schema:**

```typescript
// db.ts
import Dexie, { Table } from 'dexie';

interface Tray {
  id?: string;
  trayNumber: number;
  variety: string;
  dateSown: Date;
  seedWeight: number;
  growingMedium: string;
  preSoaked: boolean;
  blackoutDays: number;
  dateToLight?: Date;
  germinationRate?: number;
  dateHarvested?: Date;
  harvestWeight?: number;
  qualityGrade?: 'A' | 'B' | 'C' | 'F';
  sellable?: boolean;
  problemsObserved: string;
  lessonsLearned: string;
  photoUrl?: string;
}

interface DailyObservation {
  id?: string;
  date: Date;
  week: number;
  dayOfWeek: number;
  temperature?: number;
  humidity?: number;
  traysBlackout: number;
  traysLight: number;
  traysHarvestedToday: number;
  problemsSpotted: string;
  actionsTaken: string;
  moodEnergy: number;
  keyLearning: string;
  tomorrowPriority: string;
}

interface TimeEntry {
  id?: string;
  date: Date;
  week: number;
  wateringChecking: number;
  sowing: number;
  harvesting: number;
  packaging: number;
  cleanup: number;
  researchLearning: number;
  other: number;
  notes: string;
}

interface VarietyConfig {
  id?: string;
  name: string;
  seedCostPerKg: number;
  defaultBlackoutDays: number;
  preSoakRequired: boolean;
  typicalDaysToHarvest: number;
}

interface ExperimentConfig {
  id?: string;
  startDate: Date;
  targetTrays: number;
  targetSuccessRate: number;
  targetHoursPerWeek: number;
}

interface DecisionScorecard {
  id?: string;
  completedDate: Date;
  enjoyedRoutine: number;
  satisfiedGrowing: number;
  comfortableFailures: number;
  maintainedConsistency: number;
  familySupportive: number;
  willingToScale: number;
  decision?: 'hell_yes' | 'extend' | 'pivot' | 'stop';
  surprises: string;
  harderThanExpected: string;
  easierThanExpected: string;
  wouldDoDifferently: string;
  neededForConfidence: string;
}

class MicrogreensDB extends Dexie {
  trays!: Table<Tray>;
  dailyObservations!: Table<DailyObservation>;
  timeEntries!: Table<TimeEntry>;
  varietyConfigs!: Table<VarietyConfig>;
  experimentConfig!: Table<ExperimentConfig>;
  decisionScorecard!: Table<DecisionScorecard>;

  constructor() {
    super('MicrogreensTracker');

    this.version(1).stores({
      trays: '++id, trayNumber, variety, dateSown, dateHarvested',
      dailyObservations: '++id, &date, week',
      timeEntries: '++id, date, week',
      varietyConfigs: '++id, &name',
      experimentConfig: '++id',
      decisionScorecard: '++id, completedDate'
    });
  }
}

export const db = new MicrogreensDB();
```

**Alternative: localStorage with JSON**

For absolute simplicity (if data stays under 5MB):

```typescript
// Simple localStorage wrapper
const STORAGE_KEY = 'microgreens_data';

interface AppData {
  trays: Tray[];
  dailyObservations: DailyObservation[];
  timeEntries: TimeEntry[];
  varietyConfigs: VarietyConfig[];
  experimentConfig: ExperimentConfig | null;
  decisionScorecard: DecisionScorecard | null;
}

export const storage = {
  load: (): AppData => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    return JSON.parse(raw, dateReviver);
  },

  save: (data: AppData): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  export: (): string => {
    return localStorage.getItem(STORAGE_KEY) || '{}';
  },

  import: (json: string): void => {
    localStorage.setItem(STORAGE_KEY, json);
  }
};

// Handle Date serialization
function dateReviver(key: string, value: any) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value);
  }
  return value;
}
```

### 4.3 File Structure (Platform Monorepo)

```
paddock/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Root app with routing
│   ├── routes.tsx                 # Platform route definitions
│   │
│   ├── lib/                       # Shared platform libraries
│   │   ├── db/
│   │   │   ├── index.ts           # Dexie setup (unified database)
│   │   │   ├── schema.ts          # All table definitions
│   │   │   └── migrations.ts
│   │   ├── auth/
│   │   │   └── biometric.ts       # Touch ID / WebAuthn
│   │   └── utils/
│   │       ├── calculations.ts
│   │       ├── dateHelpers.ts
│   │       └── exporters.ts
│   │
│   ├── components/                # Shared UI components
│   │   ├── Shell/                 # Platform shell
│   │   │   ├── AppShell.tsx       # Main layout wrapper
│   │   │   ├── TopNav.tsx         # Module switcher (Grow, Sales, etc.)
│   │   │   ├── ModuleNav.tsx      # Sub-navigation within module
│   │   │   └── LockScreen.tsx     # Biometric lock
│   │   ├── ui/                    # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Slider.tsx
│   │   └── shared/                # Reusable composed components
│   │       ├── MetricsCard.tsx
│   │       ├── DataTable.tsx
│   │       └── Chart.tsx
│   │
│   ├── modules/                   # Feature modules (one per business area)
│   │   │
│   │   ├── grow/                  # ← THIS PRD
│   │   │   ├── index.tsx          # Module entry point
│   │   │   ├── routes.tsx         # Grow-specific routes
│   │   │   ├── stores/
│   │   │   │   ├── useTrays.ts
│   │   │   │   ├── useObservations.ts
│   │   │   │   ├── useTimeEntries.ts
│   │   │   │   └── useExperiment.ts
│   │   │   ├── components/
│   │   │   │   ├── Dashboard/
│   │   │   │   │   ├── GrowDashboard.tsx
│   │   │   │   │   ├── ProgressIndicator.tsx
│   │   │   │   │   └── QuickActions.tsx
│   │   │   │   ├── Trays/
│   │   │   │   │   ├── TrayList.tsx
│   │   │   │   │   ├── TrayCard.tsx
│   │   │   │   │   ├── NewTrayForm.tsx
│   │   │   │   │   ├── HarvestForm.tsx
│   │   │   │   │   └── TrayDetail.tsx
│   │   │   │   ├── DailyLog/
│   │   │   │   │   ├── DailyLogForm.tsx
│   │   │   │   │   ├── MoodSlider.tsx
│   │   │   │   │   └── LogHistory.tsx
│   │   │   │   ├── TimeTracking/
│   │   │   │   │   ├── TimeEntryForm.tsx
│   │   │   │   │   ├── TimeStats.tsx
│   │   │   │   │   └── CategoryPieChart.tsx
│   │   │   │   ├── Analytics/
│   │   │   │   │   ├── VarietyComparison.tsx
│   │   │   │   │   ├── YieldChart.tsx
│   │   │   │   │   └── TrendLines.tsx
│   │   │   │   └── Decision/
│   │   │   │       ├── Scorecard.tsx
│   │   │   │       ├── FitQuestionnaire.tsx
│   │   │   │       └── CriteriaChecklist.tsx
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── sales/                 # Future module
│   │   │   └── index.tsx          # Placeholder
│   │   │
│   │   ├── markets/               # Future module
│   │   │   └── index.tsx          # Placeholder
│   │   │
│   │   └── settings/              # Platform settings
│   │       ├── index.tsx
│   │       ├── DataExport.tsx
│   │       ├── DataImport.tsx
│   │       ├── BiometricSettings.tsx
│   │       └── Preferences.tsx
│   │
│   └── types/
│       └── index.ts               # Shared type definitions
│
└── public/
    ├── favicon.ico
    └── manifest.json              # PWA manifest
```

### 4.4 Routing Structure

```typescript
// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/Shell/AppShell';

// Module lazy loading
const GrowModule = lazy(() => import('./modules/grow'));
const SalesModule = lazy(() => import('./modules/sales'));
const SettingsModule = lazy(() => import('./modules/settings'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      // Default redirect to Grow module
      { index: true, element: <Navigate to="/grow" replace /> },

      // Grow module routes
      {
        path: 'grow/*',
        element: <GrowModule />,
      },

      // Future modules (placeholder pages for now)
      {
        path: 'sales/*',
        element: <SalesModule />,
      },
      {
        path: 'markets/*',
        element: <ComingSoon module="Markets" />,
      },
      {
        path: 'crm/*',
        element: <ComingSoon module="CRM" />,
      },
      {
        path: 'finance/*',
        element: <ComingSoon module="Finance" />,
      },
      {
        path: 'planner/*',
        element: <ComingSoon module="Planner" />,
      },

      // Platform settings
      {
        path: 'settings/*',
        element: <SettingsModule />,
      },
    ],
  },
]);
```

### 4.5 Unified Database Schema

All modules share one IndexedDB database with namespaced tables:

```typescript
// src/lib/db/schema.ts
import Dexie, { Table } from 'dexie';

// ============================================
// GROW MODULE TABLES
// ============================================
interface GrowTray {
  id?: string;
  trayNumber: number;
  variety: string;
  dateSown: Date;
  seedWeight: number;
  growingMedium: string;
  preSoaked: boolean;
  blackoutDays: number;
  dateToLight?: Date;
  germinationRate?: number;
  dateHarvested?: Date;
  harvestWeight?: number;
  qualityGrade?: 'A' | 'B' | 'C' | 'F';
  sellable?: boolean;
  problemsObserved: string;
  lessonsLearned: string;
  photoUrl?: string;
}

interface GrowObservation { /* ... as before ... */ }
interface GrowTimeEntry { /* ... as before ... */ }
interface GrowVarietyConfig { /* ... as before ... */ }
interface GrowExperiment { /* ... as before ... */ }
interface GrowDecision { /* ... as before ... */ }

// ============================================
// FUTURE MODULE TABLES (placeholders)
// ============================================
interface SalesOrder {
  id?: string;
  // ... future
}

interface MarketEvent {
  id?: string;
  // ... future
}

// ============================================
// PLATFORM TABLES
// ============================================
interface PlatformSettings {
  id?: string;
  key: string;
  value: any;
}

// ============================================
// DATABASE CLASS
// ============================================
class PaddockDB extends Dexie {
  // Grow module
  growTrays!: Table<GrowTray>;
  growObservations!: Table<GrowObservation>;
  growTimeEntries!: Table<GrowTimeEntry>;
  growVarietyConfigs!: Table<GrowVarietyConfig>;
  growExperiments!: Table<GrowExperiment>;
  growDecisions!: Table<GrowDecision>;

  // Future modules
  salesOrders!: Table<SalesOrder>;
  marketEvents!: Table<MarketEvent>;

  // Platform
  platformSettings!: Table<PlatformSettings>;

  constructor() {
    super('Paddock');

    this.version(1).stores({
      // Grow module
      growTrays: '++id, trayNumber, variety, dateSown, dateHarvested',
      growObservations: '++id, &date, week',
      growTimeEntries: '++id, date, week',
      growVarietyConfigs: '++id, &name',
      growExperiments: '++id',
      growDecisions: '++id, completedDate',

      // Future modules (empty for now, schema defined when built)
      salesOrders: '++id',
      marketEvents: '++id',

      // Platform
      platformSettings: '++id, &key',
    });
  }
}

export const db = new PaddockDB();

// Convenience exports for modules
export const growDb = {
  trays: db.growTrays,
  observations: db.growObservations,
  timeEntries: db.growTimeEntries,
  varietyConfigs: db.growVarietyConfigs,
  experiments: db.growExperiments,
  decisions: db.growDecisions,
};
```

---

## 5. User Interface Specifications

### 5.1 Navigation Structure

**Platform Level (Top Bar):**
```
┌─────────────────────────────────────────────────────────────┐
│  🌱 Paddock    [Grow] [Sales] [Markets] [CRM] [···] [⚙️]   │
└─────────────────────────────────────────────────────────────┘
```

**Module Level (Within Grow):**
```
[Dashboard] - [Trays] - [Daily Log] - [Time] - [Analytics] - [Decision]
```

- **Desktop**: Top bar for platform nav + left sidebar or tabs for module nav
- **Mobile**: Top bar for platform (hamburger menu) + bottom tabs for module nav

### 5.2 Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  🌱 Paddock    [Grow•] [Sales] [Markets] [···]       [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│  GROW MODULE                               Week 3, Day 4    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 12 Trays     │ │ 83% Success  │ │ 2.4 Yield    │        │
│  │ Planted      │ │ Rate         │ │ Ratio        │        │
│  │ Target: 20   │ │ Target: 80%  │ │ (harvest/seed)│        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐                         │
│  │ 8.5 hrs      │ │ 7/10 Avg     │                         │
│  │ This Week    │ │ Mood         │                         │
│  │ Target: 10   │ │              │                         │
│  └──────────────┘ └──────────────┘                         │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  ACTIVE TRAYS                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🌑 Blackout: 4 trays    │ 💡 Light: 3 trays        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  QUICK ACTIONS                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ + New Tray │ │ 📝 Log Day │ │ ⏱️ Log Time │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  READY TO HARVEST                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tray #8 - Sunflower - Day 12 - Ready! [Harvest]     │   │
│  │ Tray #9 - Radish - Day 8 - Ready! [Harvest]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Key UI Components

#### Quick Tray Entry (Modal)
```
┌─────────────────────────────────────┐
│ New Tray                        [X] │
├─────────────────────────────────────┤
│ Variety:  [Sunflower ▼]             │
│                                     │
│ Seed Weight:  [___] g               │
│               [50] [80] [100]       │
│                                     │
│ Medium:   [Coco Coir ▼]             │
│                                     │
│ Pre-soaked: [✓] Yes                 │
│                                     │
│ Blackout days: [4]                  │
│                                     │
│ ──────────────────────────────────  │
│ [Cancel]              [Save Tray]   │
└─────────────────────────────────────┘
```

#### Harvest Entry (Modal)
```
┌─────────────────────────────────────┐
│ Harvest Tray #8 - Sunflower     [X] │
├─────────────────────────────────────┤
│ Days grown: 12                      │
│ Seed weight: 80g                    │
│                                     │
│ Harvest Weight:  [___] g            │
│                                     │
│ Quality Grade:                      │
│ [🟢 A] [🟡 B] [🟠 C] [🔴 F]         │
│                                     │
│ Sellable?  [Yes] [No]               │
│                                     │
│ Yield Ratio: 2.5x (calculated)      │
│                                     │
│ Problems observed:                  │
│ [________________________]          │
│                                     │
│ Lessons learned:                    │
│ [________________________]          │
│                                     │
│ ──────────────────────────────────  │
│ [Cancel]         [Record Harvest]   │
└─────────────────────────────────────┘
```

#### Mood Slider
```
How are you feeling about the experiment today?

😫 ─────────●───────────── 😊
1  2  3  4  5  6  7  8  9  10
           [7]
```

### 5.4 Color Palette

```css
:root {
  /* Primary - Growth Green */
  --primary-50: #f0fdf4;
  --primary-500: #22c55e;
  --primary-700: #15803d;

  /* Grades */
  --grade-a: #22c55e;  /* Green */
  --grade-b: #eab308;  /* Yellow */
  --grade-c: #f97316;  /* Orange */
  --grade-f: #ef4444;  /* Red */

  /* Status */
  --blackout: #1e293b;  /* Dark slate */
  --light: #fef08a;     /* Light yellow */
  --harvested: #86efac; /* Light green */

  /* Neutral */
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #1e293b;
  --muted: #64748b;
}

/* Dark mode */
.dark {
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #f1f5f9;
  --muted: #94a3b8;
}
```

---

## 6. Implementation Phases

### Phase 1: Core MVP (Days 1-3)

**Goal**: Basic tray tracking and persistence

- [ ] Project setup (Vite + React + Tailwind + Dexie)
- [ ] Database schema implementation
- [ ] Tray CRUD operations
- [ ] Basic tray list view
- [ ] New tray form
- [ ] Harvest recording
- [ ] Data persists across refresh

**Deliverable**: Can add trays, record harvests, data survives refresh

### Phase 2: Daily Operations (Days 4-5)

**Goal**: Day-to-day tracking flows

- [ ] Dashboard with metrics
- [ ] Daily observation form
- [ ] Time tracking form
- [ ] Quick action buttons
- [ ] Mobile-responsive layout

**Deliverable**: Complete daily workflow functional

### Phase 3: Analytics & Decision (Days 6-7)

**Goal**: Insights and final decision support

- [ ] Variety performance comparison
- [ ] Week 6 scorecard
- [ ] Personal fit questionnaire
- [ ] Progress toward criteria visualization
- [ ] Data export/import

**Deliverable**: Full experiment tracking and decision support

### Phase 4: Polish (Day 8+)

**Goal**: Quality of life improvements

- [ ] Dark mode
- [ ] PWA manifest (installable)
- [ ] Keyboard shortcuts
- [ ] Undo for accidental deletes
- [ ] Photo attachment (file or camera)

---

## 7. Out of Scope (v1)

The following are explicitly NOT included in v1:

- Cloud sync / multi-device
- User authentication
- Sharing / collaboration
- Native mobile app
- Automated reminders / notifications
- Integration with external services
- Print-formatted reports
- Historical experiment comparison (multiple 6-week cycles)

These may be considered for future versions if the farm venture proceeds.

---

## 8. Acceptance Criteria

### 8.1 Tray Management
- [ ] Can create a new tray with all required fields
- [ ] Can view list of all trays with status indicators
- [ ] Can filter trays by status and variety
- [ ] Can record harvest with weight and grade
- [ ] Yield ratio auto-calculates correctly
- [ ] Tray status progresses: blackout → light → harvested

### 8.2 Daily Logging
- [ ] Can log daily observation with all fields
- [ ] Only one entry per day (updates if exists)
- [ ] Mood slider works and displays emoji feedback
- [ ] Can view history of past observations

### 8.3 Time Tracking
- [ ] Can log time by category
- [ ] Weekly totals calculate correctly
- [ ] Can see comparison to target hours

### 8.4 Analytics
- [ ] Variety comparison shows correct aggregated stats
- [ ] Success rate calculates correctly (A+B / total harvested)
- [ ] Charts render without errors

### 8.5 Decision Scorecard
- [ ] All metrics auto-populate from tracked data
- [ ] Personal fit questionnaire captures all 6 factors
- [ ] Total fit score calculates correctly
- [ ] Pass/fail criteria display correctly

### 8.6 Data Persistence
- [ ] All data survives browser refresh
- [ ] Can export all data as JSON
- [ ] Can import from JSON backup
- [ ] Can export trays as CSV
- [ ] Can clear all data (with confirmation)

### 8.7 Usability
- [ ] Works on mobile viewport (375px width)
- [ ] Touch targets are at least 44px
- [ ] Dark mode toggles correctly
- [ ] No horizontal scroll on mobile

---

## 9. Appendix

### 9.1 Seed Data

Pre-populate variety configurations:

```typescript
const defaultVarieties: VarietyConfig[] = [
  {
    name: 'Sunflower',
    seedCostPerKg: 35,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 12
  },
  {
    name: 'Pea Shoots',
    seedCostPerKg: 30,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 12
  },
  {
    name: 'Radish',
    seedCostPerKg: 80,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8
  },
  {
    name: 'Broccoli',
    seedCostPerKg: 200,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 10
  }
];
```

### 9.2 Calculation Formulas

```typescript
// Yield ratio
const yieldRatio = harvestWeight / seedWeight;

// Success rate
const successRate = trays
  .filter(t => t.dateHarvested && ['A', 'B'].includes(t.qualityGrade))
  .length / trays.filter(t => t.dateHarvested).length;

// Current week of experiment
const currentWeek = Math.ceil(
  (Date.now() - experimentStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
);

// Total time this week
const weeklyTime = timeEntries
  .filter(e => e.week === currentWeek)
  .reduce((sum, e) => sum +
    e.wateringChecking + e.sowing + e.harvesting +
    e.packaging + e.cleanup + e.researchLearning + e.other
  , 0);

// Fit score
const fitScore =
  enjoyedRoutine + satisfiedGrowing + comfortableFailures +
  maintainedConsistency + familySupportive + willingToScale;
```

### 9.3 Local Development Commands

```bash
# Create project
npm create vite@latest paddock -- --template react-ts

# Install dependencies
cd paddock
npm install dexie react-router-dom tailwindcss postcss autoprefixer
npm install @tailwindcss/forms recharts date-fns zustand
npm install -D @types/node

# Initialize Tailwind
npx tailwindcss init -p

# Run development server
npm run dev
# App available at http://localhost:5173

# Build for production (still local, just optimized)
npm run build
npm run preview
```

### 9.4 Biometric Auth Testing

```bash
# WebAuthn requires localhost or HTTPS
# Vite dev server on localhost:5173 works perfectly

# To test on mobile (same network), use:
npm run dev -- --host

# Note: Biometric won't work over non-HTTPS on mobile
# For mobile testing, consider using a tunnel like:
npx localtunnel --port 5173
```

---

## 10. Future Module Placeholders

When the farm venture proceeds past validation, additional modules can be added:

| Module | Trigger | Key Features |
|--------|---------|--------------|
| **Sales** | First market stall | Orders, invoicing, payment tracking |
| **Markets** | Regular market attendance | Stall planning, inventory per market, schedules |
| **CRM** | Restaurant outreach | Contact management, order history, preferences |
| **Finance** | Commercial operation | Revenue tracking, costs, P&L, projections |
| **Planner** | Multi-crop operation | Crop calendar, succession planning, harvest forecasting |

Each module will get its own PRD when needed. The platform architecture supports adding them without refactoring.

---

*End of PRD*
