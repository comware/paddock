# Product Requirements Document
## Paddock Platform - Propagation Module

**Document Version**: 1.0
**Date**: January 2026
**Author**: Product Manager
**Status**: Ready for Development

---

## 1. Executive Summary

### 1.1 Platform Context

**Paddock** is a local-first platform for managing a small farm operation. The Propagation module joins the existing module ecosystem:

| Module | Purpose | Status |
|--------|---------|--------|
| **Grow** | Microgreens experiment tracking | Production |
| **Propagation** | Plant propagation tracking | This PRD |
| Sales | Orders, invoicing, payments | Future |
| Markets | Stall planning, inventory, schedules | Future |
| CRM | Restaurant & customer relationships | Future |
| Finance | Costs, revenue, projections | Future |
| Planner | Crop calendar, succession planning | Future |

This PRD covers the **Propagation** module - for tracking the creation of new plants from existing stock through cuttings, division, layering, grafting, and seed saving.

### 1.2 Problem Statement

A small farm operator growing herbs, trees, and ornamental plants needs to track propagation activities to:
- Know success rates by plant type and propagation method
- Understand which mother plants are most productive
- Track costs per successful propagule to inform pricing
- Plan propagation timing for market demand
- Document techniques that work for future reference

Currently, propagation tracking is done informally or not at all, leading to:
- Lost knowledge about successful techniques
- Unknown success rates and costs
- Wasted resources on underperforming methods
- Inability to plan production reliably

### 1.3 Solution

The **Paddock Propagation** module provides:
- Batch and individual propagule tracking
- Mother plant registry with health and productivity metrics
- Propagation station management with environmental tracking
- Cost tracking per batch with supplies inventory
- Lifecycle management from cutting to graduation
- Integration hooks for future Sales module

### 1.4 Success Criteria

| Metric | Target |
|--------|--------|
| Batch entry time | < 60 seconds |
| Individual propagule update | < 15 seconds |
| Success rate visibility | Per species, method, and mother plant |
| Cost per propagule calculation | Automatic |
| Data survives browser refresh | 100% |
| Works offline | Yes |
| Mobile-friendly | Yes (responsive) |

---

## 2. Problem Statement & Solution

### 2.1 Why Now

The farm operation is expanding beyond microgreens into herb and tree production. Plant propagation is:
- A core revenue driver (selling propagated plants at markets)
- A cost reduction strategy (propagating rather than buying stock)
- A knowledge-intensive activity that benefits from systematic tracking

Without proper tracking, the operator cannot:
- Price propagated plants accurately (unknown costs)
- Predict availability for markets (unknown success rates)
- Replicate successful techniques (undocumented methods)
- Identify underperforming mother plants (no data)

### 2.2 User Research Summary

**Key Insights from Discovery:**

1. **Scale varies widely**: Hobby propagators may do dozens per month; commercial operations hundreds
2. **Granularity needs differ**: High-value trees need individual tracking; herbs work as batches
3. **Method diversity**: Cuttings are most common, but division, layering, grafting, and seed saving all occur
4. **Cost awareness is critical**: Knowing cost-per-propagule informs pricing and method selection
5. **Outcomes vary**: Plants go to personal use, garden planting, gifts, or sales

### 2.3 Business Objective

1. **Enable accurate pricing**: Know the true cost of each propagated plant
2. **Improve success rates**: Identify what works through data
3. **Optimize mother plant selection**: Track which stock plants perform best
4. **Support market planning**: Predict available inventory based on success rates
5. **Build institutional knowledge**: Document techniques that work

---

## 3. User Personas

### 3.1 Primary: The Market Gardener

**Name**: Alex
**Context**: Runs a small market garden selling herbs, vegetables, and ornamental plants at local farmers markets
**Scale**: 50-200 propagations per month during growing season
**Usage Pattern**:
- Batch propagation sessions (take 20 cuttings at once)
- Weekly check-ins on rooting progress
- Monthly review of success rates and costs

**Needs**:
- Quick batch entry during propagation sessions
- At-a-glance status of propagation stations
- Success rate data for market planning
- Cost tracking for pricing decisions

**Pain Points**:
- Loses track of which batches are ready
- Forgets which techniques worked last year
- Cannot price plants accurately without cost data

### 3.2 Secondary: The Tree Nursery Operator

**Name**: Morgan
**Context**: Specializes in propagating fruit trees and native species
**Scale**: 20-50 high-value propagations per month
**Usage Pattern**:
- Individual tracking for expensive/rare species
- Detailed notes per propagule
- Long-term tracking (months per propagule)

**Needs**:
- Individual propagule records (not just batches)
- Detailed lineage tracking (mother plant -> propagule)
- Photo documentation at each stage
- Long lifecycle support (some grafts take 6+ months)

**Pain Points**:
- Each tree represents significant investment
- Need to track individual failures to identify patterns
- Must document scion/rootstock combinations

### 3.3 Tertiary: The Hobby Propagator

**Name**: Sam
**Context**: Home gardener who propagates plants for personal use and to share with friends
**Scale**: 5-30 propagations per month seasonally
**Usage Pattern**:
- Casual tracking, mainly for fun
- Interested in success rates by plant type
- Shares plants with neighbors (gift tracking)

**Needs**:
- Simple interface for basic tracking
- Success rate visibility
- Easy "gifted" outcome recording

**Pain Points**:
- Forgets what's in which station
- No idea which plants propagate easily

---

## 4. Functional Requirements

### 4.1 Core Features

#### 4.1.1 Dashboard (Home)

**Purpose**: At-a-glance view of propagation status

**Requirements**:
- Display summary metrics:
  - Active batches count by stage
  - Propagules in progress (total count)
  - Overall success rate (last 30/90/365 days)
  - Ready for graduation count
- Propagation stations status with occupancy
- Recent activity feed (last 10 actions)
- Quick action buttons:
  - "New Batch"
  - "Quick Update"
  - "Record Graduation"
  - "Add Supplies"

