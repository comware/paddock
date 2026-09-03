/**
 * Paddock Database Schema
 *
 * Unified IndexedDB database for all Paddock modules.
 * Uses Dexie.js for clean Promise-based API and schema migrations.
 *
 * From PRD Section 4.2 and 4.5
 */

import Dexie, { type Table } from 'dexie';

import { copyTableRows } from './migrations';

// Import propagation types
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
// GROW MODULE TYPES
// ============================================

export interface GrowSite {
  id?: string;
  name: string;                    // "Home Greenhouse", "Farm Site A"
  description?: string;
  address?: string;                // Human-readable address
  latitude: number;                // Geolocation for weather API
  longitude: number;
  timezone: string;                // "Australia/Sydney"
  isDefault: boolean;              // First site created is default
  isIndoor: boolean;               // Indoor sites don't fetch weather
  weatherEnabled: boolean;         // Auto-fetch weather data
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowWeatherHistory {
  id?: string;
  siteId: string;                  // Foreign key to GrowSite
  date: Date;                      // Date of weather reading
  temperature: number;             // Celsius
  humidity: number;                // Percentage
  conditions: string;              // "Clear", "Cloudy", etc.
  source: 'api' | 'manual';        // Where data came from
  fetchedAt: Date;                 // When API data was fetched
  createdAt: Date;
}

export interface GrowTray {
  id?: string;
  siteId?: string;               // Foreign key to GrowSite (optional for migration)
  trayNumber: number;
  label?: string;                // Custom label (optional, defaults to "Tray #{trayNumber}")
  variety: string;
  dateSown: Date;
  seedWeight: number;           // grams
  growingMedium: string;
  preSoaked: boolean;
  blackoutDays: number;
  dateToLight?: Date;
  germinationRate?: number;     // percentage
  dateHarvested?: Date;
  harvestWeight?: number;       // grams
  qualityGrade?: 'A' | 'B' | 'C' | 'F';
  sellable?: boolean;
  problemsObserved: string;
  lessonsLearned: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowObservation {
  id?: string;
  siteId?: string;              // Foreign key to GrowSite (optional for migration)
  date: Date;                   // Multiple observations per site per day allowed
  week: number;                 // 1-6
  dayOfWeek: number;            // 1-7
  temperature?: number;         // Celsius
  humidity?: number;            // Percentage
  weatherSource?: 'manual' | 'api';  // Track data source
  weatherFetchedAt?: Date;      // When API data was fetched
  traysBlackout: number;
  traysLight: number;
  traysHarvestedToday: number;
  problemsSpotted: string;
  actionsTaken: string;
  moodEnergy: number;           // 1-10 scale
  keyLearning: string;
  tomorrowPriority: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Which enterprise a record belongs to.
 *
 * Not a separate books-per-enterprise model - Paddock is one farm with one set of books.
 * This exists on time entries alone, because hours are the one thing that cannot be
 * reconstructed after the fact. Costs come off receipts and a tray's yield is on the
 * tray, but "45 minutes harvesting on Tuesday" at a site running two enterprises is
 * ambiguous forever if it was not captured at the time.
 */
export type EnterpriseId = 'microgreens' | 'vegetables' | 'propagation';

export interface GrowTimeEntry {
  id?: string;
  siteId?: string;              // Foreign key to GrowSite (optional for migration)
  enterprise?: EnterpriseId;    // Absent on rows predating vegetables; see version 12
  date: Date;
  week: number;
  wateringChecking: number;     // minutes
  sowing: number;
  harvesting: number;
  packaging: number;
  cleanup: number;
  researchLearning: number;
  other: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowVarietyConfig {
  id?: string;
  name: string;
  seedCostPerKg: number;
  defaultBlackoutDays: number;
  preSoakRequired: boolean;
  typicalDaysToHarvest: number;
}

export interface GrowMediumConfig {
  id?: string;
  value: string;              // Internal identifier (e.g., 'coco_coir')
  label: string;              // Display name (e.g., 'Coco Coir')
  costRating: 'low' | 'medium' | 'high';
  bestFor: string;            // Brief description of ideal use
  notes?: string;             // Additional tips
}

export interface GrowTrayComment {
  id?: string;
  trayId: string;             // Foreign key to GrowTray
  content: string;            // Comment text
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowExperiment {
  id?: string;
  startDate: Date;
  targetTrays: number;
  targetSuccessRate: number;    // percentage
  targetHoursPerWeek: number;
}

export interface GrowDecision {
  id?: string;
  completedDate: Date;
  // Personal fit scores (1-10)
  enjoyedRoutine: number;
  satisfiedGrowing: number;
  comfortableFailures: number;
  maintainedConsistency: number;
  familySupportive: number;
  willingToScale: number;
  // Decision
  decision?: 'hell_yes' | 'extend' | 'pivot' | 'stop';
  // Reflections
  surprises: string;
  harderThanExpected: string;
  easierThanExpected: string;
  wouldDoDifferently: string;
  neededForConfidence: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowPlannedPlanting {
  id?: string;
  siteId?: string;              // Foreign key to GrowSite (optional)
  variety: string;              // Variety to plant
  plannedSowDate: Date;         // When to sow
  targetHarvestDate: Date;      // Expected harvest date
  quantity: number;             // Number of trays to plant
  notes?: string;               // Optional notes
  // 'proposed' is staged, not committed: written by an agent via WebMCP and awaiting
  // human approval. Approving moves it to 'planned'; rejecting moves it to 'cancelled'.
  status: 'proposed' | 'planned' | 'converted' | 'cancelled';
  convertedTrayId?: string;     // If converted to actual tray
  proposalId?: string;          // Groups plantings from one agent proposal
  proposalOption?: number;      // Which ranked option within that proposal (1 = top)
  proposedBy?: 'agent';         // Provenance; absent for human-created plantings
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// AI MODULE TYPES
// ============================================

export interface AIConversation {
  id?: string;
  title: string;                  // Auto-generated from first message or user-set
  model: string;                  // Model ID used for this conversation
  messageCount: number;           // Number of messages in conversation
  lastMessageAt: Date;            // When last message was sent
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id?: string;
  conversationId: string;         // Foreign key to AIConversation
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

// ============================================
// PLANNER MODULE TYPES
// ============================================

/**
 * Event types for the Planner calendar.
 * Covers both Grow (microgreens) and Propagation activities.
 */
export type PlannerEventType =
  // Grow Module Events
  | 'sow'              // Sowing new tray
  | 'blackout_end'     // Move tray to light
  | 'harvest'          // Harvest tray
  | 'water'            // Watering task
  | 'inspection'       // Quality check
  // Propagation Module Events
  | 'take_cuttings'    // Take new propagules
  | 'rooting_check'    // Check rooting progress
  | 'pot_up'           // Move to individual pots
  | 'harden_off'       // Begin hardening
  | 'graduation'       // Ready for sale/planting
  // General Events
  | 'maintenance'      // General upkeep
  | 'purchase'         // Buy supplies
  | 'other';           // Catch-all

/**
 * Status lifecycle for planner events.
 */
export type PlannerEventStatus =
  | 'scheduled'        // Future event
  | 'pending'          // Due today or overdue
  | 'completed'        // Done
  | 'cancelled'        // No longer needed
  | 'skipped';         // Deliberately skipped

/**
 * Core planner event entity.
 */
export interface PlannerEvent {
  id?: string;

  // Core Fields
  title: string;
  eventType: PlannerEventType;
  scheduledDate: Date;
  completedDate?: Date;
  status: PlannerEventStatus;

  // Optional Linking (at most one)
  speciesId?: string;
  trayId?: string;               // Link to GrowTray
  batchId?: string;              // Link to PropBatch

  // Location Context
  siteId: string;                // Required: FK to GrowSite
  stationId?: string;            // Optional: FK to PropStation

  // Additional Data
  notes?: string;

  // Auto-generation tracking
  isAutoGenerated: boolean;
  sourceType?: 'tray' | 'batch';
  sourceId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PLATFORM TYPES
// ============================================

export interface PlatformSetting {
  id?: string;
  key: string;
  value: unknown;
}

// ============================================
// DATABASE CLASS
// ============================================

class PaddockDB extends Dexie {
  // Grow module tables
  growTrays!: Table<GrowTray>;
  growObservations!: Table<GrowObservation>;
  growTimeEntries!: Table<GrowTimeEntry>;
  growVarietyConfigs!: Table<GrowVarietyConfig>;
  growMediumConfigs!: Table<GrowMediumConfig>;
  growTrayComments!: Table<GrowTrayComment>;
  growExperiments!: Table<GrowExperiment>;
  growDecisions!: Table<GrowDecision>;
  growPlannedPlantings!: Table<GrowPlannedPlanting>;

  // AI module tables
  aiConversations!: Table<AIConversation>;
  aiMessages!: Table<AIMessage>;

  // Platform tables
  platformSettings!: Table<PlatformSetting>;
  sites!: Table<GrowSite, string>;
  weatherHistory!: Table<GrowWeatherHistory, string>;
  growSites!: Table<GrowSite>;
  growWeatherHistory!: Table<GrowWeatherHistory>;

  // Planner module tables
  plannerEvents!: Table<PlannerEvent>;

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

    this.version(1).stores({
      // Grow module - indexed fields for queries
      growTrays: '++id, trayNumber, variety, dateSown, dateHarvested, createdAt',
      growObservations: '++id, &date, week',
      growTimeEntries: '++id, date, week',
      growVarietyConfigs: '++id, &name',
      growExperiments: '++id',
      growDecisions: '++id, completedDate',

      // Platform
      platformSettings: '++id, &key',
    });

    // Version 2: Add growing medium configs table
    this.version(2).stores({
      growMediumConfigs: '++id, &value',
    });

    // Version 3: Add tray comments table
    this.version(3).stores({
      growTrayComments: '++id, trayId, createdAt',
    });

    // Version 4: Add sites, weather history, and site associations
    this.version(4).stores({
      growSites: '++id, &name, isDefault',
      growWeatherHistory: '++id, siteId, date, [siteId+date]',
      // Update indexes for site filtering
      growTrays: '++id, trayNumber, variety, dateSown, dateHarvested, siteId, createdAt',
      growObservations: '++id, date, week, siteId, [siteId+date]',
    });

    // Version 5: Add siteId to time entries for site-centric architecture
    this.version(5).stores({
      growTimeEntries: '++id, date, week, siteId, [siteId+date]',
    });

    // Version 6: Add planned plantings table for planting calendar
    this.version(6).stores({
      growPlannedPlantings: '++id, siteId, variety, plannedSowDate, status, [siteId+plannedSowDate]',
    });

    // Version 7: Add AI conversations and messages tables
    this.version(7).stores({
      aiConversations: '++id, title, model, lastMessageAt, createdAt',
      aiMessages: '++id, conversationId, role, createdAt',
    });

    // Version 8: Add propagation module tables
    // Index design rationale:
    // - Compound indexes for common query patterns (e.g., dashboard: batches by stage for site)
    // - Single field indexes for filtering and sorting
    // - Unique constraint on species name for propSpeciesConfigs
    this.version(8).stores({
      // Mother plants - indexed by site, species, status for filtering
      propMotherPlants: '++id, siteId, species, variety, status, [siteId+status], [siteId+species]',

      // Stations - indexed by site, type, active status for filtering
      propStations: '++id, siteId, name, type, isActive, [siteId+isActive]',

      // Station environmental logs - indexed by station and date for time-series queries
      propStationLogs: '++id, stationId, date, [stationId+date]',

      // Batches - heavily indexed for various query patterns
      // [siteId+stage]: Dashboard view - batches by stage for current site
      // [stationId+stage]: Station view - batches in specific station
      // [species+stage]: Analytics - success rate by species
      // [motherPlantId+stage]: Mother plant detail - batches from this plant
      propBatches: '++id, batchNumber, siteId, stationId, species, variety, stage, dateTaken, motherPlantId, isExploded, [siteId+stage], [stationId+stage], [species+stage], [motherPlantId+stage]',

      // Individual propagules - indexed by batch, site, stage
      propPropagules: '++id, batchId, propaguleNumber, siteId, stationId, species, stage, [batchId+stage], [siteId+stage]',

      // Stage transitions - audit log indexed by target and date for history timeline
      propStageTransitions: '++id, batchId, propaguleId, toStage, transitionDate, [batchId+transitionDate], [propaguleId+transitionDate]',

      // Graduations - indexed by outcome and date for analytics
      propGraduations: '++id, batchId, propaguleId, outcome, graduationDate, [outcome+graduationDate], [batchId+outcome]',

      // Supplies inventory - indexed by category for filtering
      propSupplies: '++id, name, category, [category+name]',

      // Batch costs - indexed by batch and supply for cost calculation
      propBatchCosts: '++id, batchId, supplyId, [batchId+supplyId]',

      // Species configurations - unique by species name for lookup
      propSpeciesConfigs: '++id, &species',
    });

    // Version 9: Add planner module tables
    // Index design rationale:
    // - [siteId+scheduledDate]: Calendar queries by site and date range
    // - [siteId+status]: Dashboard: pending events per site
    // - [siteId+eventType]: Filter by type within site
    // - trayId, batchId: Quick lookup for linked entities
    this.version(9).stores({
      plannerEvents: '++id, siteId, scheduledDate, status, eventType, trayId, batchId, [siteId+scheduledDate], [siteId+status], [siteId+eventType]',
    });

    // Version 10: Index agent-proposed plantings (WebMCP)
    // Additive only - no migration of existing rows. Existing plantings keep their
    // status and simply have no proposalId/proposedBy.
    // [proposalId+status]: fetch one proposal set for approve/reject in a single query
    this.version(10).stores({
      growPlannedPlantings:
        '++id, siteId, variety, plannedSowDate, status, proposalId, [siteId+plannedSowDate], [proposalId+status]',
    });

    // Sites and weather belong to the platform, not to grow. Propagation and the planner
    // already store `siteId` reaching through the grow prefix for them.
    //
    // Dexie has no in-place rename, so this creates the new tables and copies rows over.
    // The originals are left in place and dropped in version 12, which keeps a release
    // where both exist - a bad copy is then recoverable rather than terminal.
    this.version(11)
      .stores({
        sites: '++id, &name, isDefault',
        weatherHistory: '++id, siteId, date, [siteId+date]',
      })
      .upgrade(async (tx) => {
        await copyTableRows(tx, 'growSites', 'sites');
        await copyTableRows(tx, 'growWeatherHistory', 'weatherHistory');
      });

    // The drop of growSites and growWeatherHistory is deliberately NOT here.
    //
    // Version 11 copies rows into the platform tables and leaves the originals in place.
    // Dropping them in the same release would mean every user goes 10 -> 12 in a single
    // transaction, with the sources removed the moment their replacement is written - and
    // IndexedDB has no downgrade path. Keeping both for one release means a copy that
    // succeeded but is subtly wrong is still recoverable.
    //
    // The drop lands as version 13 in the release AFTER this one has run against real
    // data. See docs/architecture/2026-09-03-enterprise-modules-design.md.

    // Backfill the enterprise tag while it can still be known.
    //
    // Every entry that exists at this point is microgreens time - it is the only
    // enterprise there is. Doing this before vegetables ships means "absent" afterwards
    // means "the grower did not say", rather than being indistinguishable from a
    // pre-vegetables row. No stores() clause: the field is not indexed, so this is a data
    // migration only.
    this.version(12).upgrade(async (tx) => {
      await tx.table('growTimeEntries').toCollection().modify((entry) => {
        entry.enterprise = 'microgreens';
      });
    });
  }
}

export const db = new PaddockDB();

// ============================================
// CONVENIENCE EXPORTS FOR MODULES
// ============================================

export const growDb = {
  // Deprecated aliases. Sites and weather belong to platformDb now; these remain so the
  // existing call sites keep working through the transition, and are removed in
  // sub-project 2 where the rename is already touching those imports.
  sites: db.sites,
  weatherHistory: db.weatherHistory,
  trays: db.growTrays,
  observations: db.growObservations,
  timeEntries: db.growTimeEntries,
  varietyConfigs: db.growVarietyConfigs,
  mediumConfigs: db.growMediumConfigs,
  trayComments: db.growTrayComments,
  experiments: db.growExperiments,
  decisions: db.growDecisions,
  plannedPlantings: db.growPlannedPlantings,
};

export const platformDb = {
  settings: db.platformSettings,
  sites: db.sites,
  weatherHistory: db.weatherHistory,
};

export const aiDb = {
  conversations: db.aiConversations,
  messages: db.aiMessages,
};

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

export const plannerDb = {
  events: db.plannerEvents,
};

// Re-export propagation types for convenience
export type {
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
