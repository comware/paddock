# Propagation Module - Domain Models

**Document Version**: 1.0
**Date**: January 2026
**Status**: Production-Ready

This document provides complete domain models for the Paddock Propagation module, ready for direct implementation.

---

## Table of Contents

1. [Domain Glossary](#1-domain-glossary)
2. [TypeScript Interfaces](#2-typescript-interfaces)
3. [Dexie.js Database Schema](#3-dexiejs-database-schema)
4. [Validation Rules](#4-validation-rules)
5. [State Machines](#5-state-machines)
6. [Computed Fields & Business Logic](#6-computed-fields--business-logic)
7. [Entity-Relationship Diagram](#7-entity-relationship-diagram)
8. [Invariants Checklist](#8-invariants-checklist)

---

## 1. Domain Glossary

### Core Entities

#### Mother Plant (`PropMotherPlant`)

A **Mother Plant** (also called a stock plant) is an established plant from which propagation material (cuttings, divisions, layers, etc.) is harvested. Mother plants are the genetic source for all propagated plants.

**States:** `active` | `retired` | `deceased`

**Key Attributes:**
- `species`: Common name identifying the plant type (e.g., "Basil", "Rosemary")
- `variety`: Specific cultivar or variety (e.g., "Genovese", "Tuscan Blue")
- `label`: User-assigned identifier for this specific plant (e.g., "Kitchen Window Basil")
- `acquisitionMethod`: How the plant was obtained (purchased, propagated, gifted, wild-collected)
- `healthScore`: 1-5 scale indicating current plant health

**Relationships:**
- Belongs to one Site (required)
- Has many Batches (source of propagation material)
- Has many Health Assessments (tracked over time)

**Business Rules:**
- Active mother plants can provide propagation material
- Retired plants are preserved for historical data but cannot source new batches
- Deceased plants trigger status change but records are retained

---

#### Propagation Station (`PropStation`)

A **Propagation Station** is a physical location or apparatus where cuttings/divisions root and develop. Each station has specific environmental conditions suited to propagation.

**States:** `active` | `inactive` (seasonal)

**Key Attributes:**
- `type`: Classification of station (heated_propagator, water_propagation, cold_frame, etc.)
- `capacity`: Maximum number of propagules the station can hold
- `isIndoor`: Whether station is indoors (affects environmental logging needs)
- `targetTempMin/Max`: Optimal temperature range in Celsius
- `targetHumidityMin/Max`: Optimal humidity range as percentage

**Relationships:**
- Belongs to one Site (required)
- Has many Batches (currently housed)
- Has many Environmental Logs

**Business Rules:**
- Inactive stations cannot receive new batches
- Capacity is soft limit (can exceed with warning)
- Environmental targets are optional but enable condition monitoring

---

#### Propagation Batch (`PropBatch`)

A **Propagation Batch** is a cohort of propagules (cuttings, divisions, etc.) taken from a source at the same time using the same method. Batches are the primary unit of tracking for most propagation activities.

**States:** See [Propagation Lifecycle](#propagation-lifecycle) below

**Key Attributes:**
- `batchNumber`: Auto-generated identifier (format: `YYYY-NNN`)
- `species`/`variety`: Plant identification (denormalized for query performance)
- `method`: Propagation technique used
- `quantityStarted`: Initial count of propagules in batch
- `quantitySurviving`: Current count of living propagules

**Relationships:**
- Belongs to one Site (required)
- Belongs to one Station (current location, required)
- May belong to one Mother Plant (optional source tracking)
- Has many Stage Transitions (history)
- Has many Costs (allocated expenses)
- Has many Graduations (outcomes)
- May have many Individual Propagules (if "exploded")

**Business Rules:**
- Batch number is unique and immutable once assigned
- `quantitySurviving` cannot exceed `quantityStarted`
- Cannot change method after creation
- Station can change (batch moves during lifecycle)

---

#### Individual Propagule (`PropPropagule`)

An **Individual Propagule** is a single plant being propagated, tracked independently from its batch. Used for high-value plants (trees, rare varieties) where individual success matters.

**States:** Same as Batch lifecycle stages

**Key Attributes:**
- `propaguleNumber`: Identifier derived from batch (format: `YYYY-NNN-XX`)
- `label`: Custom name for this individual (e.g., "Pink Lady Graft #3")
- `healthScore`: 1-5 scale for individual health tracking
- `scionSource`/`rootstockType`: For grafted plants, tracks component sources

**Relationships:**
- Belongs to one Batch (always, parent relationship)
- Belongs to one Site (inherited, denormalized)
- Belongs to one Station (can differ from batch if moved)
- Has many Stage Transitions (individual history)
- Has many Graduations (individual outcome)

**Business Rules:**
- Created by "exploding" a batch into individuals
- Inherits batch metadata but tracks independently thereafter
- Cannot exist without parent batch
- Individual stage can differ from batch stage after explosion

---

#### Stage Transition (`PropStageTransition`)

A **Stage Transition** is an audit record documenting when a batch or individual propagule moved between lifecycle stages.

**Key Attributes:**
- `fromStage`: Previous stage (null for initial 'taken' stage)
- `toStage`: New stage after transition
- `transitionDate`: When the transition occurred
- `quantityBefore`/`quantityAfter`: For batches, tracks survival through transition
- `failureReason`: Required when transitioning to 'failed' stage

**Relationships:**
- Belongs to one Batch OR one Propagule (mutually exclusive)

**Business Rules:**
- Immutable once created (audit log)
- Failure transitions require a reason
- Quantity changes are optional (only for batch transitions)

---

#### Supply (`PropSupply`)

A **Supply** is a consumable material used in propagation (rooting hormone, growing medium, containers, etc.). Supplies are tracked for inventory and cost allocation.

**Key Attributes:**
- `category`: Classification (rooting_hormone, growing_medium, containers, etc.)
- `quantityPurchased`/`quantityRemaining`: Inventory tracking
- `totalCost`: Purchase price for the quantity
- `costPerUnit`: Calculated unit cost for allocation

**Relationships:**
- Has many Batch Costs (allocated to batches)

**Business Rules:**
- `costPerUnit` = `totalCost` / `quantityPurchased` (computed)
- `quantityRemaining` cannot be negative
- Low stock alert when below threshold

---

#### Batch Cost (`PropBatchCost`)

A **Batch Cost** is an allocation of expense to a specific batch, either from a tracked supply or as a manual entry.

**Key Attributes:**
- `supplyId`: Reference to tracked supply (for automatic calculation)
- `quantityUsed`: Amount of supply consumed
- `calculatedCost`: `quantityUsed` * supply's `costPerUnit`
- `manualCost`/`manualDescription`: For ad-hoc costs not from inventory

**Relationships:**
- Belongs to one Batch (required)
- May reference one Supply (optional for manual costs)

**Business Rules:**
- Either `supplyId` + `quantityUsed` OR `manualCost` (not both)
- Cost calculation is automatic when supply is linked
- Manual costs require a description

---

#### Graduation (`PropGraduation`)

A **Graduation** records the final disposition of propagules - where they ended up after successful (or failed) propagation.

**Key Attributes:**
- `outcome`: Final destination (personal_use, planted_garden, gifted, sold, composted)
- `quantity`: Number of propagules in this graduation (1 for individuals)
- `recipientName`: For gifts, who received the plant
- `saleReferenceId`/`salePrice`: For sold plants, links to future Sales module

**Relationships:**
- Belongs to one Batch OR one Propagule (tracks source)

**Business Rules:**
- `composted` outcome represents failure at final stage
- Gift graduations should record recipient
- Sale graduations will link to Sales module when available

---

#### Species Configuration (`PropSpeciesConfig`)

A **Species Configuration** stores default settings and expectations for a plant type, enabling species-specific timing alerts and method recommendations.

**Key Attributes:**
- `typicalRootingDays`: Expected days from taken to rooted
- `maxDaysRooting`: Alert threshold for "overdue" warning
- `bestPropagationMonths`: Array of months (1-12) for optimal propagation
- `preferredMethod`: Default propagation method for this species

**Relationships:**
- Referenced by Batches (for species-specific defaults)

**Business Rules:**
- Species name is unique
- Configuration is optional (batches work without it)
- Timing thresholds trigger UI warnings, not enforcement

---

### Propagation Lifecycle

The propagation lifecycle defines the stages a batch or individual propagule moves through:

```
TAKEN -> ROOTING -> ROOTED -> POTTED_UP -> HARDENING -> READY -> GRADUATED
           |          |          |            |           |
           v          v          v            v           v
        FAILED     FAILED     FAILED       FAILED      FAILED
```

| Stage | Description | Typical Duration |
|-------|-------------|------------------|
| `taken` | Material harvested from source, prepared | 0 days (immediate) |
| `rooting` | In propagation medium, awaiting root development | 7-42 days (varies by species) |
| `rooted` | Roots visible/developed, ready for potting | 0-7 days (transition) |
| `potted_up` | Moved to individual container | 14-30 days |
| `hardening` | Acclimatizing to final growing conditions | 7-14 days |
| `ready` | Available for sale/use/planting | Until disposed |
| `graduated` | Moved to final destination | Terminal state |
| `failed` | Did not survive (track which stage) | Terminal state |

---

### Propagation Methods

| Method | Description | Typical Use |
|--------|-------------|-------------|
| `cutting_softwood` | Young, flexible growth | Herbs, soft-stemmed plants |
| `cutting_semi_hardwood` | Current season's growth, partially matured | Shrubs, woody herbs |
| `cutting_hardwood` | Dormant season wood | Deciduous trees, vines |
| `cutting_leaf` | Leaf with or without petiole | Succulents, some houseplants |
| `cutting_root` | Root sections | Plants that sucker |
| `division` | Separating established clumps | Perennials, grasses |
| `layering_simple` | Bending stem to root while attached | Climbers, shrubs |
| `layering_air` | Rooting stem section in sphagnum | Trees, woody plants |
| `grafting_whip` | Whip and tongue join | Fruit trees |
| `grafting_cleft` | Cleft insertion | Topworking established trees |
| `grafting_bud` | Single bud insertion | Roses, fruit trees |
| `seed` | Sexual propagation | Species, F1 varieties |

---

## 2. TypeScript Interfaces

```typescript
// ============================================
// PROPAGATION MODULE - TYPE DEFINITIONS
// File: src/modules/propagation/types/index.ts
// ============================================

// ============================================
// ENUMS & UNION TYPES
// ============================================

/**
 * Propagation methods supported by the system.
 * Categorized by plant material type.
 */
export type PropagationMethod =
  // Cuttings (vegetative)
  | 'cutting_softwood'
  | 'cutting_semi_hardwood'
  | 'cutting_hardwood'
  | 'cutting_leaf'
  | 'cutting_root'
  // Division
  | 'division'
  // Layering
  | 'layering_simple'
  | 'layering_air'
  // Grafting
  | 'grafting_whip'
  | 'grafting_cleft'
  | 'grafting_bud'
  // Seed
  | 'seed';

/**
 * Lifecycle stages for propagation tracking.
 * Ordered progression with 'failed' as terminal state from any stage.
 */
export type PropagationStage =
  | 'taken'
  | 'rooting'
  | 'rooted'
  | 'potted_up'
  | 'hardening'
  | 'ready'
  | 'graduated'
  | 'failed';

/**
 * Valid stage transitions (from -> to[]).
 * Used for validation and UI state machine.
 */
export const VALID_STAGE_TRANSITIONS: Record<PropagationStage, PropagationStage[]> = {
  taken: ['rooting', 'failed'],
  rooting: ['rooted', 'failed'],
  rooted: ['potted_up', 'failed'],
  potted_up: ['hardening', 'failed'],
  hardening: ['ready', 'failed'],
  ready: ['graduated', 'failed'],
  graduated: [], // Terminal state
  failed: [],    // Terminal state
};

/**
 * Final outcomes for graduated propagules.
 */
export type GraduationOutcome =
  | 'personal_use'   // Kept for own use
  | 'planted_garden' // Planted in landscape/garden
  | 'gifted'         // Given to someone
  | 'sold'           // Sold (links to Sales module)
  | 'composted';     // Failed at final stage

/**
 * Reasons for propagation failure.
 * Required when marking as failed.
 */
export type FailureReason =
  | 'rot'              // Fungal/bacterial rot
  | 'dried_out'        // Insufficient moisture
  | 'disease'          // Pathogen infection
  | 'pest'             // Insect/pest damage
  | 'no_roots'         // Failed to develop roots
  | 'transplant_shock' // Died after potting/moving
  | 'environmental'    // Temperature/humidity issues
  | 'unknown';         // Cause not determined

/**
 * Station type classifications.
 */
export type StationType =
  | 'heated_propagator'
  | 'unheated_propagator'
  | 'water_propagation'
  | 'outdoor_bed'
  | 'cold_frame'
  | 'greenhouse_bench'
  | 'mist_system'
  | 'other';

/**
 * Mother plant status.
 */
export type MotherPlantStatus =
  | 'active'    // Currently used for propagation
  | 'retired'   // No longer used but preserved
  | 'deceased'; // Plant has died

/**
 * How a mother plant was acquired.
 */
export type AcquisitionMethod =
  | 'purchased'
  | 'propagated'
  | 'gifted'
  | 'wild_collected';

/**
 * Supply categories for cost tracking.
 */
export type SupplyCategory =
  | 'rooting_hormone'
  | 'growing_medium'
  | 'containers'
  | 'labels'
  | 'tools'
  | 'heating'
  | 'misting'
  | 'other';

// ============================================
// MOTHER PLANTS
// ============================================

/**
 * Mother/stock plant that provides propagation material.
 */
export interface PropMotherPlant {
  id?: string;

  // Location
  siteId: string;
  location?: string;            // Physical location description

  // Identification
  species: string;              // Common name
  variety?: string;             // Cultivar/variety
  scientificName?: string;      // Binomial nomenclature
  label: string;                // User identifier for this plant

  // Acquisition history
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  acquisitionSource?: string;   // Nursery name, friend's name, etc.
  acquisitionCost?: number;     // In local currency

  // Status
  status: MotherPlantStatus;
  estimatedAge?: number;        // Months

  // Health tracking
  lastHealthCheck?: Date;
  healthScore?: number;         // 1-5 scale
  healthNotes?: string;

  // Propagation preferences (learned over time)
  bestPropagationMethod?: PropagationMethod;
  bestSeason?: string;          // "spring", "late_summer", etc.
  propagationNotes?: string;

  // Media
  photoUrl?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating a new mother plant.
 */
export type CreateMotherPlantInput = Omit<
  PropMotherPlant,
  'id' | 'createdAt' | 'updatedAt' | 'status'
> & {
  status?: MotherPlantStatus; // Defaults to 'active'
};

/**
 * Form data for updating a mother plant.
 */
export type UpdateMotherPlantInput = Partial<
  Omit<PropMotherPlant, 'id' | 'createdAt' | 'updatedAt'>
>;

// ============================================
// PROPAGATION STATIONS
// ============================================

/**
 * Physical location where propagules root and develop.
 */
export interface PropStation {
  id?: string;

  // Location
  siteId: string;

  // Identification
  name: string;                 // User-friendly name
  type: StationType;
  description?: string;

  // Capacity
  capacity: number;             // Max propagules/slots

  // Environment
  isIndoor: boolean;
  targetTempMin?: number;       // Celsius
  targetTempMax?: number;
  targetHumidityMin?: number;   // Percentage (0-100)
  targetHumidityMax?: number;

  // Status
  isActive: boolean;            // Inactive stations cannot receive batches

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Environmental log entry for a station.
 */
export interface PropStationLog {
  id?: string;
  stationId: string;
  date: Date;
  temperature?: number;         // Celsius
  humidity?: number;            // Percentage (0-100)
  notes?: string;
  createdAt: Date;
}

/**
 * Form data for creating a station.
 */
export type CreateStationInput = Omit<
  PropStation,
  'id' | 'createdAt' | 'updatedAt'
>;

// ============================================
// PROPAGATION BATCHES
// ============================================

/**
 * Cohort of propagules taken at the same time.
 */
export interface PropBatch {
  id?: string;

  // Identification
  batchNumber: string;          // Format: "YYYY-NNN" (auto-generated)

  // Location
  siteId: string;
  stationId: string;            // Current station

  // Source
  species: string;
  variety?: string;
  motherPlantId?: string;       // Optional link to mother plant

  // Method
  method: PropagationMethod;

  // Quantity tracking
  quantityStarted: number;      // Initial count
  quantitySurviving: number;    // Current living count

  // Key dates
  dateTaken: Date;
  dateRooted?: Date;
  datePottedUp?: Date;
  dateHardeningStarted?: Date;
  dateReady?: Date;
  dateGraduated?: Date;         // When last propagule graduated

  // Current state
  stage: PropagationStage;
  daysInStage: number;          // Cached, updated on load

  // Preparation details
  preparationNotes?: string;
  rootingMedium?: string;
  hormoneUsed?: string;

  // Batch management
  isExploded: boolean;          // Has been converted to individuals

  // Media
  photoUrls: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating a new batch.
 */
export type CreateBatchInput = Omit<
  PropBatch,
  | 'id'
  | 'batchNumber'
  | 'stage'
  | 'daysInStage'
  | 'isExploded'
  | 'quantitySurviving'
  | 'dateRooted'
  | 'datePottedUp'
  | 'dateHardeningStarted'
  | 'dateReady'
  | 'dateGraduated'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Batch with computed fields for UI display.
 */
export interface PropBatchWithComputed extends PropBatch {
  // Computed fields
  daysInStage: number;
  daysSinceTaken: number;
  survivalRate: number;         // percentage
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  isOverdue: boolean;           // Past expected time for stage
  motherPlantLabel?: string;    // Denormalized for display
  stationName?: string;         // Denormalized for display
}

// ============================================
// INDIVIDUAL PROPAGULES
// ============================================

/**
 * Single propagule tracked independently.
 * Created when a batch is "exploded" for individual tracking.
 */
export interface PropPropagule {
  id?: string;

  // Parent batch
  batchId: string;
  propaguleNumber: string;      // Format: "YYYY-NNN-XX"

  // Location (can differ from batch)
  siteId: string;
  stationId: string;

  // Inherited from batch (denormalized)
  species: string;
  variety?: string;
  motherPlantId?: string;
  method: PropagationMethod;

  // Individual details
  label?: string;               // Custom name

  // For grafts
  scionSource?: string;
  rootstockType?: string;

  // Current state
  stage: PropagationStage;
  healthScore?: number;         // 1-5 scale

  // Measurements
  heightCm?: number;
  stemDiameterMm?: number;
  leafCount?: number;
  rootScore?: number;           // 1-5 scale for root development

  // Media
  photoUrls: string[];

  // Notes
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Propagule with computed display fields.
 */
export interface PropPropaguleWithComputed extends PropPropagule {
  daysInStage: number;
  daysSinceTaken: number;
  batchNumber?: string;         // From parent batch
  stationName?: string;
}

// ============================================
// STAGE TRANSITIONS (AUDIT LOG)
// ============================================

/**
 * Immutable record of a stage change.
 */
export interface PropStageTransition {
  id?: string;

  // Target (exactly one must be set)
  batchId?: string;
  propaguleId?: string;

  // Transition details
  fromStage: PropagationStage | null; // null for initial 'taken'
  toStage: PropagationStage;
  transitionDate: Date;

  // Quantity tracking (batch only)
  quantityBefore?: number;
  quantityAfter?: number;

  // Failure details
  failureReason?: FailureReason;

  notes?: string;

  createdAt: Date;
}

/**
 * Input for creating a stage transition.
 */
export interface StageTransitionInput {
  batchId?: string;
  propaguleId?: string;
  toStage: PropagationStage;
  quantityAfter?: number;
  failureReason?: FailureReason;
  notes?: string;
}

// ============================================
// GRADUATIONS (OUTCOMES)
// ============================================

/**
 * Final disposition of propagules.
 */
export interface PropGraduation {
  id?: string;

  // Source (exactly one must be set)
  batchId?: string;
  propaguleId?: string;

  // Graduation details
  quantity: number;             // Number graduating (1 for individuals)
  outcome: GraduationOutcome;
  graduationDate: Date;

  // Gift details
  recipientName?: string;
  recipientContact?: string;    // Email/phone for follow-up

  // Sale details (future Sales module integration)
  saleReferenceId?: string;
  salePrice?: number;

  // Planting details
  plantedLocation?: string;     // Where in garden

  notes?: string;

  createdAt: Date;
}

/**
 * Input for recording a graduation.
 */
export interface GraduationInput {
  batchId?: string;
  propaguleId?: string;
  quantity: number;
  outcome: GraduationOutcome;
  recipientName?: string;
  plantedLocation?: string;
  salePrice?: number;
  notes?: string;
}

// ============================================
// SUPPLIES & COSTS
// ============================================

/**
 * Consumable supply used in propagation.
 */
export interface PropSupply {
  id?: string;

  // Identification
  name: string;
  category: SupplyCategory;

  // Purchase details
  purchaseDate: Date;
  supplier?: string;
  quantityPurchased: number;
  unit: string;                 // "ml", "L", "pcs", "kg", "g"
  totalCost: number;

  // Inventory
  quantityRemaining: number;
  lowStockThreshold?: number;

  // Computed (stored for query performance)
  costPerUnit: number;          // totalCost / quantityPurchased

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supply with inventory status computed.
 */
export interface PropSupplyWithStatus extends PropSupply {
  isLowStock: boolean;
  usageCount: number;           // Number of batches using this supply
}

/**
 * Form data for adding a supply.
 */
export type CreateSupplyInput = Omit<
  PropSupply,
  'id' | 'quantityRemaining' | 'costPerUnit' | 'createdAt' | 'updatedAt'
>;

/**
 * Cost allocation to a batch.
 */
export interface PropBatchCost {
  id?: string;
  batchId: string;

  // Supply-linked cost (option 1)
  supplyId?: string;
  quantityUsed?: number;
  calculatedCost?: number;      // quantityUsed * supply.costPerUnit

  // Manual cost entry (option 2)
  manualCost?: number;
  manualDescription?: string;

  createdAt: Date;
}

/**
 * Cost entry with supply details included.
 */
export interface PropBatchCostWithSupply extends PropBatchCost {
  supplyName?: string;
  supplyCategory?: SupplyCategory;
  supplyUnit?: string;
}

/**
 * Input for adding a cost to a batch.
 */
export type CreateBatchCostInput = Omit<
  PropBatchCost,
  'id' | 'calculatedCost' | 'createdAt'
>;

// ============================================
// SPECIES CONFIGURATION
// ============================================

/**
 * Default settings for a plant species.
 */
export interface PropSpeciesConfig {
  id?: string;

  // Identification
  species: string;              // Unique common name
  scientificName?: string;

  // Default propagation settings
  preferredMethod?: PropagationMethod;
  typicalRootingDays?: number;
  typicalDaysToReady?: number;  // From taken to ready

  // Overdue warning thresholds
  maxDaysRooting?: number;
  maxDaysPottedUp?: number;
  maxDaysHardening?: number;

  // Seasonality
  bestPropagationMonths?: number[]; // 1-12

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * Success rate analytics result.
 */
export interface SuccessRateAnalytics {
  totalStarted: number;
  totalGraduated: number;
  totalFailed: number;
  totalInProgress: number;
  successRate: number;          // graduated / (graduated + failed) * 100
  failureRate: number;
  survivalRate: number;         // (graduated + inProgress) / started * 100
}

/**
 * Cost analytics for a batch.
 */
export interface BatchCostSummary {
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  costPerGraduated: number;
  breakdown: {
    category: SupplyCategory | 'manual';
    amount: number;
    percentage: number;
  }[];
}

/**
 * Mother plant productivity metrics.
 */
export interface MotherPlantMetrics {
  totalBatches: number;
  totalPropagules: number;
  totalGraduated: number;
  successRate: number;
  averageSuccessRate: number;   // Across all batches
  bestMethod?: PropagationMethod;
  bestSeason?: string;
}

/**
 * Station occupancy snapshot.
 */
export interface StationOccupancy {
  stationId: string;
  stationName: string;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  batchCount: number;
  batches: Pick<PropBatch, 'id' | 'batchNumber' | 'species' | 'stage'>[];
}

// ============================================
// FILTER & SORT TYPES
// ============================================

/**
 * Batch list filters.
 */
export interface BatchFilters {
  stage: PropagationStage | 'all' | 'active'; // 'active' = not graduated/failed
  species: string | 'all';
  method: PropagationMethod | 'all';
  stationId: string | 'all';
  motherPlantId: string | 'all';
  siteId: string | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Batch list sorting.
 */
export interface BatchSort {
  field: 'dateTaken' | 'batchNumber' | 'species' | 'stage' | 'daysInStage' | 'quantitySurviving';
  direction: 'asc' | 'desc';
}
```

---

## 3. Dexie.js Database Schema

```typescript
// ============================================
// PROPAGATION MODULE - DATABASE SCHEMA
// File: src/lib/db/schema.ts (additions to existing)
// ============================================

import Dexie, { type Table } from 'dexie';

// Import existing types...
import type {
  PropMotherPlant,
  PropStation,
  PropStationLog,
  PropBatch,
  PropPropagule,
  PropStageTransition,
  PropGraduation,
  PropSupply,
  PropBatchCost,
  PropSpeciesConfig,
} from '@/modules/propagation/types';

// ============================================
// DATABASE CLASS EXTENSION
// ============================================

class PaddockDB extends Dexie {
  // ... existing tables ...

  // Propagation module tables
  propMotherPlants!: Table<PropMotherPlant>;
  propStations!: Table<PropStation>;
  propStationLogs!: Table<PropStationLog>;
  propBatches!: Table<PropBatch>;
  propPropagules!: Table<PropPropagule>;
  propStageTransitions!: Table<PropStageTransition>;
  propGraduations!: Table<PropGraduation>;
  propSupplies!: Table<PropSupply>;
  propBatchCosts!: Table<PropBatchCost>;
  propSpeciesConfigs!: Table<PropSpeciesConfig>;

  constructor() {
    super('Paddock');

    // ... existing versions ...

    // Version 8: Add propagation module tables
    this.version(8).stores({
      // Mother plants - indexed by site, species, status
      propMotherPlants: '++id, siteId, species, variety, status, [siteId+status], [siteId+species]',

      // Stations - indexed by site, type, active status
      propStations: '++id, siteId, name, type, isActive, [siteId+isActive]',

      // Station environmental logs - indexed by station and date
      propStationLogs: '++id, stationId, date, [stationId+date]',

      // Batches - heavily indexed for various query patterns
      propBatches: '++id, batchNumber, siteId, stationId, species, variety, stage, dateTaken, motherPlantId, isExploded, [siteId+stage], [stationId+stage], [species+stage], [motherPlantId+stage]',

      // Individual propagules - indexed by batch, site, stage
      propPropagules: '++id, batchId, propaguleNumber, siteId, stationId, species, stage, [batchId+stage], [siteId+stage]',

      // Stage transitions - audit log indexed by target and date
      propStageTransitions: '++id, batchId, propaguleId, toStage, transitionDate, [batchId+transitionDate], [propaguleId+transitionDate]',

      // Graduations - indexed by outcome and date for analytics
      propGraduations: '++id, batchId, propaguleId, outcome, graduationDate, [outcome+graduationDate], [batchId+outcome]',

      // Supplies inventory - indexed by category
      propSupplies: '++id, name, category, [category+name]',

      // Batch costs - indexed by batch and supply
      propBatchCosts: '++id, batchId, supplyId, [batchId+supplyId]',

      // Species configurations - unique by species name
      propSpeciesConfigs: '++id, &species',
    });
  }
}

export const db = new PaddockDB();

// ============================================
// CONVENIENCE EXPORTS FOR PROPAGATION MODULE
// ============================================

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

### Index Design Rationale

| Table | Index | Use Case |
|-------|-------|----------|
| `propBatches` | `[siteId+stage]` | Dashboard: batches by stage for current site |
| `propBatches` | `[stationId+stage]` | Station view: batches in specific station |
| `propBatches` | `[species+stage]` | Analytics: success rate by species |
| `propBatches` | `[motherPlantId+stage]` | Mother plant detail: batches from this plant |
| `propStageTransitions` | `[batchId+transitionDate]` | Batch history timeline |
| `propGraduations` | `[outcome+graduationDate]` | Analytics: outcomes over time |
| `propSpeciesConfigs` | `&species` | Unique constraint on species name |

---

## 4. Validation Rules

```typescript
// ============================================
// PROPAGATION MODULE - VALIDATION
// File: src/modules/propagation/utils/validation.ts
// ============================================

import { z } from 'zod';
import type {
  PropagationMethod,
  PropagationStage,
  GraduationOutcome,
  FailureReason,
  StationType,
  MotherPlantStatus,
  AcquisitionMethod,
  SupplyCategory,
  VALID_STAGE_TRANSITIONS,
} from '../types';

// ============================================
// PRIMITIVE VALIDATORS
// ============================================

/**
 * Positive integer (for quantities).
 */
export const positiveInt = z.number().int().positive();

/**
 * Non-negative integer (for remaining quantities).
 */
export const nonNegativeInt = z.number().int().min(0);

/**
 * Percentage value (0-100).
 */
export const percentage = z.number().min(0).max(100);

/**
 * Health/quality score (1-5).
 */
export const scoreOneToFive = z.number().int().min(1).max(5);

/**
 * Temperature in Celsius (reasonable range).
 */
export const temperatureCelsius = z.number().min(-20).max(60);

/**
 * Batch number format: YYYY-NNN
 */
export const batchNumberFormat = z.string().regex(
  /^\d{4}-\d{3}$/,
  'Batch number must be in format YYYY-NNN'
);

/**
 * Propagule number format: YYYY-NNN-NN
 */
export const propaguleNumberFormat = z.string().regex(
  /^\d{4}-\d{3}-\d{2}$/,
  'Propagule number must be in format YYYY-NNN-NN'
);

// ============================================
// ENUM VALIDATORS
// ============================================

export const propagationMethodSchema = z.enum([
  'cutting_softwood',
  'cutting_semi_hardwood',
  'cutting_hardwood',
  'cutting_leaf',
  'cutting_root',
  'division',
  'layering_simple',
  'layering_air',
  'grafting_whip',
  'grafting_cleft',
  'grafting_bud',
  'seed',
] as const);

export const propagationStageSchema = z.enum([
  'taken',
  'rooting',
  'rooted',
  'potted_up',
  'hardening',
  'ready',
  'graduated',
  'failed',
] as const);

export const graduationOutcomeSchema = z.enum([
  'personal_use',
  'planted_garden',
  'gifted',
  'sold',
  'composted',
] as const);

export const failureReasonSchema = z.enum([
  'rot',
  'dried_out',
  'disease',
  'pest',
  'no_roots',
  'transplant_shock',
  'environmental',
  'unknown',
] as const);

export const stationTypeSchema = z.enum([
  'heated_propagator',
  'unheated_propagator',
  'water_propagation',
  'outdoor_bed',
  'cold_frame',
  'greenhouse_bench',
  'mist_system',
  'other',
] as const);

export const motherPlantStatusSchema = z.enum([
  'active',
  'retired',
  'deceased',
] as const);

export const acquisitionMethodSchema = z.enum([
  'purchased',
  'propagated',
  'gifted',
  'wild_collected',
] as const);

export const supplyCategorySchema = z.enum([
  'rooting_hormone',
  'growing_medium',
  'containers',
  'labels',
  'tools',
  'heating',
  'misting',
  'other',
] as const);

// ============================================
// ENTITY SCHEMAS
// ============================================

/**
 * Mother Plant creation schema.
 */
export const createMotherPlantSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  species: z.string().min(1, 'Species is required').max(100),
  variety: z.string().max(100).optional(),
  scientificName: z.string().max(200).optional(),
  label: z.string().min(1, 'Label is required').max(100),
  location: z.string().max(200).optional(),
  acquisitionDate: z.date(),
  acquisitionMethod: acquisitionMethodSchema,
  acquisitionSource: z.string().max(200).optional(),
  acquisitionCost: z.number().positive().optional(),
  estimatedAge: positiveInt.optional(),
  healthScore: scoreOneToFive.optional(),
  healthNotes: z.string().max(1000).optional(),
  bestPropagationMethod: propagationMethodSchema.optional(),
  bestSeason: z.string().max(50).optional(),
  propagationNotes: z.string().max(2000).optional(),
  photoUrl: z.string().url().optional(),
});

/**
 * Station creation schema.
 */
export const createStationSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  name: z.string().min(1, 'Name is required').max(100),
  type: stationTypeSchema,
  description: z.string().max(500).optional(),
  capacity: positiveInt,
  isIndoor: z.boolean(),
  isActive: z.boolean().default(true),
  targetTempMin: temperatureCelsius.optional(),
  targetTempMax: temperatureCelsius.optional(),
  targetHumidityMin: percentage.optional(),
  targetHumidityMax: percentage.optional(),
}).refine(
  (data) => {
    if (data.targetTempMin !== undefined && data.targetTempMax !== undefined) {
      return data.targetTempMin <= data.targetTempMax;
    }
    return true;
  },
  { message: 'Min temperature must be less than or equal to max temperature' }
).refine(
  (data) => {
    if (data.targetHumidityMin !== undefined && data.targetHumidityMax !== undefined) {
      return data.targetHumidityMin <= data.targetHumidityMax;
    }
    return true;
  },
  { message: 'Min humidity must be less than or equal to max humidity' }
);

/**
 * Batch creation schema.
 */
export const createBatchSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  stationId: z.string().min(1, 'Station is required'),
  species: z.string().min(1, 'Species is required').max(100),
  variety: z.string().max(100).optional(),
  motherPlantId: z.string().optional(),
  method: propagationMethodSchema,
  quantityStarted: positiveInt,
  dateTaken: z.date(),
  preparationNotes: z.string().max(2000).optional(),
  rootingMedium: z.string().max(100).optional(),
  hormoneUsed: z.string().max(100).optional(),
  photoUrls: z.array(z.string().url()).default([]),
});

/**
 * Stage transition schema.
 */
export const stageTransitionSchema = z.object({
  batchId: z.string().optional(),
  propaguleId: z.string().optional(),
  toStage: propagationStageSchema,
  quantityAfter: nonNegativeInt.optional(),
  failureReason: failureReasonSchema.optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.batchId || data.propaguleId,
  { message: 'Either batchId or propaguleId must be provided' }
).refine(
  (data) => !(data.batchId && data.propaguleId),
  { message: 'Cannot specify both batchId and propaguleId' }
).refine(
  (data) => {
    if (data.toStage === 'failed' && !data.failureReason) {
      return false;
    }
    return true;
  },
  { message: 'Failure reason is required when marking as failed' }
);

/**
 * Graduation schema.
 */
export const graduationSchema = z.object({
  batchId: z.string().optional(),
  propaguleId: z.string().optional(),
  quantity: positiveInt,
  outcome: graduationOutcomeSchema,
  recipientName: z.string().max(200).optional(),
  recipientContact: z.string().max(200).optional(),
  plantedLocation: z.string().max(200).optional(),
  salePrice: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.batchId || data.propaguleId,
  { message: 'Either batchId or propaguleId must be provided' }
).refine(
  (data) => !(data.batchId && data.propaguleId),
  { message: 'Cannot specify both batchId and propaguleId' }
).refine(
  (data) => {
    if (data.outcome === 'gifted' && !data.recipientName) {
      return false;
    }
    return true;
  },
  { message: 'Recipient name is required for gifts' }
);

/**
 * Supply creation schema.
 */
export const createSupplySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: supplyCategorySchema,
  purchaseDate: z.date(),
  supplier: z.string().max(200).optional(),
  quantityPurchased: positiveInt,
  unit: z.string().min(1, 'Unit is required').max(20),
  totalCost: z.number().positive('Cost must be positive'),
  lowStockThreshold: positiveInt.optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Batch cost schema.
 */
export const batchCostSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  supplyId: z.string().optional(),
  quantityUsed: z.number().positive().optional(),
  manualCost: z.number().positive().optional(),
  manualDescription: z.string().max(200).optional(),
}).refine(
  (data) => {
    const hasSupply = data.supplyId && data.quantityUsed;
    const hasManual = data.manualCost;
    return (hasSupply && !hasManual) || (!hasSupply && hasManual);
  },
  { message: 'Provide either supply+quantity OR manual cost, not both' }
).refine(
  (data) => {
    if (data.manualCost && !data.manualDescription) {
      return false;
    }
    return true;
  },
  { message: 'Description required for manual costs' }
);

/**
 * Species configuration schema.
 */
export const speciesConfigSchema = z.object({
  species: z.string().min(1, 'Species is required').max(100),
  scientificName: z.string().max(200).optional(),
  preferredMethod: propagationMethodSchema.optional(),
  typicalRootingDays: positiveInt.optional(),
  typicalDaysToReady: positiveInt.optional(),
  maxDaysRooting: positiveInt.optional(),
  maxDaysPottedUp: positiveInt.optional(),
  maxDaysHardening: positiveInt.optional(),
  bestPropagationMonths: z.array(z.number().int().min(1).max(12)).optional(),
  notes: z.string().max(2000).optional(),
});

// ============================================
// BUSINESS RULE VALIDATORS
// ============================================

/**
 * Validate a stage transition is allowed.
 */
export function validateStageTransition(
  fromStage: PropagationStage | null,
  toStage: PropagationStage
): { valid: boolean; error?: string } {
  // Initial transition to 'taken'
  if (fromStage === null) {
    if (toStage !== 'taken') {
      return { valid: false, error: 'First stage must be "taken"' };
    }
    return { valid: true };
  }

  // Check valid transitions
  const validTargets = VALID_STAGE_TRANSITIONS[fromStage];
  if (!validTargets.includes(toStage)) {
    return {
      valid: false,
      error: `Cannot transition from "${fromStage}" to "${toStage}". Valid targets: ${validTargets.join(', ') || 'none (terminal state)'}`,
    };
  }

  return { valid: true };
}

/**
 * Validate batch quantity after transition.
 */
export function validateBatchQuantity(
  quantityBefore: number,
  quantityAfter: number
): { valid: boolean; error?: string } {
  if (quantityAfter > quantityBefore) {
    return {
      valid: false,
      error: 'Quantity cannot increase during transition',
    };
  }
  if (quantityAfter < 0) {
    return {
      valid: false,
      error: 'Quantity cannot be negative',
    };
  }
  return { valid: true };
}

/**
 * Validate graduation quantity.
 */
export function validateGraduationQuantity(
  batchSurviving: number,
  previouslyGraduated: number,
  graduatingNow: number
): { valid: boolean; error?: string } {
  const available = batchSurviving - previouslyGraduated;
  if (graduatingNow > available) {
    return {
      valid: false,
      error: `Cannot graduate ${graduatingNow}. Only ${available} available (${batchSurviving} surviving - ${previouslyGraduated} already graduated)`,
    };
  }
  return { valid: true };
}

/**
 * Validate supply usage doesn't exceed remaining.
 */
export function validateSupplyUsage(
  remaining: number,
  using: number
): { valid: boolean; error?: string; warning?: string } {
  if (using > remaining) {
    return {
      valid: false,
      error: `Cannot use ${using}. Only ${remaining} remaining in inventory`,
    };
  }
  const afterUsage = remaining - using;
  if (afterUsage < 0) {
    return {
      valid: false,
      error: 'Usage would result in negative inventory',
    };
  }
  return { valid: true };
}
```

---

## 5. State Machines

### Batch Lifecycle State Machine

```typescript
// ============================================
// PROPAGATION LIFECYCLE STATE MACHINE
// File: src/modules/propagation/utils/stateMachine.ts
// ============================================

import type { PropagationStage, FailureReason, PropBatch } from '../types';

/**
 * State machine configuration for batch lifecycle.
 * Compatible with XState or simple state management.
 */
export const batchStateMachine = {
  id: 'propagationBatch',
  initial: 'taken',

  states: {
    taken: {
      on: {
        ADVANCE: { target: 'rooting' },
        FAIL: { target: 'failed' },
      },
      meta: {
        description: 'Propagation material has been harvested and prepared',
        nextAction: 'Place in rooting medium',
        typicalDuration: 'Immediate',
      },
    },

    rooting: {
      on: {
        ADVANCE: { target: 'rooted' },
        FAIL: { target: 'failed' },
      },
      meta: {
        description: 'In propagation medium, waiting for root development',
        nextAction: 'Check for root formation',
        typicalDuration: '7-42 days depending on species',
      },
    },

    rooted: {
      on: {
        ADVANCE: { target: 'potted_up' },
        FAIL: { target: 'failed' },
      },
      meta: {
        description: 'Roots visible and developed sufficiently',
        nextAction: 'Pot up into individual containers',
        typicalDuration: '0-7 days',
      },
    },

    potted_up: {
      on: {
        ADVANCE: { target: 'hardening' },
        FAIL: { target: 'failed' },
      },
      meta: {
        description: 'Moved to individual container for growth',
        nextAction: 'Monitor establishment then begin hardening',
        typicalDuration: '14-30 days',
      },
    },

    hardening: {
      on: {
        ADVANCE: { target: 'ready' },
        FAIL: { target: 'failed' },
      },
      meta: {
        description: 'Acclimatizing to final growing conditions',
        nextAction: 'Gradually expose to outdoor/final conditions',
        typicalDuration: '7-14 days',
      },
    },

    ready: {
      on: {
        GRADUATE: { target: 'graduated' },
        FAIL: { target: 'failed' },
      },
      meta: {
        description: 'Ready for sale, planting, or distribution',
        nextAction: 'Sell, plant, or gift',
        typicalDuration: 'Until disposed',
      },
    },

    graduated: {
      type: 'final',
      meta: {
        description: 'All propagules have been disposed (sold, planted, gifted)',
        nextAction: 'None - complete',
      },
    },

    failed: {
      type: 'final',
      meta: {
        description: 'Propagation attempt did not succeed',
        nextAction: 'None - review and learn',
      },
    },
  },
};

/**
 * Get next valid stages from current stage.
 */
export function getNextStages(currentStage: PropagationStage): PropagationStage[] {
  const transitions: Record<PropagationStage, PropagationStage[]> = {
    taken: ['rooting', 'failed'],
    rooting: ['rooted', 'failed'],
    rooted: ['potted_up', 'failed'],
    potted_up: ['hardening', 'failed'],
    hardening: ['ready', 'failed'],
    ready: ['graduated', 'failed'],
    graduated: [],
    failed: [],
  };
  return transitions[currentStage];
}

/**
 * Get stage metadata for UI display.
 */
export function getStageMetadata(stage: PropagationStage): {
  label: string;
  description: string;
  icon: string;
  color: string;
} {
  const metadata: Record<PropagationStage, { label: string; description: string; icon: string; color: string }> = {
    taken: {
      label: 'Taken',
      description: 'Material harvested, awaiting placement',
      icon: 'scissors',
      color: 'slate',
    },
    rooting: {
      label: 'Rooting',
      description: 'In propagation medium',
      icon: 'sprout',
      color: 'amber',
    },
    rooted: {
      label: 'Rooted',
      description: 'Roots developed',
      icon: 'check',
      color: 'emerald',
    },
    potted_up: {
      label: 'Potted Up',
      description: 'In individual container',
      icon: 'pot',
      color: 'green',
    },
    hardening: {
      label: 'Hardening',
      description: 'Acclimatizing',
      icon: 'sun',
      color: 'yellow',
    },
    ready: {
      label: 'Ready',
      description: 'Available for use',
      icon: 'star',
      color: 'blue',
    },
    graduated: {
      label: 'Graduated',
      description: 'Complete',
      icon: 'trophy',
      color: 'violet',
    },
    failed: {
      label: 'Failed',
      description: 'Did not survive',
      icon: 'x',
      color: 'red',
    },
  };
  return metadata[stage];
}

/**
 * Determine if a batch is in a terminal state.
 */
export function isTerminalStage(stage: PropagationStage): boolean {
  return stage === 'graduated' || stage === 'failed';
}

/**
 * Determine if a batch is active (not terminal).
 */
export function isActiveStage(stage: PropagationStage): boolean {
  return !isTerminalStage(stage);
}

/**
 * Get stage order index for sorting.
 */
export function getStageOrder(stage: PropagationStage): number {
  const order: Record<PropagationStage, number> = {
    taken: 0,
    rooting: 1,
    rooted: 2,
    potted_up: 3,
    hardening: 4,
    ready: 5,
    graduated: 6,
    failed: 7,
  };
  return order[stage];
}

/**
 * Check if batch is overdue based on species config.
 */
export function isOverdue(
  batch: Pick<PropBatch, 'stage' | 'daysInStage'>,
  speciesConfig?: { maxDaysRooting?: number; maxDaysPottedUp?: number; maxDaysHardening?: number }
): boolean {
  if (!speciesConfig) return false;

  switch (batch.stage) {
    case 'rooting':
      return speciesConfig.maxDaysRooting !== undefined &&
             batch.daysInStage > speciesConfig.maxDaysRooting;
    case 'potted_up':
      return speciesConfig.maxDaysPottedUp !== undefined &&
             batch.daysInStage > speciesConfig.maxDaysPottedUp;
    case 'hardening':
      return speciesConfig.maxDaysHardening !== undefined &&
             batch.daysInStage > speciesConfig.maxDaysHardening;
    default:
      return false;
  }
}
```

---

## 6. Computed Fields & Business Logic

```typescript
// ============================================
// PROPAGATION MODULE - COMPUTED FIELDS
// File: src/modules/propagation/utils/computations.ts
// ============================================

import type {
  PropBatch,
  PropBatchWithComputed,
  PropPropagule,
  PropPropaguleWithComputed,
  PropMotherPlant,
  BatchCostSummary,
  SuccessRateAnalytics,
  MotherPlantMetrics,
  StationOccupancy,
  PropStation,
  PropBatchCost,
  PropSupply,
  PropGraduation,
} from '../types';
import { propDb } from '@/lib/db';

// ============================================
// BATCH COMPUTATIONS
// ============================================

/**
 * Calculate days since a date.
 */
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get the date when batch entered current stage.
 */
function getStageEntryDate(batch: PropBatch): Date {
  switch (batch.stage) {
    case 'taken':
      return batch.dateTaken;
    case 'rooting':
      return batch.dateTaken; // Typically same as taken
    case 'rooted':
      return batch.dateRooted || batch.dateTaken;
    case 'potted_up':
      return batch.datePottedUp || batch.dateRooted || batch.dateTaken;
    case 'hardening':
      return batch.dateHardeningStarted || batch.datePottedUp || batch.dateTaken;
    case 'ready':
      return batch.dateReady || batch.dateHardeningStarted || batch.dateTaken;
    case 'graduated':
    case 'failed':
      return batch.dateGraduated || batch.createdAt;
    default:
      return batch.dateTaken;
  }
}

/**
 * Enrich a batch with computed fields.
 */
export function enrichBatch(
  batch: PropBatch,
  costs: PropBatchCost[],
  supplies: PropSupply[],
  speciesConfig?: { maxDaysRooting?: number; maxDaysPottedUp?: number; maxDaysHardening?: number },
  motherPlant?: PropMotherPlant,
  station?: PropStation
): PropBatchWithComputed {
  const stageEntryDate = getStageEntryDate(batch);
  const daysInStage = daysSince(stageEntryDate);
  const daysSinceTaken = daysSince(batch.dateTaken);

  // Calculate survival rate
  const survivalRate = batch.quantityStarted > 0
    ? (batch.quantitySurviving / batch.quantityStarted) * 100
    : 0;

  // Calculate costs
  let totalCost = 0;
  for (const cost of costs) {
    if (cost.calculatedCost !== undefined) {
      totalCost += cost.calculatedCost;
    } else if (cost.manualCost !== undefined) {
      totalCost += cost.manualCost;
    } else if (cost.supplyId && cost.quantityUsed !== undefined) {
      const supply = supplies.find(s => s.id === cost.supplyId);
      if (supply) {
        totalCost += cost.quantityUsed * supply.costPerUnit;
      }
    }
  }

  const costPerStarted = batch.quantityStarted > 0
    ? totalCost / batch.quantityStarted
    : 0;
  const costPerSurviving = batch.quantitySurviving > 0
    ? totalCost / batch.quantitySurviving
    : 0;

  // Check if overdue
  let isOverdue = false;
  if (speciesConfig) {
    switch (batch.stage) {
      case 'rooting':
        isOverdue = speciesConfig.maxDaysRooting !== undefined &&
                    daysInStage > speciesConfig.maxDaysRooting;
        break;
      case 'potted_up':
        isOverdue = speciesConfig.maxDaysPottedUp !== undefined &&
                    daysInStage > speciesConfig.maxDaysPottedUp;
        break;
      case 'hardening':
        isOverdue = speciesConfig.maxDaysHardening !== undefined &&
                    daysInStage > speciesConfig.maxDaysHardening;
        break;
    }
  }

  return {
    ...batch,
    daysInStage,
    daysSinceTaken,
    survivalRate: Math.round(survivalRate * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerStarted: Math.round(costPerStarted * 100) / 100,
    costPerSurviving: Math.round(costPerSurviving * 100) / 100,
    isOverdue,
    motherPlantLabel: motherPlant?.label,
    stationName: station?.name,
  };
}

/**
 * Enrich a propagule with computed fields.
 */
export function enrichPropagule(
  propagule: PropPropagule,
  batch?: PropBatch,
  station?: PropStation
): PropPropaguleWithComputed {
  const daysSinceTaken = batch?.dateTaken
    ? daysSince(batch.dateTaken)
    : daysSince(propagule.createdAt);

  // Simple days in stage calculation for propagules
  const daysInStage = daysSince(propagule.updatedAt);

  return {
    ...propagule,
    daysInStage,
    daysSinceTaken,
    batchNumber: batch?.batchNumber,
    stationName: station?.name,
  };
}

// ============================================
// BATCH NUMBER GENERATION
// ============================================

/**
 * Generate next batch number for the current year.
 * Format: YYYY-NNN (e.g., 2026-042)
 */
export async function generateBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  // Find highest batch number this year
  const batches = await propDb.batches
    .where('batchNumber')
    .startsWith(prefix)
    .toArray();

  const maxNumber = batches.reduce((max, b) => {
    const numPart = b.batchNumber.split('-')[1];
    const num = parseInt(numPart, 10);
    return num > max ? num : max;
  }, 0);

  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${prefix}${nextNumber}`;
}

/**
 * Generate propagule number from batch.
 * Format: YYYY-NNN-XX (e.g., 2026-042-01)
 */
export async function generatePropaguleNumber(batchId: string): Promise<string> {
  const batch = await propDb.batches.get(batchId);
  if (!batch) throw new Error('Batch not found');

  // Find highest propagule number for this batch
  const propagules = await propDb.propagules
    .where('batchId')
    .equals(batchId)
    .toArray();

  const maxNumber = propagules.reduce((max, p) => {
    const parts = p.propaguleNumber.split('-');
    const num = parseInt(parts[2], 10);
    return num > max ? num : max;
  }, 0);

  const nextNumber = (maxNumber + 1).toString().padStart(2, '0');
  return `${batch.batchNumber}-${nextNumber}`;
}

// ============================================
// COST CALCULATIONS
// ============================================

/**
 * Calculate comprehensive cost summary for a batch.
 */
export async function calculateBatchCostSummary(batchId: string): Promise<BatchCostSummary> {
  const batch = await propDb.batches.get(batchId);
  if (!batch) throw new Error('Batch not found');

  const costs = await propDb.batchCosts.where('batchId').equals(batchId).toArray();
  const supplies = await propDb.supplies.toArray();
  const graduations = await propDb.graduations.where('batchId').equals(batchId).toArray();

  // Calculate total cost and breakdown by category
  let totalCost = 0;
  const categoryTotals: Record<string, number> = {};

  for (const cost of costs) {
    let amount = 0;
    let category = 'manual';

    if (cost.supplyId && cost.quantityUsed !== undefined) {
      const supply = supplies.find(s => s.id === cost.supplyId);
      if (supply) {
        amount = cost.calculatedCost ?? (cost.quantityUsed * supply.costPerUnit);
        category = supply.category;
      }
    } else if (cost.manualCost !== undefined) {
      amount = cost.manualCost;
      category = 'manual';
    }

    totalCost += amount;
    categoryTotals[category] = (categoryTotals[category] ?? 0) + amount;
  }

  // Calculate graduated count
  const graduatedCount = graduations
    .filter(g => g.outcome !== 'composted')
    .reduce((sum, g) => sum + g.quantity, 0);

  // Build breakdown
  const breakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
    category: category as any,
    amount: Math.round(amount * 100) / 100,
    percentage: totalCost > 0 ? Math.round((amount / totalCost) * 1000) / 10 : 0,
  }));

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerStarted: batch.quantityStarted > 0
      ? Math.round((totalCost / batch.quantityStarted) * 100) / 100
      : 0,
    costPerSurviving: batch.quantitySurviving > 0
      ? Math.round((totalCost / batch.quantitySurviving) * 100) / 100
      : 0,
    costPerGraduated: graduatedCount > 0
      ? Math.round((totalCost / graduatedCount) * 100) / 100
      : 0,
    breakdown,
  };
}

// ============================================
// ANALYTICS CALCULATIONS
// ============================================

/**
 * Calculate success rate analytics with filters.
 */
export async function calculateSuccessRate(filters: {
  species?: string;
  method?: string;
  motherPlantId?: string;
  stationId?: string;
  siteId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<SuccessRateAnalytics> {
  let batches = await propDb.batches.toArray();

  // Apply filters
  if (filters.species) {
    batches = batches.filter(b => b.species === filters.species);
  }
  if (filters.method) {
    batches = batches.filter(b => b.method === filters.method);
  }
  if (filters.motherPlantId) {
    batches = batches.filter(b => b.motherPlantId === filters.motherPlantId);
  }
  if (filters.stationId) {
    batches = batches.filter(b => b.stationId === filters.stationId);
  }
  if (filters.siteId) {
    batches = batches.filter(b => b.siteId === filters.siteId);
  }
  if (filters.dateFrom) {
    batches = batches.filter(b => b.dateTaken >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    batches = batches.filter(b => b.dateTaken <= filters.dateTo!);
  }

  // Aggregate counts
  let totalStarted = 0;
  let totalGraduated = 0;
  let totalFailed = 0;
  let totalInProgress = 0;

  for (const batch of batches) {
    totalStarted += batch.quantityStarted;

    if (batch.stage === 'failed') {
      totalFailed += batch.quantitySurviving;
    } else if (batch.stage === 'graduated') {
      // Get graduations for accurate counts
      const graduations = await propDb.graduations
        .where('batchId')
        .equals(batch.id!)
        .toArray();

      const graduated = graduations
        .filter(g => g.outcome !== 'composted')
        .reduce((sum, g) => sum + g.quantity, 0);
      const composted = graduations
        .filter(g => g.outcome === 'composted')
        .reduce((sum, g) => sum + g.quantity, 0);

      totalGraduated += graduated;
      totalFailed += composted + (batch.quantityStarted - batch.quantitySurviving);
    } else {
      // In progress
      totalInProgress += batch.quantitySurviving;
      totalFailed += batch.quantityStarted - batch.quantitySurviving;
    }
  }

  const completed = totalGraduated + totalFailed;

  return {
    totalStarted,
    totalGraduated,
    totalFailed,
    totalInProgress,
    successRate: completed > 0
      ? Math.round((totalGraduated / completed) * 1000) / 10
      : 0,
    failureRate: completed > 0
      ? Math.round((totalFailed / completed) * 1000) / 10
      : 0,
    survivalRate: totalStarted > 0
      ? Math.round(((totalGraduated + totalInProgress) / totalStarted) * 1000) / 10
      : 0,
  };
}

/**
 * Calculate mother plant productivity metrics.
 */
export async function calculateMotherPlantMetrics(motherPlantId: string): Promise<MotherPlantMetrics> {
  const batches = await propDb.batches
    .where('motherPlantId')
    .equals(motherPlantId)
    .toArray();

  if (batches.length === 0) {
    return {
      totalBatches: 0,
      totalPropagules: 0,
      totalGraduated: 0,
      successRate: 0,
      averageSuccessRate: 0,
    };
  }

  let totalPropagules = 0;
  let totalGraduated = 0;
  let totalFailed = 0;
  const methodCounts: Record<string, { graduated: number; total: number }> = {};
  const monthCounts: Record<number, { graduated: number; total: number }> = {};

  for (const batch of batches) {
    totalPropagules += batch.quantityStarted;

    const month = batch.dateTaken.getMonth() + 1;
    if (!monthCounts[month]) {
      monthCounts[month] = { graduated: 0, total: 0 };
    }
    monthCounts[month].total += batch.quantityStarted;

    if (!methodCounts[batch.method]) {
      methodCounts[batch.method] = { graduated: 0, total: 0 };
    }
    methodCounts[batch.method].total += batch.quantityStarted;

    if (batch.stage === 'graduated' || batch.stage === 'failed') {
      const graduations = await propDb.graduations
        .where('batchId')
        .equals(batch.id!)
        .toArray();

      const graduated = graduations
        .filter(g => g.outcome !== 'composted')
        .reduce((sum, g) => sum + g.quantity, 0);

      totalGraduated += graduated;
      methodCounts[batch.method].graduated += graduated;
      monthCounts[month].graduated += graduated;

      if (batch.stage === 'failed') {
        totalFailed += batch.quantitySurviving;
      }
    }
  }

  // Find best method
  let bestMethod: string | undefined;
  let bestMethodRate = 0;
  for (const [method, counts] of Object.entries(methodCounts)) {
    const rate = counts.total > 0 ? counts.graduated / counts.total : 0;
    if (rate > bestMethodRate) {
      bestMethodRate = rate;
      bestMethod = method;
    }
  }

  // Find best season
  let bestSeason: string | undefined;
  let bestSeasonRate = 0;
  for (const [month, counts] of Object.entries(monthCounts)) {
    const rate = counts.total > 0 ? counts.graduated / counts.total : 0;
    if (rate > bestSeasonRate) {
      bestSeasonRate = rate;
      bestSeason = getSeasonFromMonth(parseInt(month));
    }
  }

  const completed = totalGraduated + totalFailed;

  return {
    totalBatches: batches.length,
    totalPropagules,
    totalGraduated,
    successRate: completed > 0
      ? Math.round((totalGraduated / completed) * 1000) / 10
      : 0,
    averageSuccessRate: batches.length > 0
      ? Math.round((totalGraduated / totalPropagules) * 1000) / 10
      : 0,
    bestMethod: bestMethod as any,
    bestSeason,
  };
}

function getSeasonFromMonth(month: number): string {
  // Southern Hemisphere seasons
  if (month >= 12 || month <= 2) return 'summer';
  if (month >= 3 && month <= 5) return 'autumn';
  if (month >= 6 && month <= 8) return 'winter';
  return 'spring';
}

/**
 * Calculate station occupancy.
 */
export async function calculateStationOccupancy(stationId: string): Promise<StationOccupancy> {
  const station = await propDb.stations.get(stationId);
  if (!station) throw new Error('Station not found');

  // Get active batches in this station
  const batches = await propDb.batches
    .where('[stationId+stage]')
    .between(
      [stationId, 'hardening'],
      [stationId, 'taken'],
      true,
      true
    )
    .toArray();

  // Filter to only active stages
  const activeBatches = batches.filter(
    b => !['graduated', 'failed'].includes(b.stage)
  );

  const currentOccupancy = activeBatches.reduce(
    (sum, b) => sum + b.quantitySurviving,
    0
  );

  return {
    stationId,
    stationName: station.name,
    capacity: station.capacity,
    currentOccupancy,
    occupancyPercentage: station.capacity > 0
      ? Math.round((currentOccupancy / station.capacity) * 1000) / 10
      : 0,
    batchCount: activeBatches.length,
    batches: activeBatches.map(b => ({
      id: b.id!,
      batchNumber: b.batchNumber,
      species: b.species,
      stage: b.stage,
    })),
  };
}
```

---

## 7. Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PROPAGATION MODULE - ERD                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    GrowSite      │         │  PropStation     │         │ PropStationLog   │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ id (PK)          │←───────┐│ id (PK)          │←───────┐│ id (PK)          │
│ name             │        ││ siteId (FK)      │        ││ stationId (FK)   │
│ description      │        ││ name             │        ││ date             │
│ latitude         │        ││ type             │        ││ temperature      │
│ longitude        │        ││ capacity         │        ││ humidity         │
│ ...              │        ││ isActive         │        ││ notes            │
└──────────────────┘        ││ ...              │        │└──────────────────┘
        ▲                   │└──────────────────┘        │
        │                   │         ▲                  │
        │                   │         │                  │
        │                   │         │                  │
┌───────┴──────────┐        │         │                  │
│ PropMotherPlant  │        │         │                  │
├──────────────────┤        │         │                  │
│ id (PK)          │◄───┐   │         │                  │
│ siteId (FK)      │────┘   │         │                  │
│ species          │        │         │                  │
│ variety          │        │         │                  │
│ label            │        │         │                  │
│ status           │        │         │                  │
│ healthScore      │        │         │                  │
│ ...              │        │         │                  │
└──────────────────┘        │         │                  │
        │                   │         │                  │
        │                   │         │                  │
        ▼                   │         │                  │
┌──────────────────┐        │         │                  │
│    PropBatch     │────────┘         │                  │
├──────────────────┤                  │                  │
│ id (PK)          │◄─────────────────┤                  │
│ batchNumber      │                  │                  │
│ siteId (FK)      │                  │                  │
│ stationId (FK)   │──────────────────┘                  │
│ motherPlantId(FK)│                                     │
│ species          │                                     │
│ method           │                                     │
│ quantityStarted  │                                     │
│ quantitySurviving│                                     │
│ stage            │                                     │
│ isExploded       │                                     │
│ ...              │                                     │
└──────────────────┘                                     │
        │                                                │
        │ 1:N                                            │
        ▼                                                │
┌──────────────────┐                                     │
│  PropPropagule   │                                     │
├──────────────────┤                                     │
│ id (PK)          │                                     │
│ batchId (FK)     │                                     │
│ propaguleNumber  │                                     │
│ siteId (FK)      │                                     │
│ stationId (FK)   │─────────────────────────────────────┘
│ species          │
│ stage            │
│ label            │
│ healthScore      │
│ ...              │
└──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│PropStageTransition│        │  PropGraduation  │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ batchId (FK)?    │         │ batchId (FK)?    │
│ propaguleId (FK)?│         │ propaguleId (FK)?│
│ fromStage        │         │ quantity         │
│ toStage          │         │ outcome          │
│ transitionDate   │         │ recipientName    │
│ quantityBefore   │         │ salePrice        │
│ quantityAfter    │         │ graduationDate   │
│ failureReason    │         │ ...              │
│ ...              │         └──────────────────┘
└──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   PropSupply     │         │  PropBatchCost   │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │◄────────│ id (PK)          │
│ name             │         │ batchId (FK)     │
│ category         │         │ supplyId (FK)?   │
│ quantityPurchased│         │ quantityUsed     │
│ quantityRemaining│         │ calculatedCost   │
│ totalCost        │         │ manualCost       │
│ costPerUnit      │         │ manualDescription│
│ ...              │         │ ...              │
└──────────────────┘         └──────────────────┘

┌──────────────────┐
│PropSpeciesConfig │
├──────────────────┤
│ id (PK)          │
│ species (UNIQUE) │
│ preferredMethod  │
│ typicalRootingDays│
│ maxDaysRooting   │
│ bestPropagationMonths│
│ ...              │
└──────────────────┘

RELATIONSHIP SUMMARY:
─────────────────────
GrowSite          1 ──── N  PropMotherPlant
GrowSite          1 ──── N  PropStation
GrowSite          1 ──── N  PropBatch

PropStation       1 ──── N  PropBatch
PropStation       1 ──── N  PropPropagule (different from batch)
PropStation       1 ──── N  PropStationLog

PropMotherPlant   1 ──── N  PropBatch (optional relationship)

PropBatch         1 ──── N  PropPropagule
PropBatch         1 ──── N  PropStageTransition
PropBatch         1 ──── N  PropGraduation
PropBatch         1 ──── N  PropBatchCost

PropPropagule     1 ──── N  PropStageTransition
PropPropagule     1 ──── N  PropGraduation

PropSupply        1 ──── N  PropBatchCost
```

---

## 8. Invariants Checklist

### Batch Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| `quantitySurviving <= quantityStarted` | Validation | Application |
| `quantitySurviving >= 0` | Schema + Validation | Database + Application |
| `batchNumber` is unique | Unique index | Database |
| `batchNumber` format is `YYYY-NNN` | Validation | Application |
| Stage transitions follow state machine | Validation | Application |
| Failed stage requires `failureReason` | Validation | Application |
| Cannot modify terminal stages | Business logic | Application |
| Sum of graduations <= `quantitySurviving` | Validation | Application |
| Exploded batches cannot be un-exploded | Business logic | Application |

### Propagule Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| Must belong to a batch | Required field | Database |
| `propaguleNumber` format is `YYYY-NNN-XX` | Validation | Application |
| Stage can differ from parent batch after explosion | N/A | Design |
| Cannot exist without parent batch | Foreign key | Database |

### Mother Plant Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| `label` is required | Validation | Application |
| Only active plants can source new batches | Business logic | Application |
| Deceased/retired plants retain historical data | Soft state | Application |
| `healthScore` is 1-5 | Validation | Application |

### Station Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| `name` is required | Validation | Application |
| `capacity` > 0 | Validation | Application |
| Inactive stations cannot receive new batches | Business logic | Application |
| `targetTempMin <= targetTempMax` | Validation | Application |
| `targetHumidityMin <= targetHumidityMax` | Validation | Application |

### Supply Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| `quantityRemaining <= quantityPurchased` | Validation | Application |
| `quantityRemaining >= 0` | Validation | Application |
| `costPerUnit = totalCost / quantityPurchased` | Computed | Application |
| Usage cannot exceed remaining | Validation | Application |

### Cost Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| Either supply-linked OR manual (not both) | Validation | Application |
| Manual costs require description | Validation | Application |
| `calculatedCost = quantityUsed * supply.costPerUnit` | Computed | Application |

### Graduation Invariants

| Invariant | Enforcement | Layer |
|-----------|-------------|-------|
| Target is batch XOR propagule (not both) | Validation | Application |
| `quantity > 0` | Validation | Application |
| Gifts require `recipientName` | Validation | Application |
| Total graduated <= source's surviving count | Validation | Application |

---

## Implementation Notes

### Type-Level Safety

1. **Use branded types for IDs** to prevent mixing batch IDs with propagule IDs:
   ```typescript
   type BatchId = string & { readonly __brand: 'BatchId' };
   type PropaguleId = string & { readonly __brand: 'PropaguleId' };
   ```

2. **Use discriminated unions** for stage-dependent behavior - the type system prevents accessing fields that don't exist for a given stage.

3. **Computed fields in UI types** (`PropBatchWithComputed`) separate stored data from derived values.

### Database Considerations

1. **Soft indexes** on compound queries (`[siteId+stage]`) enable fast dashboard queries.

2. **Denormalized fields** (species on propagule) improve read performance at cost of write consistency.

3. **Stage transitions as audit log** provides complete history without mutating batch records.

4. **Version migration** from v7 to v8 adds all propagation tables atomically.

### API Design Implications

1. **Batch operations** should be the primary entry point - individual propagules are created from batches.

2. **Stage transitions** are separate from batch updates to maintain audit trail.

3. **Cost allocation** happens after batch creation, as costs accrue over lifecycle.

4. **Graduation** is a terminal operation that should trigger analytics recalculation.

---

*End of Domain Models Document*