**Wireframe**:
```
+------------------------------------------------------------------+
|  PROPAGATION MODULE                          Season: Summer       |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------+ +----------------+ +----------------+         |
|  | 12 Batches     | | 156 Propagules | | 78% Success   |         |
|  | Active         | | In Progress    | | Rate (90d)    |         |
|  +----------------+ +----------------+ +----------------+         |
|                                                                   |
|  +----------------+ +----------------+                            |
|  | 23 Ready       | | $2.45 Avg      |                            |
|  | To Graduate    | | Cost/Propagule |                            |
|  +----------------+ +----------------+                            |
|                                                                   |
|  === PROPAGATION STATIONS ===                                     |
|  +----------------------------------------------------------+    |
|  | [====] Heated Propagator  | 45/50 slots | 3 batches      |    |
|  | [====] Water Jars         | 12/20 slots | 5 batches      |    |
|  | [==  ] Outdoor Bed A      | 30/100 slots| 2 batches      |    |
|  | [    ] Cold Frame         | 0/40 slots  | Empty          |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  === QUICK ACTIONS ===                                            |
|  +------------+ +------------+ +------------+ +------------+      |
|  | + New      | | Update     | | Graduate   | | + Supplies |      |
|  | Batch      | | Status     | | Ready      | |            |      |
|  +------------+ +------------+ +------------+ +------------+      |
|                                                                   |
|  === NEEDING ATTENTION ===                                        |
|  +----------------------------------------------------------+    |
|  | Batch #45 - Basil - Day 21 - Rooted, ready to pot up     |    |
|  | Batch #43 - Rosemary - Day 35 - Check roots              |    |
|  | Batch #41 - Lavender - Day 42 - Ready to graduate        |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

#### 4.1.2 Batch Management

**Purpose**: Track groups of propagules created together

**FR-1: Create Batch**
**Priority**: P0
**Description**: Record a new propagation batch with source and method details
**Acceptance Criteria**:
- [ ] Can specify species/variety (searchable dropdown with add-new)
- [ ] Can select propagation method (cutting, division, layering, grafting, seed)
- [ ] Can optionally link to mother plant
- [ ] Can specify quantity (number of propagules in batch)
- [ ] Can select propagation station
- [ ] Can record date taken (defaults to today)
- [ ] Can add preparation notes (wound treatment, hormone used, etc.)
- [ ] Auto-generates batch number (sequential per year: 2026-001, 2026-002)
- [ ] Can attach photo(s)

**FR-2: Batch Status Tracking**
**Priority**: P0
**Description**: Update batch through lifecycle stages
**Acceptance Criteria**:
- [ ] Can transition batch to next stage with single tap
- [ ] Tracks date of each stage transition
- [ ] Can record quantity surviving at each stage
- [ ] Can add notes at each transition
- [ ] Can split batch (e.g., some root faster than others)

**FR-3: Batch List View**
**Priority**: P0
**Description**: View and filter all batches
**Acceptance Criteria**:
- [ ] List view with status indicators and days-in-stage
- [ ] Filter by: stage, species, method, station, date range
- [ ] Sort by: date created, species, stage, days-in-stage
- [ ] Bulk actions: move station, update stage, record graduation
- [ ] Search by batch number or species name

**FR-4: Explode Batch to Individuals**
**Priority**: P1
**Description**: Convert batch to individual propagule records
**Acceptance Criteria**:
- [ ] Can "explode" batch into N individual records
- [ ] Individual records inherit batch metadata
- [ ] Each individual gets unique ID (batch-number + sequence)
- [ ] Can track individuals independently from explosion point forward
- [ ] Original batch marked as "exploded" with link to individuals

#### 4.1.3 Individual Propagule Tracking

**Purpose**: Detailed tracking for high-value plants

**FR-5: Individual Propagule Records**
**Priority**: P1
**Description**: Track single propagules with detailed history
**Acceptance Criteria**:
- [ ] Each propagule has unique identifier
- [ ] Full lifecycle history with dated entries
- [ ] Individual photos per stage
- [ ] Detailed notes field
- [ ] Custom label support (e.g., "Pink Lady Graft #3")
- [ ] Lineage tracking (mother plant, scion source for grafts)

**FR-6: Individual Propagule Updates**
**Priority**: P1
**Description**: Quick updates for individual propagules
**Acceptance Criteria**:
- [ ] Quick status update (next stage, failed, notes)
- [ ] Size/growth tracking (optional measurements)
- [ ] Health indicators (1-5 scale)
- [ ] Intervention recording (repotted, pruned, treated)

#### 4.1.4 Mother Plant Registry

**Purpose**: Track source/stock plants for propagation

**FR-7: Mother Plant Registration**
**Priority**: P1
**Description**: Register and track mother/stock plants
**Acceptance Criteria**:
- [ ] Register plant with species, variety, acquisition date
- [ ] Assign location/site
- [ ] Record acquisition method (bought, propagated, gifted, wild-collected)
- [ ] Add photos
- [ ] Track age (from acquisition or estimated)
- [ ] Mark as "active propagation stock" or "retired"

**FR-8: Mother Plant Health Tracking**
**Priority**: P2
**Description**: Monitor health and condition of stock plants
**Acceptance Criteria**:
- [ ] Periodic health assessments (1-5 scale + notes)
- [ ] Track interventions (feeding, pruning, treatment)
- [ ] Record best propagation times/conditions
- [ ] Flag health concerns

**FR-9: Mother Plant Productivity Metrics**
**Priority**: P1
**Description**: Track propagation performance from each mother
**Acceptance Criteria**:
- [ ] Total batches taken from this mother
- [ ] Total propagules produced
- [ ] Success rate from this mother
- [ ] Average success rate by method (if multiple used)
- [ ] Best performing season/conditions

#### 4.1.5 Propagation Stations

**Purpose**: Track propagation locations and their conditions

**FR-10: Station Management**
**Priority**: P1
**Description**: Define and manage propagation stations
**Acceptance Criteria**:
- [ ] Create station with name and description
- [ ] Specify station type (heated propagator, water, outdoor bed, cold frame, etc.)
- [ ] Set capacity (number of slots/pots)
- [ ] Mark as indoor/outdoor
- [ ] Set environmental targets (temp range, humidity range)
- [ ] Activate/deactivate stations seasonally

**FR-11: Station Environmental Logging**
**Priority**: P2
**Description**: Record environmental conditions per station
**Acceptance Criteria**:
- [ ] Manual temp/humidity logging
- [ ] Optional integration with sensor data (future)
- [ ] Alert thresholds (temp too high/low)
- [ ] Historical condition charts

**FR-12: Station Occupancy View**
**Priority**: P1
**Description**: See what's in each station
**Acceptance Criteria**:
- [ ] Visual capacity indicator (used/total)
- [ ] List batches currently in station
- [ ] Quick filter to station from batch list
- [ ] Move batch between stations

#### 4.1.6 Cost Tracking

**Purpose**: Track costs to calculate cost-per-propagule

**FR-13: Supplies Inventory**
**Priority**: P1
**Description**: Track propagation supplies and costs
**Acceptance Criteria**:
- [ ] Register supplies (rooting hormone, pots, medium, labels, etc.)
- [ ] Record purchase: date, quantity, total cost, supplier
- [ ] Track current stock level
- [ ] Calculate cost per unit
- [ ] Low stock alerts (optional threshold)

**FR-14: Batch Cost Assignment**
**Priority**: P1
**Description**: Assign costs to batches
**Acceptance Criteria**:
- [ ] Link supplies used to batch
- [ ] Specify quantity used from each supply
- [ ] Auto-calculate batch cost from linked supplies
- [ ] Support manual cost entry (for miscellaneous)
- [ ] Allocate shared costs (heat mat electricity, etc.)

**FR-15: Cost Per Propagule Calculation**
**Priority**: P1
**Description**: Calculate and display cost metrics
**Acceptance Criteria**:
- [ ] Batch total cost (sum of all linked supplies + manual)
- [ ] Cost per propagule at batch creation (total / quantity)
- [ ] Cost per successful propagule (total / survived to graduation)
- [ ] Cost breakdown by category (hormone, medium, containers, etc.)
- [ ] Average cost per species/method over time

#### 4.1.7 Outcomes & Graduation

**Purpose**: Track where propagules end up

**FR-16: Graduation Recording**
**Priority**: P0
**Description**: Record final destination of propagules
**Acceptance Criteria**:
- [ ] Graduate individual or batch (partial or full)
- [ ] Select outcome: personal use, planted in garden, gifted, sold, composted/failed
- [ ] Record recipient for gifts (optional name)
- [ ] Link to sales record (when Sales module exists)
- [ ] Record graduation date and notes

**FR-17: Outcome Analytics**
**Priority**: P2
**Description**: Analyze where propagules go
**Acceptance Criteria**:
- [ ] Pie chart of outcomes (sold vs gifted vs personal vs failed)
- [ ] Outcome breakdown by species
- [ ] Gift recipient history (who got what)
- [ ] Revenue potential (sold count * average price)

#### 4.1.8 Propagation Lifecycle Management

**Purpose**: Manage the stages from taking to graduation

**Lifecycle Stages**:
```
1. TAKEN      - Cut/divided/prepared from source
2. ROOTING    - In rooting medium, waiting for roots
3. ROOTED     - Roots visible/developed
4. POTTED_UP  - Moved to individual pot
5. HARDENING  - Adjusting to final conditions
6. READY      - Available for use/sale
7. GRADUATED  - Moved to final destination
8. FAILED     - Did not survive (track failure stage)
```

**FR-18: Stage Transitions**
**Priority**: P0
**Description**: Move batches/individuals through lifecycle
**Acceptance Criteria**:
- [ ] Single-tap advance to next stage
- [ ] Record date of transition
- [ ] Update surviving count if applicable
- [ ] Required: select failure reason if marking failed
- [ ] Optional: add notes on transition
- [ ] Warn if skipping stages (allow with confirmation)

**FR-19: Stage-Based Views**
**Priority**: P1
**Description**: Filter and view by lifecycle stage
**Acceptance Criteria**:
- [ ] Stage tabs/filters on batch list
- [ ] Count badges per stage
- [ ] "Days in stage" indicator
- [ ] Highlight overdue items (configurable thresholds per species)

#### 4.1.9 Analytics & Reporting

**FR-20: Success Rate Analytics**
**Priority**: P1
**Description**: Analyze propagation success rates
**Acceptance Criteria**:
- [ ] Overall success rate (graduated / taken)
- [ ] Success rate by species
- [ ] Success rate by method
- [ ] Success rate by mother plant
- [ ] Success rate by station
- [ ] Success rate by season/month
- [ ] Failure analysis (at which stage do failures occur)

**FR-21: Production Reports**
**Priority**: P2
**Description**: Generate production summaries
**Acceptance Criteria**:
- [ ] Monthly production summary
- [ ] Year-to-date production by species
- [ ] Comparison to previous periods
- [ ] Export as CSV/PDF

**FR-22: Cost Reports**
**Priority**: P2
**Description**: Financial analysis of propagation
**Acceptance Criteria**:
- [ ] Total cost by period
- [ ] Average cost per propagule by species
- [ ] Cost trend over time
- [ ] Most/least cost-effective methods

#### 4.1.10 Data Management

**FR-23: Export/Import**
**Priority**: P1
**Description**: Data portability
**Acceptance Criteria**:
- [ ] Export all propagation data as JSON
- [ ] Export batches as CSV
- [ ] Import from JSON backup
- [ ] Clear all data (with confirmation)

### 4.2 Integration Requirements

**INT-1: Site Integration**
**Priority**: P0
**Description**: Propagation module respects platform site context
**Acceptance Criteria**:
- [ ] Propagation stations belong to sites
- [ ] Batches associated with sites via station
- [ ] Site selector filters propagation data
- [ ] Weather data available from site (for outdoor stations)

**INT-2: Sales Module Hook (Future)**
**Priority**: P2
**Description**: Prepare for future Sales module integration
**Acceptance Criteria**:
- [ ] Graduation records include optional sale reference ID
- [ ] "Sold" outcome type ready for linking
- [ ] API/data structure supports sales linking

---

## 5. Data Models

### 5.1 TypeScript Interfaces

```typescript
// ============================================
// PROPAGATION MODULE TYPES
// ============================================

