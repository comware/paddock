# Propagation Module - Implementation Plan

**Document Version**: 1.0
**Date**: January 2026
**Status**: Ready for Development
**Total Estimated Effort**: 18 development days

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Phase Breakdown](#2-phase-breakdown)
3. [Task Details](#3-task-details)
4. [Technical Considerations](#4-technical-considerations)
5. [Risk Assessment](#5-risk-assessment)
6. [Definition of Done](#6-definition-of-done)
7. [Sprint Structure](#7-sprint-structure)
8. [File Structure](#8-file-structure)

---

## 1. Executive Summary

### Scope

The Propagation module enables tracking plant propagation from cutting to graduation, including:
- Batch and individual propagule management
- Mother plant registry with productivity metrics
- Propagation station management
- Cost tracking and analytics
- Success rate analysis

### Architecture Overview

```
src/modules/propagation/
├── index.tsx                    # Module entry point
├── routes.tsx                   # Propagation-specific routes
├── types/
│   └── index.ts                 # Type definitions
├── stores/
│   ├── useBatches.ts           # Batch CRUD and queries
│   ├── usePropagules.ts        # Individual propagule management
│   ├── useMotherPlants.ts      # Mother plant registry
│   ├── useStations.ts          # Station management
│   ├── useSupplies.ts          # Supplies inventory
│   └── useAnalytics.ts         # Aggregated analytics
├── components/
│   ├── Dashboard/
│   ├── Batches/
│   ├── Propagules/
│   ├── MotherPlants/
│   ├── Stations/
│   ├── Supplies/
│   ├── Graduation/
│   └── Analytics/
└── utils/
    ├── batchNumbering.ts
    ├── stageHelpers.ts
    ├── costCalculations.ts
    └── validation.ts
```

### Dependencies

| Dependency | Description |
|------------|-------------|
| Dexie.js | Already in use, extend schema to v8 |
| Zustand | Already in use for state management |
| React Router | Already in use for routing |
| Zod | Add for validation (matches domain model spec) |
| date-fns | Already in use for date calculations |

---

## 2. Phase Breakdown

### Overview

| Phase | Name | Duration | Parallel Work |
|-------|------|----------|---------------|
| 1 | Core Batch Tracking | 4 days | None (foundational) |
| 2 | Stations & Mother Plants | 3 days | Partial with Phase 3 |
| 3 | Cost Tracking | 3 days | Partial with Phase 2 |
| 4 | Graduation & Outcomes | 2 days | After Phase 1 |
| 5 | Individual Propagules | 3 days | After Phase 1 |
| 6 | Analytics & Polish | 3 days | After Phases 1-5 |

### Dependency Graph

```
Phase 1 (Core Batch)
    |
    +---> Phase 2 (Stations/Mother Plants)
    |         |
    |         +---> Phase 3 (Cost Tracking)
    |                   |
    +---> Phase 4 (Graduation) --+
    |                            |
    +---> Phase 5 (Individuals)--+
                                 |
                                 v
                         Phase 6 (Analytics)
```

### Critical Path

```
PROP-TASK-001 -> PROP-TASK-002 -> PROP-TASK-004 -> PROP-TASK-006 -> PROP-TASK-009 -> MVP Complete
```

**Minimum time to MVP**: 9 days (core batch + dashboard + basic graduation)

---

## 3. Task Details

---

### Phase 1: Core Batch Tracking (Days 1-4)

**Goal**: Basic batch CRUD and stage management

---

#### PROP-TASK-001: Database Schema Extension

**Description**: Extend Dexie schema to v8 with all propagation tables

**Acceptance Criteria**:
- [ ] Add all 10 propagation tables to schema.ts
- [ ] Define compound indexes for query patterns
- [ ] Version migration handles existing data gracefully
- [ ] Export `propDb` convenience accessor
- [ ] All table types exported from schema

**Complexity**: M (Medium)
**Estimated Effort**: 3 hours
**Dependencies**: None

**Files to Create/Modify**:
- `src/lib/db/schema.ts` (modify)
- `src/modules/propagation/types/index.ts` (create)

**Implementation Notes**:
```typescript
// Add to schema.ts version 8
this.version(8).stores({
  propMotherPlants: '++id, siteId, species, variety, status, [siteId+status]',
  propStations: '++id, siteId, name, type, isActive, [siteId+isActive]',
  propStationLogs: '++id, stationId, date, [stationId+date]',
  propBatches: '++id, batchNumber, siteId, stationId, species, stage, dateTaken, motherPlantId, [siteId+stage], [stationId+stage]',
  propPropagules: '++id, batchId, propaguleNumber, siteId, stationId, species, stage, [batchId+stage]',
  propStageTransitions: '++id, batchId, propaguleId, toStage, transitionDate',
  propGraduations: '++id, batchId, propaguleId, outcome, graduationDate, [outcome+graduationDate]',
  propSupplies: '++id, name, category, [category+name]',
  propBatchCosts: '++id, batchId, supplyId',
  propSpeciesConfigs: '++id, &species',
});
```

---

#### PROP-TASK-002: Batch Store Implementation

**Description**: Create Zustand store for batch CRUD with computed fields

**Acceptance Criteria**:
- [ ] `useBatches` store created with full CRUD operations
- [ ] Computed fields: daysInStage, survivalRate, status
- [ ] Filtering by stage, species, station, site
- [ ] Sorting by date, species, stage
- [ ] Batch number auto-generation (YYYY-NNN format)
- [ ] Stage transition validation
- [ ] Unit tests for store actions

**Complexity**: L (Large)
**Estimated Effort**: 6 hours
**Dependencies**: PROP-TASK-001

**Files to Create**:
- `src/modules/propagation/stores/useBatches.ts`
- `src/modules/propagation/stores/__tests__/useBatches.test.ts`
- `src/modules/propagation/utils/batchNumbering.ts`
- `src/modules/propagation/utils/stageHelpers.ts`

**Implementation Pattern** (follow useTrays.ts convention):
```typescript
export interface BatchesState {
  rawBatches: PropBatch[];
  batches: PropBatchWithComputed[];
  isLoading: boolean;
  error: string | null;
  filters: BatchFilters;
  sort: BatchSort;

  // Actions
  loadBatches: () => Promise<void>;
  addBatch: (batch: CreateBatchInput) => Promise<string>;
  updateBatch: (id: string, updates: Partial<PropBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  advanceStage: (id: string, quantityAfter?: number, notes?: string) => Promise<void>;
  markFailed: (id: string, reason: FailureReason, notes?: string) => Promise<void>;

  // Selectors
  getFilteredBatches: () => PropBatchWithComputed[];
  getActiveBatchCount: () => Record<PropagationStage, number>;
  getBatchById: (id: string) => PropBatchWithComputed | undefined;
}
```

---

#### PROP-TASK-003: Stage Transition Store

**Description**: Create store for stage transition history (audit log)

**Acceptance Criteria**:
- [ ] `useStageTransitions` store for audit log
- [ ] Record transitions with before/after quantities
- [ ] Query transitions by batch or propagule
- [ ] Failure reason tracking
- [ ] Immutable records (no update/delete)

**Complexity**: S (Small)
**Estimated Effort**: 2 hours
**Dependencies**: PROP-TASK-001, PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/stores/useStageTransitions.ts`

---

#### PROP-TASK-004: New Batch Form Component

**Description**: Create form for entering new propagation batches

**Acceptance Criteria**:
- [ ] Species input with searchable dropdown and "add new" option
- [ ] Variety input (optional)
- [ ] Method selector (12 propagation methods)
- [ ] Mother plant selector (optional, links to registry)
- [ ] Quantity input with quick-select buttons (5, 10, 20, 50, 100)
- [ ] Station selector (required)
- [ ] Date taken (defaults to today)
- [ ] Preparation notes textarea
- [ ] Rooting medium and hormone fields
- [ ] Photo attachment support
- [ ] Form validation with error display
- [ ] Batch entry < 60 seconds (UX target)

**Complexity**: L (Large)
**Estimated Effort**: 6 hours
**Dependencies**: PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/components/Batches/NewBatchForm.tsx`
- `src/modules/propagation/components/Batches/index.ts`

---

#### PROP-TASK-005: Batch List Component

**Description**: Display batches with filtering and sorting

**Acceptance Criteria**:
- [ ] List view with batch cards showing key info
- [ ] Status indicator badges by stage
- [ ] Days-in-stage display
- [ ] Survival count (X/Y surviving)
- [ ] Filter tabs by stage (All, Rooting, Rooted, etc.)
- [ ] Filter dropdowns: species, method, station
- [ ] Sort options: date, species, stage, days-in-stage
- [ ] Quick action buttons per batch
- [ ] Pagination or virtual scrolling for large lists
- [ ] Mobile-responsive layout

**Complexity**: L (Large)
**Estimated Effort**: 6 hours
**Dependencies**: PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/components/Batches/BatchList.tsx`
- `src/modules/propagation/components/Batches/BatchCard.tsx`
- `src/modules/propagation/components/Batches/BatchFilters.tsx`

---

#### PROP-TASK-006: Batch Detail View

**Description**: Detailed view of single batch with history

**Acceptance Criteria**:
- [ ] Display all batch metadata
- [ ] Photo gallery
- [ ] Stage progression timeline (visual)
- [ ] Stage transition history list
- [ ] Cost summary (if costs assigned)
- [ ] Preparation notes display
- [ ] Action buttons: Advance Stage, Record Failure, Explode to Individuals
- [ ] Edit batch metadata (species, notes, photos)
- [ ] Link to mother plant detail (if linked)
- [ ] Link to station detail

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-002, PROP-TASK-003

**Files to Create**:
- `src/modules/propagation/components/Batches/BatchDetail.tsx`
- `src/modules/propagation/components/Batches/StageTimeline.tsx`

---

#### PROP-TASK-007: Stage Transition Modal

**Description**: Modal for advancing batch stage or recording failure

**Acceptance Criteria**:
- [ ] Shows current stage and valid next stages
- [ ] Quantity update (how many surviving)
- [ ] Notes field
- [ ] If failing: failure reason dropdown (required)
- [ ] Confirmation before submit
- [ ] Prevent invalid transitions
- [ ] Update batch and create transition record atomically

**Complexity**: M (Medium)
**Estimated Effort**: 3 hours
**Dependencies**: PROP-TASK-002, PROP-TASK-003

**Files to Create**:
- `src/modules/propagation/components/Batches/StageTransitionModal.tsx`

---

#### PROP-TASK-008: Basic Dashboard

**Description**: At-a-glance propagation overview

**Acceptance Criteria**:
- [ ] Summary metrics cards: Active batches, Propagules in progress, Success rate
- [ ] Counts by stage (horizontal bar or badges)
- [ ] Quick action buttons: New Batch, Quick Update
- [ ] "Needing Attention" list (overdue batches)
- [ ] Recent activity feed (last 10 transitions)

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/components/Dashboard/PropDashboard.tsx`
- `src/modules/propagation/components/Dashboard/MetricsCards.tsx`
- `src/modules/propagation/components/Dashboard/NeedingAttention.tsx`
- `src/modules/propagation/components/Dashboard/index.ts`

---

#### PROP-TASK-009: Module Routing Setup

**Description**: Configure routing for propagation module

**Acceptance Criteria**:
- [ ] Module entry point at `/propagation`
- [ ] Dashboard as index route
- [ ] Batches list at `/propagation/batches`
- [ ] Batch detail at `/propagation/batches/:id`
- [ ] New batch at `/propagation/batches/new`
- [ ] Navigation integration with main app

**Complexity**: S (Small)
**Estimated Effort**: 2 hours
**Dependencies**: PROP-TASK-008

**Files to Create**:
- `src/modules/propagation/index.tsx`
- `src/modules/propagation/routes.tsx`

---

### Phase 2: Stations & Mother Plants (Days 5-7)

**Goal**: Supporting entity management

---

#### PROP-TASK-010: Station Store

**Description**: Zustand store for propagation station management

**Acceptance Criteria**:
- [ ] Full CRUD for stations
- [ ] Activate/deactivate stations
- [ ] Calculate current occupancy from batches
- [ ] Filter by site, type, active status
- [ ] Environmental target validation

**Complexity**: M (Medium)
**Estimated Effort**: 3 hours
**Dependencies**: PROP-TASK-001

**Files to Create**:
- `src/modules/propagation/stores/useStations.ts`

---

#### PROP-TASK-011: Station Components

**Description**: UI for station management

**Acceptance Criteria**:
- [ ] Station list view with occupancy bars
- [ ] Station form (create/edit)
- [ ] Station detail view with batches list
- [ ] Environmental logging modal
- [ ] Station type defaults applied on create

**Complexity**: M (Medium)
**Estimated Effort**: 5 hours
**Dependencies**: PROP-TASK-010

**Files to Create**:
- `src/modules/propagation/components/Stations/StationList.tsx`
- `src/modules/propagation/components/Stations/StationCard.tsx`
- `src/modules/propagation/components/Stations/StationForm.tsx`
- `src/modules/propagation/components/Stations/StationDetail.tsx`
- `src/modules/propagation/components/Stations/index.ts`

---

#### PROP-TASK-012: Mother Plant Store

**Description**: Zustand store for mother plant registry

**Acceptance Criteria**:
- [ ] Full CRUD for mother plants
- [ ] Status management (active/retired/deceased)
- [ ] Health assessment recording
- [ ] Productivity metrics calculation
- [ ] Filter by site, species, status

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-001

**Files to Create**:
- `src/modules/propagation/stores/useMotherPlants.ts`
- `src/modules/propagation/utils/motherPlantMetrics.ts`

---

#### PROP-TASK-013: Mother Plant Components

**Description**: UI for mother plant registry

**Acceptance Criteria**:
- [ ] Mother plant list with health indicators
- [ ] Registration form with all fields
- [ ] Detail view with propagation history
- [ ] Health check modal
- [ ] Productivity stats display (batches taken, success rate)
- [ ] Quick action: "Take Cutting" (pre-fills batch form)

**Complexity**: L (Large)
**Estimated Effort**: 6 hours
**Dependencies**: PROP-TASK-012

**Files to Create**:
- `src/modules/propagation/components/MotherPlants/MotherPlantList.tsx`
- `src/modules/propagation/components/MotherPlants/MotherPlantCard.tsx`
- `src/modules/propagation/components/MotherPlants/MotherPlantForm.tsx`
- `src/modules/propagation/components/MotherPlants/MotherPlantDetail.tsx`
- `src/modules/propagation/components/MotherPlants/HealthCheckModal.tsx`
- `src/modules/propagation/components/MotherPlants/index.ts`

---

#### PROP-TASK-014: Dashboard Station Overview

**Description**: Add station occupancy to dashboard

**Acceptance Criteria**:
- [ ] Station overview section on dashboard
- [ ] Visual capacity bars (used/total)
- [ ] Quick link to station detail
- [ ] Highlight stations at capacity

**Complexity**: S (Small)
**Estimated Effort**: 2 hours
**Dependencies**: PROP-TASK-010, PROP-TASK-008

**Files to Create**:
- `src/modules/propagation/components/Dashboard/StationOverview.tsx`

---

### Phase 3: Cost Tracking (Days 8-10)

**Goal**: Financial tracking and calculations

---

#### PROP-TASK-015: Supplies Store

**Description**: Zustand store for supplies inventory

**Acceptance Criteria**:
- [ ] Full CRUD for supplies
- [ ] Automatic cost-per-unit calculation
- [ ] Inventory deduction on batch cost assignment
- [ ] Low stock detection
- [ ] Filter by category

**Complexity**: M (Medium)
**Estimated Effort**: 3 hours
**Dependencies**: PROP-TASK-001

**Files to Create**:
- `src/modules/propagation/stores/useSupplies.ts`

---

#### PROP-TASK-016: Batch Cost Store

**Description**: Store for cost allocation to batches

**Acceptance Criteria**:
- [ ] Add supply-linked costs to batch
- [ ] Add manual costs to batch
- [ ] Calculate total batch cost
- [ ] Calculate cost per propagule (started/surviving)
- [ ] Prevent exceeding supply inventory

**Complexity**: M (Medium)
**Estimated Effort**: 3 hours
**Dependencies**: PROP-TASK-015, PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/stores/useBatchCosts.ts`
- `src/modules/propagation/utils/costCalculations.ts`

---

#### PROP-TASK-017: Supplies Components

**Description**: UI for supplies inventory management

**Acceptance Criteria**:
- [ ] Supplies list grouped by category
- [ ] Add supply form (purchase recording)
- [ ] Low stock alerts banner
- [ ] Supply usage history
- [ ] Cost per unit display

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-015

**Files to Create**:
- `src/modules/propagation/components/Supplies/SupplyList.tsx`
- `src/modules/propagation/components/Supplies/SupplyForm.tsx`
- `src/modules/propagation/components/Supplies/LowStockAlert.tsx`
- `src/modules/propagation/components/Supplies/index.ts`

---

#### PROP-TASK-018: Batch Cost Components

**Description**: UI for assigning costs to batches

**Acceptance Criteria**:
- [ ] Cost assignment form (select supply + quantity)
- [ ] Manual cost entry option
- [ ] Cost breakdown display on batch detail
- [ ] Cost summary card with per-propagule costs

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-016

**Files to Create**:
- `src/modules/propagation/components/Costs/BatchCostForm.tsx`
- `src/modules/propagation/components/Costs/CostBreakdown.tsx`
- `src/modules/propagation/components/Costs/CostSummary.tsx`
- `src/modules/propagation/components/Costs/index.ts`

---

### Phase 4: Graduation & Outcomes (Days 11-12)

**Goal**: Track where propagules end up

---

#### PROP-TASK-019: Graduation Store

**Description**: Store for graduation recording

**Acceptance Criteria**:
- [ ] Record batch graduation (partial or full)
- [ ] Record individual propagule graduation
- [ ] Validate quantity against available
- [ ] Outcome type tracking
- [ ] Recipient tracking for gifts
- [ ] Sale reference hooks (for future)

**Complexity**: M (Medium)
**Estimated Effort**: 3 hours
**Dependencies**: PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/stores/useGraduations.ts`

---

#### PROP-TASK-020: Graduation Components

**Description**: UI for recording graduations

**Acceptance Criteria**:
- [ ] Graduation form with outcome selection
- [ ] Quantity selector (for batch graduation)
- [ ] Gift recipient field (conditional)
- [ ] Planted location field (conditional)
- [ ] Sale price field (conditional, for future)
- [ ] Graduation confirmation

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-019

**Files to Create**:
- `src/modules/propagation/components/Graduation/GraduationForm.tsx`
- `src/modules/propagation/components/Graduation/GraduationHistory.tsx`
- `src/modules/propagation/components/Graduation/index.ts`

---

#### PROP-TASK-021: Dashboard Ready-to-Graduate

**Description**: Add ready-to-graduate section to dashboard

**Acceptance Criteria**:
- [ ] List batches in "ready" stage
- [ ] Days in ready stage display
- [ ] Quick graduation action
- [ ] Count badge on dashboard

**Complexity**: S (Small)
**Estimated Effort**: 2 hours
**Dependencies**: PROP-TASK-019, PROP-TASK-008

**Files to Create**:
- `src/modules/propagation/components/Dashboard/ReadyToGraduate.tsx`

---

### Phase 5: Individual Propagules (Days 13-15)

**Goal**: Detailed individual tracking for high-value plants

---

#### PROP-TASK-022: Propagule Store

**Description**: Store for individual propagule management

**Acceptance Criteria**:
- [ ] Create propagules from batch explosion
- [ ] Individual CRUD operations
- [ ] Individual stage transitions
- [ ] Health score and measurement tracking
- [ ] Filter by batch, stage, species

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-002

**Files to Create**:
- `src/modules/propagation/stores/usePropagules.ts`

---

#### PROP-TASK-023: Explode Batch Feature

**Description**: Convert batch to individual propagule records

**Acceptance Criteria**:
- [ ] "Explode to Individuals" action on batch
- [ ] Generate propagule numbers (batch-number-NN)
- [ ] Inherit batch metadata to each individual
- [ ] Mark batch as exploded (immutable)
- [ ] Confirmation modal with implications
- [ ] Batch still visible but read-only after explosion

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-022

**Files to Create**:
- `src/modules/propagation/components/Batches/ExplodeBatchModal.tsx`

---

#### PROP-TASK-024: Propagule Components

**Description**: UI for individual propagule tracking

**Acceptance Criteria**:
- [ ] Propagule list view (under parent batch)
- [ ] Propagule card with health indicator
- [ ] Propagule detail view with full history
- [ ] Update form (health, measurements, photos, notes)
- [ ] Individual stage transition
- [ ] Photo gallery per propagule

**Complexity**: L (Large)
**Estimated Effort**: 6 hours
**Dependencies**: PROP-TASK-022

**Files to Create**:
- `src/modules/propagation/components/Propagules/PropaguleList.tsx`
- `src/modules/propagation/components/Propagules/PropaguleCard.tsx`
- `src/modules/propagation/components/Propagules/PropaguleDetail.tsx`
- `src/modules/propagation/components/Propagules/PropaguleUpdateForm.tsx`
- `src/modules/propagation/components/Propagules/index.ts`

---

### Phase 6: Analytics & Polish (Days 16-18)

**Goal**: Insights and refinements

---

#### PROP-TASK-025: Analytics Store

**Description**: Store for aggregated analytics calculations

**Acceptance Criteria**:
- [ ] Success rate by: species, method, mother plant, station, season
- [ ] Failure stage analysis
- [ ] Outcome distribution
- [ ] Cost analytics
- [ ] Time period filtering (30/90/365 days)

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-002, PROP-TASK-019

**Files to Create**:
- `src/modules/propagation/stores/useAnalytics.ts`

---

#### PROP-TASK-026: Analytics Dashboard

**Description**: Visual analytics page

**Acceptance Criteria**:
- [ ] Overall performance metrics
- [ ] Success rate by species (bar chart)
- [ ] Success rate by method (bar chart)
- [ ] Failure analysis (stage distribution)
- [ ] Outcomes pie chart
- [ ] Time period selector
- [ ] Filter by species/method

**Complexity**: L (Large)
**Estimated Effort**: 6 hours
**Dependencies**: PROP-TASK-025

**Files to Create**:
- `src/modules/propagation/components/Analytics/AnalyticsDashboard.tsx`
- `src/modules/propagation/components/Analytics/SuccessRateChart.tsx`
- `src/modules/propagation/components/Analytics/FailureAnalysis.tsx`
- `src/modules/propagation/components/Analytics/OutcomesChart.tsx`
- `src/modules/propagation/components/Analytics/index.ts`

---

#### PROP-TASK-027: Export/Import

**Description**: Data portability features

**Acceptance Criteria**:
- [ ] Export all propagation data as JSON
- [ ] Export batches as CSV
- [ ] Import from JSON backup
- [ ] Clear all propagation data (with confirmation)
- [ ] Validation during import

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: All prior tasks

**Files to Create**:
- `src/modules/propagation/utils/exporters.ts`
- `src/modules/propagation/components/Settings/DataManagement.tsx`

---

#### PROP-TASK-028: Species Configuration

**Description**: Default settings per species

**Acceptance Criteria**:
- [ ] Species config CRUD
- [ ] Default propagation method per species
- [ ] Typical timing values
- [ ] Overdue warning thresholds
- [ ] Best propagation months
- [ ] Pre-seed common species

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: PROP-TASK-001

**Files to Create**:
- `src/modules/propagation/stores/useSpeciesConfigs.ts`
- `src/modules/propagation/components/Settings/SpeciesConfigForm.tsx`

---

#### PROP-TASK-029: Mobile Optimization

**Description**: Ensure mobile-friendly UX

**Acceptance Criteria**:
- [ ] All views work at 375px width
- [ ] Touch targets minimum 44px
- [ ] Swipe actions on list items
- [ ] Collapsed filters on mobile
- [ ] Bottom sheet modals on mobile

**Complexity**: M (Medium)
**Estimated Effort**: 4 hours
**Dependencies**: All component tasks

**Files to Modify**:
- All component files (responsive adjustments)

---

#### PROP-TASK-030: Dark Mode Support

**Description**: Ensure dark mode compatibility

**Acceptance Criteria**:
- [ ] All components use theme colors
- [ ] Charts readable in dark mode
- [ ] No hardcoded colors
- [ ] Status badges visible in both modes

**Complexity**: S (Small)
**Estimated Effort**: 2 hours
**Dependencies**: All component tasks

**Files to Modify**:
- All component files (theme adjustments)

---

## 4. Technical Considerations

### Database Schema Migration Strategy

1. **Additive Migration**: Version 8 adds new tables without modifying existing ones
2. **No Data Migration**: New tables start empty
3. **Graceful Degradation**: Module functions independently of existing data
4. **Index Design**: Compound indexes for common query patterns

```typescript
// Migration approach in schema.ts
this.version(8).stores({
  // New tables only - no changes to existing
  propMotherPlants: '++id, siteId, species, status, [siteId+status]',
  // ... other propagation tables
});
```

### State Management Approach

Following existing patterns from `useTrays.ts`:

1. **Zustand Stores**: One store per entity type
2. **Computed Fields**: Enriched on load, not stored
3. **Optimistic Updates**: Update local state, then persist
4. **Error Handling**: Store-level error state

```typescript
// Store pattern
export const useBatches = create<BatchesState>((set, get) => ({
  rawBatches: [],
  batches: [], // Enriched with computed fields
  isLoading: true,
  error: null,

  loadBatches: async () => {
    try {
      const raw = await propDb.batches.toArray();
      set({ rawBatches: raw, batches: raw.map(enrichBatch), isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

### Component Hierarchy

```
PropagationModule (index.tsx)
├── PropDashboard
│   ├── MetricsCards
│   ├── StationOverview
│   ├── NeedingAttention
│   └── ReadyToGraduate
├── BatchList
│   ├── BatchFilters
│   └── BatchCard[]
├── BatchDetail
│   ├── StageTimeline
│   ├── CostBreakdown
│   ├── PropaguleList (if exploded)
│   └── GraduationHistory
├── MotherPlantList/Detail
├── StationList/Detail
├── SupplyList
└── AnalyticsDashboard
```

### Routing Structure

```typescript
// routes.tsx
export const propagationRoutes: RouteObject[] = [
  { index: true, element: <PropDashboard /> },
  { path: 'batches', element: <BatchList /> },
  { path: 'batches/new', element: <NewBatchForm /> },
  { path: 'batches/:id', element: <BatchDetail /> },
  { path: 'propagules', element: <PropaguleList /> },
  { path: 'propagules/:id', element: <PropaguleDetail /> },
  { path: 'mother-plants', element: <MotherPlantList /> },
  { path: 'mother-plants/new', element: <MotherPlantForm /> },
  { path: 'mother-plants/:id', element: <MotherPlantDetail /> },
  { path: 'stations', element: <StationList /> },
  { path: 'stations/:id', element: <StationDetail /> },
  { path: 'supplies', element: <SupplyList /> },
  { path: 'analytics', element: <AnalyticsDashboard /> },
  { path: 'settings', element: <PropagationSettings /> },
];
```

### Testing Strategy

| Level | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | Stores, utils, calculations |
| Component | Testing Library | Form validation, interactions |
| Integration | Vitest + Dexie fake | Store + DB operations |
| E2E | Playwright | Critical user flows |

**Priority Tests**:
1. Batch number generation (uniqueness)
2. Stage transition validation
3. Cost calculations
4. Success rate calculations
5. Batch explosion logic

---

## 5. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| IndexedDB performance with large datasets | Medium | Medium | Pagination, virtual scrolling, indexed queries |
| Batch number collision on concurrent creates | Low | High | Lock mechanism or generate on server |
| Cost calculation accuracy | Low | High | Unit tests, manual verification during development |
| Photo storage limits | Medium | Medium | Compress images, external storage option later |

### Scope Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature creep during development | High | Medium | Strict adherence to PRD, defer enhancements |
| Underestimated complexity of analytics | Medium | Medium | Time-box Phase 6, MVP analytics first |
| Integration with existing sites | Low | High | Use existing site context pattern from Grow module |

### Integration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema migration breaks existing data | Low | High | Additive-only migrations, thorough testing |
| Routing conflicts with existing modules | Low | Low | Namespaced routes under /propagation |
| State management conflicts | Low | Medium | Separate stores per module |

---

## 6. Definition of Done

### Phase 1: Core Batch Tracking

- [ ] Database schema v8 deployed and verified
- [ ] Can create batch with all required fields
- [ ] Batch number auto-generates correctly
- [ ] Can view list of batches with filters
- [ ] Can transition batch through stages
- [ ] Stage history preserved and viewable
- [ ] Basic dashboard displays counts
- [ ] All routes accessible and navigable
- [ ] Unit tests pass for stores

### Phase 2: Stations & Mother Plants

- [ ] Can create and manage stations
- [ ] Station occupancy calculates correctly
- [ ] Can register and manage mother plants
- [ ] Mother plant productivity metrics display
- [ ] Dashboard shows station overview
- [ ] Batches link to stations and mother plants
- [ ] Can move batches between stations

### Phase 3: Cost Tracking

- [ ] Can register supplies with purchase info
- [ ] Cost per unit calculates correctly
- [ ] Can assign costs to batches
- [ ] Batch total cost calculates correctly
- [ ] Cost per propagule displays correctly
- [ ] Low stock alerts trigger

### Phase 4: Graduation & Outcomes

- [ ] Can graduate batch (full or partial)
- [ ] Can select all outcome types
- [ ] Recipient tracking for gifts works
- [ ] Graduation history displays correctly
- [ ] Dashboard shows ready-to-graduate

### Phase 5: Individual Propagules

- [ ] Can explode batch to individuals
- [ ] Individual propagule numbers generate correctly
- [ ] Can track individuals independently
- [ ] Can update individual status/health
- [ ] Photo support for individuals

### Phase 6: Analytics & Polish

- [ ] Success rate analytics accurate
- [ ] All charts display correctly
- [ ] Export/import functional
- [ ] Works on mobile (375px)
- [ ] Dark mode compatible
- [ ] All data survives browser refresh

---

## 7. Sprint Structure

### Sprint 1: Foundation (Days 1-5)

**Goal**: Working batch tracking MVP

| Task ID | Task | Points | Assignee |
|---------|------|--------|----------|
| PROP-TASK-001 | Database Schema | 3 | - |
| PROP-TASK-002 | Batch Store | 5 | - |
| PROP-TASK-003 | Stage Transition Store | 2 | - |
| PROP-TASK-004 | New Batch Form | 5 | - |
| PROP-TASK-005 | Batch List | 5 | - |
| PROP-TASK-009 | Module Routing | 2 | - |

**Sprint Points**: 22
**Deliverable**: Can create batches, view list, navigate module

---

### Sprint 2: Entity Management (Days 6-10)

**Goal**: Complete entity relationships

| Task ID | Task | Points | Assignee |
|---------|------|--------|----------|
| PROP-TASK-006 | Batch Detail View | 3 | - |
| PROP-TASK-007 | Stage Transition Modal | 3 | - |
| PROP-TASK-008 | Basic Dashboard | 3 | - |
| PROP-TASK-010 | Station Store | 3 | - |
| PROP-TASK-011 | Station Components | 5 | - |
| PROP-TASK-012 | Mother Plant Store | 3 | - |
| PROP-TASK-013 | Mother Plant Components | 5 | - |
| PROP-TASK-014 | Dashboard Station Overview | 2 | - |

**Sprint Points**: 27
**Deliverable**: Stations, mother plants, full batch workflow

---

### Sprint 3: Costs & Graduation (Days 11-14)

**Goal**: Financial tracking and outcomes

| Task ID | Task | Points | Assignee |
|---------|------|--------|----------|
| PROP-TASK-015 | Supplies Store | 3 | - |
| PROP-TASK-016 | Batch Cost Store | 3 | - |
| PROP-TASK-017 | Supplies Components | 3 | - |
| PROP-TASK-018 | Batch Cost Components | 3 | - |
| PROP-TASK-019 | Graduation Store | 3 | - |
| PROP-TASK-020 | Graduation Components | 3 | - |
| PROP-TASK-021 | Dashboard Ready-to-Graduate | 2 | - |

**Sprint Points**: 20
**Deliverable**: Full lifecycle tracking with costs

---

### Sprint 4: Advanced Features (Days 15-18)

**Goal**: Individual tracking and analytics

| Task ID | Task | Points | Assignee |
|---------|------|--------|----------|
| PROP-TASK-022 | Propagule Store | 3 | - |
| PROP-TASK-023 | Explode Batch Feature | 3 | - |
| PROP-TASK-024 | Propagule Components | 5 | - |
| PROP-TASK-025 | Analytics Store | 3 | - |
| PROP-TASK-026 | Analytics Dashboard | 5 | - |
| PROP-TASK-027 | Export/Import | 3 | - |
| PROP-TASK-028 | Species Configuration | 3 | - |
| PROP-TASK-029 | Mobile Optimization | 3 | - |
| PROP-TASK-030 | Dark Mode Support | 2 | - |

**Sprint Points**: 30
**Deliverable**: Production-ready module

---

### MVP vs Full Feature Set

#### MVP (Sprints 1-2): 10 days

**Included**:
- Batch CRUD and stage tracking
- Basic dashboard
- Station management
- Mother plant registry
- Stage transition history

**Excluded** (add later):
- Cost tracking
- Graduation recording
- Individual propagule tracking
- Analytics
- Export/import

#### Full Feature Set (Sprints 1-4): 18 days

All features from PRD implemented.

---

## 8. File Structure

```
src/modules/propagation/
├── index.tsx                           # Module entry point and layout
├── routes.tsx                          # Route configuration
├── types/
│   └── index.ts                        # All type definitions
├── stores/
│   ├── useBatches.ts                   # Batch state management
│   ├── usePropagules.ts                # Individual propagule management
│   ├── useMotherPlants.ts              # Mother plant registry
│   ├── useStations.ts                  # Station management
│   ├── useStageTransitions.ts          # Transition audit log
│   ├── useSupplies.ts                  # Supplies inventory
│   ├── useBatchCosts.ts                # Cost allocation
│   ├── useGraduations.ts               # Graduation records
│   ├── useSpeciesConfigs.ts            # Species defaults
│   ├── useAnalytics.ts                 # Aggregated analytics
│   ├── index.ts                        # Store exports
│   └── __tests__/
│       ├── useBatches.test.ts
│       ├── usePropagules.test.ts
│       └── useAnalytics.test.ts
├── components/
│   ├── Dashboard/
│   │   ├── PropDashboard.tsx
│   │   ├── MetricsCards.tsx
│   │   ├── StationOverview.tsx
│   │   ├── NeedingAttention.tsx
│   │   ├── ReadyToGraduate.tsx
│   │   └── index.ts
│   ├── Batches/
│   │   ├── BatchList.tsx
│   │   ├── BatchCard.tsx
│   │   ├── BatchFilters.tsx
│   │   ├── NewBatchForm.tsx
│   │   ├── BatchDetail.tsx
│   │   ├── StageTimeline.tsx
│   │   ├── StageTransitionModal.tsx
│   │   ├── ExplodeBatchModal.tsx
│   │   └── index.ts
│   ├── Propagules/
│   │   ├── PropaguleList.tsx
│   │   ├── PropaguleCard.tsx
│   │   ├── PropaguleDetail.tsx
│   │   ├── PropaguleUpdateForm.tsx
│   │   └── index.ts
│   ├── MotherPlants/
│   │   ├── MotherPlantList.tsx
│   │   ├── MotherPlantCard.tsx
│   │   ├── MotherPlantForm.tsx
│   │   ├── MotherPlantDetail.tsx
│   │   ├── HealthCheckModal.tsx
│   │   └── index.ts
│   ├── Stations/
│   │   ├── StationList.tsx
│   │   ├── StationCard.tsx
│   │   ├── StationForm.tsx
│   │   ├── StationDetail.tsx
│   │   ├── EnvironmentLogModal.tsx
│   │   └── index.ts
│   ├── Supplies/
│   │   ├── SupplyList.tsx
│   │   ├── SupplyForm.tsx
│   │   ├── LowStockAlert.tsx
│   │   └── index.ts
│   ├── Costs/
│   │   ├── BatchCostForm.tsx
│   │   ├── CostBreakdown.tsx
│   │   ├── CostSummary.tsx
│   │   └── index.ts
│   ├── Graduation/
│   │   ├── GraduationForm.tsx
│   │   ├── GraduationHistory.tsx
│   │   └── index.ts
│   ├── Analytics/
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── SuccessRateChart.tsx
│   │   ├── FailureAnalysis.tsx
│   │   ├── OutcomesChart.tsx
│   │   ├── CostAnalysis.tsx
│   │   └── index.ts
│   └── Settings/
│       ├── SpeciesConfigForm.tsx
│       ├── DataManagement.tsx
│       └── index.ts
└── utils/
    ├── batchNumbering.ts               # Batch number generation
    ├── stageHelpers.ts                 # Stage state machine helpers
    ├── costCalculations.ts             # Cost math
    ├── motherPlantMetrics.ts           # Mother plant analytics
    ├── validation.ts                   # Zod schemas
    ├── exporters.ts                    # JSON/CSV export
    └── index.ts
```

---

## Appendix: Quick Reference

### Task Status Legend

| Status | Meaning |
|--------|---------|
| Not Started | Task not begun |
| In Progress | Actively being worked |
| In Review | PR submitted, awaiting review |
| Done | Merged to main |
| Blocked | Waiting on dependency |

### Complexity Estimates

| Size | Story Points | Time Range |
|------|--------------|------------|
| S (Small) | 1-2 | 2-4 hours |
| M (Medium) | 3-4 | 4-8 hours |
| L (Large) | 5-8 | 1-2 days |

### Key Metrics

| Metric | Target |
|--------|--------|
| Total Tasks | 30 |
| Total Story Points | ~99 |
| Total Days | 18 |
| MVP Days | 10 |
| Critical Path Tasks | 9 |

---

*End of Implementation Plan*