// Propagation methods supported
export type PropagationMethod =
  | 'cutting_softwood'
  | 'cutting_semi_hardwood'
  | 'cutting_hardwood'
  | 'cutting_leaf'
  | 'cutting_root'
  | 'division'
  | 'layering_simple'
  | 'layering_air'
  | 'grafting_whip'
  | 'grafting_cleft'
  | 'grafting_bud'
  | 'seed';

// Lifecycle stages
export type PropagationStage =
  | 'taken'
  | 'rooting'
  | 'rooted'
  | 'potted_up'
  | 'hardening'
  | 'ready'
  | 'graduated'
  | 'failed';

// Graduation outcomes
export type GraduationOutcome =
  | 'personal_use'
  | 'planted_garden'
  | 'gifted'
  | 'sold'
  | 'composted';

// Failure reasons
export type FailureReason =
  | 'rot'
  | 'dried_out'
  | 'disease'
  | 'pest'
  | 'no_roots'
  | 'transplant_shock'
  | 'environmental'
  | 'unknown';

// ============================================
// MOTHER PLANTS
// ============================================

export interface PropMotherPlant {
  id?: string;
  siteId: string;                      // Where this plant lives
  species: string;                     // Common name (e.g., "Basil")
  variety?: string;                    // Specific variety (e.g., "Genovese")
  scientificName?: string;             // Ocimum basilicum
  label: string;                       // User label (e.g., "Kitchen Window Basil")

  // Acquisition
  acquisitionDate: Date;
  acquisitionMethod: 'purchased' | 'propagated' | 'gifted' | 'wild_collected';
  acquisitionSource?: string;          // Where acquired from
  acquisitionCost?: number;            // What it cost

  // Status
  status: 'active' | 'retired' | 'deceased';
  location?: string;                   // Where it lives (e.g., "Greenhouse Bench 3")

  // Tracking
  estimatedAge?: number;               // Months old (estimated)
  lastHealthCheck?: Date;
  healthScore?: number;                // 1-5 scale
  healthNotes?: string;

  // Propagation preferences
  bestPropagationMethod?: PropagationMethod;
  bestSeason?: string;                 // "spring", "summer", etc.
  propagationNotes?: string;           // Tips for propagating this plant

  // Media
  photoUrl?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PROPAGATION STATIONS
// ============================================

export type StationType =
  | 'heated_propagator'
  | 'unheated_propagator'
  | 'water_propagation'
  | 'outdoor_bed'
  | 'cold_frame'
  | 'greenhouse_bench'
  | 'mist_system'
  | 'other';

export interface PropStation {
  id?: string;
  siteId: string;                      // Which site this station is at
  name: string;                        // "Heated Propagator 1"
  type: StationType;
  description?: string;

  // Capacity
  capacity: number;                    // Number of slots/pots

  // Environment
  isIndoor: boolean;
  targetTempMin?: number;              // Celsius
  targetTempMax?: number;
  targetHumidityMin?: number;          // Percentage
  targetHumidityMax?: number;

  // Status
  isActive: boolean;                   // Seasonally active/inactive

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface PropStationLog {
  id?: string;
  stationId: string;
  date: Date;
  temperature?: number;
  humidity?: number;
  notes?: string;
  createdAt: Date;
}

// ============================================
// PROPAGATION BATCHES
// ============================================

export interface PropBatch {
  id?: string;
  batchNumber: string;                 // "2026-042"
  siteId: string;
  stationId: string;                   // Current station

  // Source
  species: string;
  variety?: string;
  motherPlantId?: string;              // Optional link to mother plant

  // Method
  method: PropagationMethod;

  // Quantity
  quantityStarted: number;             // How many taken
  quantitySurviving: number;           // How many still alive

  // Dates
  dateTaken: Date;
  dateRooted?: Date;
  datePottedUp?: Date;
  dateHardeningStarted?: Date;
  dateReady?: Date;

  // Current stage
  stage: PropagationStage;
  daysInStage: number;                 // Computed, but cached for sorting

  // Preparation details
  preparationNotes?: string;           // Wound treatment, hormone, etc.
  rootingMedium?: string;              // What it's rooting in
  hormoneUsed?: string;                // Rooting hormone type

  // Status
  isExploded: boolean;                 // Has been converted to individuals

  // Media
  photoUrls: string[];                 // Multiple photos allowed

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// INDIVIDUAL PROPAGULES
// ============================================

export interface PropPropagule {
  id?: string;
  batchId: string;                     // Parent batch
  propaguleNumber: string;             // "2026-042-01"
  siteId: string;
  stationId: string;

  // Inherited from batch (denormalized for query performance)
  species: string;
  variety?: string;
  motherPlantId?: string;
  method: PropagationMethod;

  // Individual details
  label?: string;                      // Custom label

  // For grafts
  scionSource?: string;                // Where scion came from
  rootstockType?: string;              // Rootstock variety

  // Current state
  stage: PropagationStage;
  healthScore?: number;                // 1-5 scale

  // Measurements (optional)
  heightCm?: number;
  stemDiameterMm?: number;
  leafCount?: number;

  // Media
  photoUrls: string[];

  // Notes
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STAGE TRANSITIONS (HISTORY)
// ============================================

export interface PropStageTransition {
  id?: string;
  batchId?: string;                    // Either batch or propagule
  propaguleId?: string;

  fromStage: PropagationStage | null;  // null for initial 'taken'
  toStage: PropagationStage;
  transitionDate: Date;

  // For batch transitions
  quantityBefore?: number;
  quantityAfter?: number;

  // For failures
  failureReason?: FailureReason;

  notes?: string;

  createdAt: Date;
}

// ============================================
// GRADUATIONS
// ============================================

export interface PropGraduation {
  id?: string;
  batchId?: string;                    // Either batch or propagule
  propaguleId?: string;

  quantity: number;                    // How many graduated (1 for individuals)
  outcome: GraduationOutcome;
  graduationDate: Date;

  // For gifts
  recipientName?: string;

  // For sales (future integration)
  saleReferenceId?: string;
  salePrice?: number;

  // For garden planting
  plantedLocation?: string;

  notes?: string;

  createdAt: Date;
}

// ============================================
// SUPPLIES & COSTS
// ============================================

export type SupplyCategory =
  | 'rooting_hormone'
  | 'growing_medium'
  | 'containers'
  | 'labels'
  | 'tools'
  | 'heating'
  | 'misting'
  | 'other';

export interface PropSupply {
  id?: string;
  name: string;                        // "Clonex Rooting Gel"
  category: SupplyCategory;

  // Purchase tracking
  purchaseDate: Date;
  supplier?: string;
  quantityPurchased: number;
  unit: string;                        // "ml", "liters", "pieces", "kg"
  totalCost: number;                   // Total purchase price

  // Inventory
  quantityRemaining: number;
  lowStockThreshold?: number;          // Alert when below this

  // Calculated
  costPerUnit: number;                 // totalCost / quantityPurchased

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface PropBatchCost {
  id?: string;
  batchId: string;

  // Supply-linked cost
  supplyId?: string;
  quantityUsed?: number;
  calculatedCost?: number;             // quantityUsed * supply.costPerUnit

  // Manual cost entry
  manualCost?: number;
  manualDescription?: string;

  createdAt: Date;
}

// ============================================
// SPECIES CONFIGURATION
// ============================================

export interface PropSpeciesConfig {
  id?: string;
  species: string;                     // Common name
  scientificName?: string;

  // Default propagation settings
  preferredMethod?: PropagationMethod;
  typicalRootingDays?: number;
  typicalDaysToReady?: number;

  // Stage timing thresholds (for "overdue" warnings)
  maxDaysRooting?: number;
  maxDaysPottedUp?: number;
  maxDaysHardening?: number;

  // Season
  bestPropagationMonths?: number[];    // 1-12

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 Database Schema (Dexie.js)

```typescript
// Addition to src/lib/db/schema.ts

// Version 8: Add propagation module tables
this.version(8).stores({
  // Mother plants
  propMotherPlants: '++id, siteId, species, variety, status, [siteId+status]',

  // Stations
  propStations: '++id, siteId, type, isActive, [siteId+isActive]',
  propStationLogs: '++id, stationId, date, [stationId+date]',

  // Batches
  propBatches: '++id, batchNumber, siteId, stationId, species, stage, dateTaken, motherPlantId, [siteId+stage], [stationId+stage]',

  // Individual propagules
  propPropagules: '++id, batchId, propaguleNumber, siteId, stationId, species, stage, [batchId+stage], [siteId+stage]',

  // Stage history
  propStageTransitions: '++id, batchId, propaguleId, toStage, transitionDate',

  // Graduations
  propGraduations: '++id, batchId, propaguleId, outcome, graduationDate, [outcome+graduationDate]',

  // Supplies and costs
  propSupplies: '++id, name, category, [category+name]',
  propBatchCosts: '++id, batchId, supplyId',

  // Species configuration
  propSpeciesConfigs: '++id, &species',
});

// Convenience export
export const propDb = {
  motherPlants: db.propMotherPlants,
  stations: db.propStations,
  stationLogs: db.propStationLogs,
  batches: db.propBatches,
  propagules: db.propPropagules,
  stageTransitions: db.propStageTransitions,
  graduations: db.propGraduations,
  supplies: db.propSupplies,
  batchCosts: db.propBatchCosts,
  speciesConfigs: db.propSpeciesConfigs,
};
```

---

## 6. Technical Specifications

### 6.1 Module Structure

```
src/modules/propagation/
├── index.tsx                    # Module entry point
├── routes.tsx                   # Propagation-specific routes
├── types/
│   └── index.ts                 # Type exports
├── stores/
│   ├── useBatches.ts           # Batch CRUD and queries
│   ├── usePropagules.ts        # Individual propagule management
│   ├── useMotherPlants.ts      # Mother plant registry
│   ├── useStations.ts          # Station management
│   ├── useSupplies.ts          # Supplies inventory
│   ├── useCosts.ts             # Cost calculations
│   └── useAnalytics.ts         # Aggregated analytics
├── components/
│   ├── Dashboard/
│   │   ├── PropDashboard.tsx
│   │   ├── StationOverview.tsx
│   │   ├── MetricsCards.tsx
│   │   └── NeedingAttention.tsx
│   ├── Batches/
│   │   ├── BatchList.tsx
│   │   ├── BatchCard.tsx
│   │   ├── NewBatchForm.tsx
│   │   ├── BatchDetail.tsx
│   │   ├── StageTransition.tsx
│   │   └── ExplodeBatchModal.tsx
│   ├── Propagules/
│   │   ├── PropaguleList.tsx
│   │   ├── PropaguleCard.tsx
│   │   ├── PropaguleDetail.tsx
│   │   └── PropaguleUpdate.tsx
│   ├── MotherPlants/
│   │   ├── MotherPlantList.tsx
│   │   ├── MotherPlantCard.tsx
│   │   ├── MotherPlantForm.tsx
│   │   └── MotherPlantDetail.tsx
│   ├── Stations/
│   │   ├── StationList.tsx
│   │   ├── StationCard.tsx
│   │   ├── StationForm.tsx
│   │   └── StationDetail.tsx
│   ├── Supplies/
│   │   ├── SupplyList.tsx
│   │   ├── SupplyForm.tsx
│   │   └── InventoryAlert.tsx
│   ├── Costs/
│   │   ├── BatchCostForm.tsx
│   │   ├── CostBreakdown.tsx
│   │   └── CostSummary.tsx
│   ├── Graduation/
│   │   ├── GraduationForm.tsx
│   │   └── GraduationHistory.tsx
│   └── Analytics/
│       ├── SuccessRates.tsx
│       ├── ProductionChart.tsx
│       ├── CostAnalysis.tsx
│       └── FailureAnalysis.tsx
└── utils/
    ├── batchNumbering.ts        # Generate batch numbers
    ├── stageHelpers.ts          # Stage transition logic
    ├── costCalculations.ts      # Cost per propagule math
    └── exporters.ts             # CSV/JSON export
```

### 6.2 Routing Structure

```typescript
// src/modules/propagation/routes.tsx
import { Routes, Route } from 'react-router-dom';

export function PropagationRoutes() {
  return (
    <Routes>
      <Route index element={<PropDashboard />} />
      <Route path="batches" element={<BatchList />} />
      <Route path="batches/new" element={<NewBatchForm />} />
      <Route path="batches/:id" element={<BatchDetail />} />
      <Route path="propagules" element={<PropaguleList />} />
      <Route path="propagules/:id" element={<PropaguleDetail />} />
      <Route path="mother-plants" element={<MotherPlantList />} />
      <Route path="mother-plants/new" element={<MotherPlantForm />} />
      <Route path="mother-plants/:id" element={<MotherPlantDetail />} />
      <Route path="stations" element={<StationList />} />
      <Route path="stations/:id" element={<StationDetail />} />
      <Route path="supplies" element={<SupplyList />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="settings" element={<PropagationSettings />} />
    </Routes>
  );
}
```

### 6.3 Module Navigation

```
Propagation Module Sub-Navigation:
[Dashboard] - [Batches] - [Mother Plants] - [Stations] - [Supplies] - [Analytics]
```

### 6.4 Key Algorithms

#### Batch Number Generation

```typescript
// utils/batchNumbering.ts
export async function generateBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  // Find highest batch number this year
  const batches = await propDb.batches
    .where('batchNumber')
    .startsWith(prefix)
    .toArray();

  const maxNumber = batches.reduce((max, b) => {
    const num = parseInt(b.batchNumber.split('-')[1], 10);
    return num > max ? num : max;
  }, 0);

  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${prefix}${nextNumber}`;
}
```

#### Cost Per Propagule Calculation

```typescript
// utils/costCalculations.ts
export interface BatchCostSummary {
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  costPerGraduated: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export async function calculateBatchCost(batchId: string): Promise<BatchCostSummary> {
  const batch = await propDb.batches.get(batchId);
  if (!batch) throw new Error('Batch not found');

  const costs = await propDb.batchCosts.where('batchId').equals(batchId).toArray();
  const graduations = await propDb.graduations.where('batchId').equals(batchId).toArray();

  let totalCost = 0;
  const categoryTotals: Record<string, number> = {};

  for (const cost of costs) {
    const amount = cost.calculatedCost ?? cost.manualCost ?? 0;
    totalCost += amount;

    if (cost.supplyId) {
      const supply = await propDb.supplies.get(cost.supplyId);
      if (supply) {
        categoryTotals[supply.category] = (categoryTotals[supply.category] ?? 0) + amount;
      }
    } else {
      categoryTotals['other'] = (categoryTotals['other'] ?? 0) + amount;
    }
  }

  const graduatedCount = graduations.reduce((sum, g) => sum + g.quantity, 0);

  return {
    totalCost,
    costPerStarted: totalCost / batch.quantityStarted,
    costPerSurviving: batch.quantitySurviving > 0
      ? totalCost / batch.quantitySurviving
      : 0,
    costPerGraduated: graduatedCount > 0
      ? totalCost / graduatedCount
      : 0,
    breakdown: Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalCost) * 100,
    })),
  };
}
```

#### Success Rate Calculation

```typescript
// utils/analytics.ts
export interface SuccessRateResult {
  totalStarted: number;
  totalGraduated: number;
  totalFailed: number;
  successRate: number;
  failureRate: number;
  inProgress: number;
}

export async function calculateSuccessRate(
  filters: {
    species?: string;
    method?: PropagationMethod;
    motherPlantId?: string;
    stationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}
): Promise<SuccessRateResult> {
  let query = propDb.batches.toCollection();

  // Apply filters
  const batches = await query.toArray();
  const filtered = batches.filter(b => {
    if (filters.species && b.species !== filters.species) return false;
    if (filters.method && b.method !== filters.method) return false;
    if (filters.motherPlantId && b.motherPlantId !== filters.motherPlantId) return false;
    if (filters.stationId && b.stationId !== filters.stationId) return false;
    if (filters.dateFrom && b.dateTaken < filters.dateFrom) return false;
    if (filters.dateTo && b.dateTaken > filters.dateTo) return false;
    return true;
  });

  let totalStarted = 0;
  let totalGraduated = 0;
  let totalFailed = 0;

  for (const batch of filtered) {
    totalStarted += batch.quantityStarted;

    // Get graduations for this batch
    const graduations = await propDb.graduations
      .where('batchId')
      .equals(batch.id!)
      .toArray();

    const graduated = graduations
      .filter(g => g.outcome !== 'composted')
      .reduce((sum, g) => sum + g.quantity, 0);

    const failed = graduations
      .filter(g => g.outcome === 'composted')
      .reduce((sum, g) => sum + g.quantity, 0);

    // Also count batch-level failures
    if (batch.stage === 'failed') {
      totalFailed += batch.quantitySurviving; // Remaining when failed
    }

    totalGraduated += graduated;
    totalFailed += failed;
  }

  const completed = totalGraduated + totalFailed;

  return {
    totalStarted,
    totalGraduated,
    totalFailed,
    successRate: completed > 0 ? (totalGraduated / completed) * 100 : 0,
    failureRate: completed > 0 ? (totalFailed / completed) * 100 : 0,
    inProgress: totalStarted - completed,
  };
}
```

---

## 7. UI Wireframes (ASCII)

### 7.1 New Batch Form

```
+------------------------------------------------------------------+
| New Propagation Batch                                        [X] |
+------------------------------------------------------------------+
|                                                                   |
| Species *        [_________________v] [+ Add New]                 |
|                                                                   |
| Variety          [_________________]                              |
|                                                                   |
| Method *         [Softwood Cutting_v]                             |
|                  ( ) Softwood Cutting                             |
|                  ( ) Semi-Hardwood Cutting                        |
|                  ( ) Hardwood Cutting                             |
|                  ( ) Division                                     |
|                  ( ) Layering                                     |
|                  ( ) Grafting                                     |
|                  ( ) Seed                                         |
|                                                                   |
| Mother Plant     [Select mother plant...v] [+ Register New]      |
|                  (Optional - track source plant)                  |
|                                                                   |
| Quantity *       [____] propagules                                |
|                  [5] [10] [20] [50] [100]                        |
|                                                                   |
| Station *        [Heated Propagator 1v]                          |
|                                                                   |
| Date Taken       [2026-01-12______]  (defaults to today)         |
|                                                                   |
| --- Preparation Details ---                                       |
|                                                                   |
| Rooting Medium   [Perlite/Vermiculite Mix v]                     |
|                                                                   |
| Hormone Used     [Clonex Gel___________]                         |
|                                                                   |
| Preparation Notes                                                 |
| +-------------------------------------------------------------+  |
| | Took 3-4 node cuttings, removed lower leaves, fresh wound   |  |
| | cut at 45 degrees, dipped in hormone for 5 seconds          |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| [Add Photo]  camera.jpg                                          |
|                                                                   |
+------------------------------------------------------------------+
| [Cancel]                                    [Create Batch]        |
+------------------------------------------------------------------+
```

### 7.2 Batch List View

```
+------------------------------------------------------------------+
| BATCHES                                              [+ New Batch] |
+------------------------------------------------------------------+
| [All] [Rooting] [Rooted] [Potted] [Hardening] [Ready] [Graduated] |
+------------------------------------------------------------------+
| Filter: [All Species v] [All Methods v] [All Stations v]         |
| Sort:   [Date Taken v]  [Asc/Desc]                                |
+------------------------------------------------------------------+
|                                                                   |
| +--------------------------------------------------------------+ |
| | #2026-042  BASIL (Genovese)                           ROOTING | |
| | 20 propagules | Softwood Cutting | Heated Prop 1              | |
| | Taken: Jan 5 (7 days ago) | From: Kitchen Basil               | |
| | [Update Stage] [View Details]                                 | |
| +--------------------------------------------------------------+ |
|                                                                   |
| +--------------------------------------------------------------+ |
| | #2026-041  ROSEMARY                                    ROOTED | |
| | 15/18 surviving | Semi-Hardwood | Heated Prop 1               | |
| | Rooted: Jan 8 (4 days ago) | Ready to pot up                  | |
| | [Pot Up] [View Details]                                       | |
| +--------------------------------------------------------------+ |
|                                                                   |
| +--------------------------------------------------------------+ |
| | #2026-039  LAVENDER                                     READY | |
| | 12/15 surviving | Softwood Cutting | Outdoor Bed A            | |
| | Ready since: Jan 2 | 10 days in stage                         | |
| | [Graduate] [View Details]                                     | |
| +--------------------------------------------------------------+ |
|                                                                   |
| +--------------------------------------------------------------+ |
| | #2026-035  FIG (Brown Turkey)                       GRADUATED | |
| | 8/10 graduated | Hardwood | Cold Frame                        | |
| | Graduated: Dec 28 | 5 sold, 2 gifted, 1 planted               | |
| | [View Details]                                                | |
| +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
| Showing 1-10 of 42 batches                        [< Prev] [Next >]|
+------------------------------------------------------------------+
```

### 7.3 Batch Detail View

```
+------------------------------------------------------------------+
| <- Back to Batches                                                |
+------------------------------------------------------------------+
| BATCH #2026-042                                                   |
| Basil (Genovese)                                          ROOTING |
+------------------------------------------------------------------+
|                                                                   |
| +------------------------+  +----------------------------------+  |
| |       [Photo]         |  | Quantity                         |  |
| |                       |  | Started:    20                   |  |
| |    basil-cuttings.jpg |  | Surviving:  20 (100%)            |  |
| |                       |  |                                  |  |
| +------------------------+  | Timeline                         |  |
|                             | Taken:    Jan 5, 2026            |  |
| Method: Softwood Cutting    | Days in stage: 7                 |  |
| Station: Heated Propagator 1|                                  |  |
| Mother: Kitchen Basil (#12) | Cost                             |  |
|                             | Total: $4.50                     |  |
|                             | Per propagule: $0.23             |  |
|                             +----------------------------------+  |
|                                                                   |
| === STAGE PROGRESSION ===                                         |
|                                                                   |
| [TAKEN]-->[ROOTING]-->[ ROOTED ]-->[ POTTED ]-->[ READY ]-->[GRAD]|
|    *         *            o            o           o          o   |
|  Jan 5     Jan 5                                                  |
|                                                                   |
| === PREPARATION NOTES ===                                         |
| +-------------------------------------------------------------+  |
| | Took 3-4 node cuttings from vigorous growth. Removed lower  |  |
| | leaves, fresh wound cut at 45 degrees. Dipped in Clonex for |  |
| | 5 seconds. Planted in perlite/vermiculite 50/50 mix.        |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| === STAGE HISTORY ===                                             |
| +-------------------------------------------------------------+  |
| | Jan 5 | TAKEN -> ROOTING | 20 propagules | Started batch   |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| === COSTS ===                                                     |
| +-------------------------------------------------------------+  |
| | Clonex Gel (5ml)           $1.50                            |  |
| | Perlite (200ml)            $0.80                            |  |
| | Vermiculite (200ml)        $0.70                            |  |
| | 72-cell tray (1)           $1.50                            |  |
| | -------------------------------------------                 |  |
| | Total                      $4.50                            |  |
| | Per started                $0.23                            |  |
| +-------------------------------------------------------------+  |
| [+ Add Cost]                                                      |
|                                                                   |
+------------------------------------------------------------------+
| [Advance to ROOTED]  [Record Failure]  [Explode to Individuals]   |
+------------------------------------------------------------------+
```

### 7.4 Stage Transition Modal

```
+------------------------------------------------------------------+
| Update Stage: Batch #2026-042                                [X] |
+------------------------------------------------------------------+
|                                                                   |
| Current Stage:  ROOTING (7 days)                                  |
|                                                                   |
| New Stage:      ( ) ROOTED - Roots visible/developed              |
|                 ( ) FAILED - Did not survive                      |
|                                                                   |
| --- If advancing to ROOTED ---                                    |
|                                                                   |
| Quantity Surviving:  [18___] of 20 started                        |
|                      (2 failed to root)                           |
|                                                                   |
| Notes:                                                            |
| +-------------------------------------------------------------+  |
| | Good root development on most. 2 showed rot at base, removed |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| --- If marking as FAILED ---                                      |
|                                                                   |
| Failure Reason:   [Select reason...v]                             |
|                   - Rot                                           |
|                   - Dried out                                     |
|                   - Disease                                       |
|                   - Pest damage                                   |
|                   - No roots                                      |
|                   - Transplant shock                              |
|                   - Environmental                                 |
|                   - Unknown                                       |
|                                                                   |
+------------------------------------------------------------------+
| [Cancel]                                      [Update Stage]      |
+------------------------------------------------------------------+
```

### 7.5 Mother Plant Registry

```
+------------------------------------------------------------------+
| MOTHER PLANTS                                   [+ Register Plant] |
+------------------------------------------------------------------+
| [Active] [Retired] [All]                                          |
| Search: [____________________]                                    |
+------------------------------------------------------------------+
|                                                                   |
| +--------------------------------------------------------------+ |
| | #12 KITCHEN BASIL                                      ACTIVE | |
| | Basil (Genovese) | Ocimum basilicum                           | |
| | Location: Greenhouse Bench 3 | Age: ~8 months                 | |
| | Health: [****-] 4/5 | Last checked: Jan 10                    | |
| +---------------------------+----------------------------------+ | |
| | PROPAGATION STATS        | BEST PERFORMANCE                 | | |
| | Batches taken: 8         | Method: Softwood cutting         | | |
| | Total propagules: 145    | Season: Summer                   | | |
| | Success rate: 82%        | Avg success: 85%                 | | |
| +---------------------------+----------------------------------+ | |
| | [View Details] [Take Cutting] [Health Check]                  | |
| +--------------------------------------------------------------+ |
|                                                                   |
| +--------------------------------------------------------------+ |
| | #8 PROVENCE LAVENDER                                   ACTIVE | |
| | Lavender (Provence) | Lavandula x intermedia                  | |
| | Location: Outdoor Bed B | Age: ~2 years                       | |
| | Health: [*****] 5/5 | Last checked: Jan 8                     | |
| +---------------------------+----------------------------------+ | |
| | PROPAGATION STATS        | BEST PERFORMANCE                 | | |
| | Batches taken: 12        | Method: Semi-hardwood             | | |
| | Total propagules: 180    | Season: Late summer               | | |
| | Success rate: 75%        | Avg success: 78%                 | | |
| +---------------------------+----------------------------------+ | |
| | [View Details] [Take Cutting] [Health Check]                  | |
| +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.6 Supplies Inventory

```
+------------------------------------------------------------------+
| SUPPLIES INVENTORY                                    [+ Purchase] |
+------------------------------------------------------------------+
| [All] [Hormones] [Media] [Containers] [Labels] [Tools] [Other]   |
+------------------------------------------------------------------+
|                                                                   |
| === LOW STOCK ALERTS ===                                          |
| +-------------------------------------------------------------+  |
| | ! Clonex Gel - 15ml remaining (threshold: 20ml)             |  |
| | ! 72-cell trays - 3 remaining (threshold: 5)                |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| === ROOTING HORMONES ===                                          |
| +----------------------+----------+--------+----------+---------+ |
| | Name                 | Stock    | Unit   | Cost/Unit| Actions | |
| +----------------------+----------+--------+----------+---------+ |
| | Clonex Gel           | 15ml     | ml     | $0.30    | [Edit]  | |
| | Rooting Powder #1    | 45g      | g      | $0.08    | [Edit]  | |
| +----------------------+----------+--------+----------+---------+ |
|                                                                   |
| === GROWING MEDIA ===                                             |
| +----------------------+----------+--------+----------+---------+ |
| | Perlite              | 5L       | L      | $0.80    | [Edit]  | |
| | Vermiculite          | 3L       | L      | $0.90    | [Edit]  | |
| | Seed Raising Mix     | 20L      | L      | $0.50    | [Edit]  | |
| +----------------------+----------+--------+----------+---------+ |
|                                                                   |
| === CONTAINERS ===                                                |
| +----------------------+----------+--------+----------+---------+ |
| | 72-cell trays        | 3        | pc     | $1.50    | [Edit]  | |
| | 50mm tubes           | 120      | pc     | $0.15    | [Edit]  | |
| | 100mm pots           | 45       | pc     | $0.35    | [Edit]  | |
| +----------------------+----------+--------+----------+---------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.7 Analytics Dashboard

```
+------------------------------------------------------------------+
| PROPAGATION ANALYTICS                                             |
+------------------------------------------------------------------+
| Period: [Last 90 Days v]  Species: [All v]  Method: [All v]      |
+------------------------------------------------------------------+
|                                                                   |
| === OVERALL PERFORMANCE ===                                       |
| +----------------+ +----------------+ +----------------+          |
| | 78%            | | 523            | | $2.45          |          |
| | Success Rate   | | Graduated      | | Avg Cost/Prop  |          |
| | (target: 75%)  | | (from 670)     | |                |          |
| +----------------+ +----------------+ +----------------+          |
|                                                                   |
| === SUCCESS RATE BY SPECIES ===                                   |
| +----------------------------------------------------------+     |
| | Basil          [=============================] 85%        |     |
| | Rosemary       [==========================   ] 72%        |     |
| | Lavender       [=========================    ] 70%        |     |
| | Fig            [============================  ] 80%       |     |
| | Sage           [=======================      ] 65%        |     |
| +----------------------------------------------------------+     |
|                                                                   |
| === SUCCESS RATE BY METHOD ===                                    |
| +----------------------------------------------------------+     |
| | Softwood Cut   [=============================] 82%        |     |
| | Semi-Hardwood  [=========================    ] 71%        |     |
| | Hardwood       [==========================   ] 75%        |     |
| | Division       [================================] 90%     |     |
| +----------------------------------------------------------+     |
|                                                                   |
| === FAILURE ANALYSIS ===                                          |
| +----------------------------------------------------------+     |
| | Stage where failures occur:                               |     |
| |                                                           |     |
| | Rooting    [==================] 55%                       |     |
| | Potted Up  [========         ] 25%                        |     |
| | Hardening  [====             ] 12%                        |     |
| | Ready      [==               ] 8%                         |     |
| |                                                           |     |
| | Top failure reasons:                                      |     |
| | 1. Rot (35%)                                              |     |
| | 2. No roots (28%)                                         |     |
| | 3. Dried out (18%)                                        |     |
| +----------------------------------------------------------+     |
|                                                                   |
| === OUTCOMES DISTRIBUTION ===                                     |
| +----------------------------------------------------------+     |
| |                    [PIE CHART]                            |     |
| |                                                           |     |
| |    Sold: 45% | Gifted: 25% | Garden: 20% | Personal: 10% |     |
| +----------------------------------------------------------+     |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 8. Implementation Phases

### Phase 1: Core Batch Tracking (Days 1-4)

**Goal**: Basic batch CRUD and stage management

**Tasks**:
- [ ] Database schema implementation (new tables)
- [ ] Batch CRUD operations (create, read, update, list)
- [ ] Stage transition logic and UI
- [ ] Batch list view with filtering
- [ ] New batch form
- [ ] Batch detail view
- [ ] Basic dashboard with counts

**Deliverable**: Can create batches, track through stages, view history

### Phase 2: Stations & Mother Plants (Days 5-7)

**Goal**: Supporting entity management

**Tasks**:
- [ ] Station CRUD and list
- [ ] Station occupancy tracking
- [ ] Mother plant registry
- [ ] Mother plant health tracking
- [ ] Link batches to stations and mother plants
- [ ] Dashboard station overview

**Deliverable**: Full entity relationships working

### Phase 3: Cost Tracking (Days 8-10)

**Goal**: Financial tracking and calculations

**Tasks**:
- [ ] Supplies inventory management
- [ ] Purchase recording
- [ ] Batch cost assignment
- [ ] Cost per propagule calculations
- [ ] Cost breakdown views
- [ ] Low stock alerts

**Deliverable**: Complete cost tracking system

### Phase 4: Graduation & Outcomes (Days 11-12)

**Goal**: Track where propagules end up

**Tasks**:
- [ ] Graduation recording (batch and individual)
- [ ] Outcome selection and tracking
- [ ] Gift recipient tracking
- [ ] Sales module hook (data structure ready)
- [ ] Graduation history view

**Deliverable**: Full lifecycle tracking complete

### Phase 5: Individual Propagules (Days 13-15)

**Goal**: Detailed individual tracking for high-value plants

**Tasks**:
- [ ] Explode batch to individuals feature
- [ ] Individual propagule CRUD
- [ ] Individual detail view with history
- [ ] Individual photos and measurements
- [ ] Individual stage tracking

**Deliverable**: Support for tree/high-value plant tracking

### Phase 6: Analytics & Polish (Days 16-18)

**Goal**: Insights and refinements

**Tasks**:
- [ ] Success rate analytics (by species, method, mother, station)
- [ ] Failure analysis
- [ ] Production reports
- [ ] Cost analysis
- [ ] Export/import
- [ ] Mobile optimization
- [ ] Dark mode support

**Deliverable**: Production-ready module

---

## 9. Acceptance Criteria

### 9.1 Batch Management

- [ ] Can create a batch with all required fields (species, method, quantity, station)
- [ ] Batch number auto-generates correctly (YYYY-NNN format)
- [ ] Can link batch to mother plant (optional)
- [ ] Can view list of all batches with status indicators
- [ ] Can filter batches by stage, species, method, station
- [ ] Can transition batch to next stage
- [ ] Surviving quantity updates correctly through stages
- [ ] Can record batch failure with reason
- [ ] Stage history is preserved and viewable

### 9.2 Individual Propagules

- [ ] Can explode batch into individual records
- [ ] Individual records inherit batch metadata
- [ ] Can track individuals independently
- [ ] Can update individual status, health, measurements
- [ ] Can attach photos to individuals

### 9.3 Mother Plants

- [ ] Can register new mother plant with all fields
- [ ] Can view list of mother plants
- [ ] Can record health assessments
- [ ] Propagation stats calculate correctly (batches, success rate)
- [ ] Can retire/reactivate mother plants

### 9.4 Stations

- [ ] Can create station with type and capacity
- [ ] Can view station occupancy (used/total)
- [ ] Can move batches between stations
- [ ] Can log environmental conditions
- [ ] Can activate/deactivate stations

### 9.5 Supplies & Costs

- [ ] Can register supplies with purchase info
- [ ] Cost per unit calculates correctly
- [ ] Can assign costs to batches
- [ ] Batch total cost calculates correctly
- [ ] Cost per propagule (started/surviving/graduated) calculates correctly
- [ ] Low stock alerts trigger at threshold

### 9.6 Graduation

- [ ] Can graduate batch (full or partial)
- [ ] Can select outcome (sold, gifted, planted, personal, composted)
- [ ] Can record recipient for gifts
- [ ] Graduation history is preserved

### 9.7 Analytics

- [ ] Overall success rate calculates correctly
- [ ] Success rate by species is accurate
- [ ] Success rate by method is accurate
- [ ] Success rate by mother plant is accurate
- [ ] Failure analysis shows stage distribution
- [ ] Outcomes pie chart displays correctly

### 9.8 Data Persistence

- [ ] All data survives browser refresh
- [ ] Can export all propagation data as JSON
- [ ] Can export batches as CSV
- [ ] Can import from JSON backup

### 9.9 Usability

- [ ] Works on mobile viewport (375px width)
- [ ] Touch targets are at least 44px
- [ ] Dark mode works correctly
- [ ] New batch entry takes < 60 seconds
- [ ] Stage update takes < 15 seconds

---

## 10. Future Considerations

### 10.1 Sales Module Integration

When the Sales module is built:
- Graduation records will link to sale transactions
- "Sold" outcome will include sale price and order reference
- Available inventory view will show "Ready" propagules for sale
- Revenue attribution to propagation batches

### 10.2 Planner Module Integration

When the Planner module is built:
- Propagation planning calendar
- Succession planting for propagation
- Demand forecasting based on historical data
- Mother plant harvest scheduling

### 10.3 Advanced Features (Post-MVP)

- **Photo timeline**: Visual history of propagule development
- **Sensor integration**: Automatic temp/humidity logging
- **Weather correlation**: Link outdoor success rates to weather data
- **AI suggestions**: Recommend best propagation times/methods
- **Barcode/QR labels**: Generate and scan plant labels
- **Sharing**: Export propagation guides from successful batches

### 10.4 Data Migration

If users have existing propagation data in spreadsheets:
- CSV import template for batches
- Data validation during import
- Duplicate detection

---

## 11. Appendix

### 11.1 Default Species Configurations

```typescript
const defaultSpeciesConfigs: PropSpeciesConfig[] = [
  {
    species: 'Basil',
    scientificName: 'Ocimum basilicum',
    preferredMethod: 'cutting_softwood',
    typicalRootingDays: 14,
    typicalDaysToReady: 42,
    maxDaysRooting: 21,
    bestPropagationMonths: [10, 11, 12, 1, 2, 3], // Oct-Mar (Southern Hemisphere summer)
  },
  {
    species: 'Rosemary',
    scientificName: 'Salvia rosmarinus',
    preferredMethod: 'cutting_semi_hardwood',
    typicalRootingDays: 28,
    typicalDaysToReady: 90,
    maxDaysRooting: 42,
    bestPropagationMonths: [9, 10, 11, 3, 4], // Spring and autumn
  },
  {
    species: 'Lavender',
    scientificName: 'Lavandula spp.',
    preferredMethod: 'cutting_softwood',
    typicalRootingDays: 21,
    typicalDaysToReady: 70,
    maxDaysRooting: 35,
    bestPropagationMonths: [11, 12, 1, 2], // Late spring/summer
  },
  {
    species: 'Fig',
    scientificName: 'Ficus carica',
    preferredMethod: 'cutting_hardwood',
    typicalRootingDays: 42,
    typicalDaysToReady: 180,
    maxDaysRooting: 60,
    bestPropagationMonths: [6, 7, 8], // Winter dormancy
  },
  {
    species: 'Mint',
    scientificName: 'Mentha spp.',
    preferredMethod: 'division',
    typicalRootingDays: 7,
    typicalDaysToReady: 21,
    maxDaysRooting: 14,
    bestPropagationMonths: [9, 10, 11, 3, 4, 5], // Spring/autumn
  },
];
```

### 11.2 Station Type Defaults

```typescript
const stationTypeDefaults: Record<StationType, Partial<PropStation>> = {
  heated_propagator: {
    isIndoor: true,
    targetTempMin: 20,
    targetTempMax: 25,
    targetHumidityMin: 70,
    targetHumidityMax: 90,
  },
  unheated_propagator: {
    isIndoor: true,
    targetTempMin: 15,
    targetTempMax: 22,
    targetHumidityMin: 60,
    targetHumidityMax: 80,
  },
  water_propagation: {
    isIndoor: true,
    targetTempMin: 18,
    targetTempMax: 24,
  },
  outdoor_bed: {
    isIndoor: false,
  },
  cold_frame: {
    isIndoor: false,
    targetTempMin: 5,
    targetTempMax: 20,
  },
  greenhouse_bench: {
    isIndoor: true,
    targetTempMin: 15,
    targetTempMax: 30,
  },
  mist_system: {
    isIndoor: true,
    targetHumidityMin: 85,
    targetHumidityMax: 95,
  },
  other: {},
};
```

### 11.3 Calculation Reference

```typescript
// Days in stage (cached but recalculated on view)
const daysInStage = Math.floor(
  (Date.now() - lastTransitionDate.getTime()) / (24 * 60 * 60 * 1000)
);

// Success rate
const successRate = totalGraduated / (totalGraduated + totalFailed) * 100;

// Cost per successful propagule
const costPerSuccess = totalBatchCost / graduatedCount;

// Station occupancy percentage
const occupancy = (usedSlots / totalCapacity) * 100;

// Mother plant productivity score (weighted average)
const productivityScore =
  (successRate * 0.4) +
  (totalPropagules / monthsSinceFirst * 0.3) +
  (healthScore / 5 * 100 * 0.3);
```

---

*End of PRD*
