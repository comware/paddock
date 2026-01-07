/**
 * Paddock Database Schema
 *
 * Unified IndexedDB database for all Paddock modules.
 * Uses Dexie.js for clean Promise-based API and schema migrations.
 *
 * From PRD Section 4.2 and 4.5
 */

import Dexie, { type Table } from 'dexie';

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

export interface GrowTimeEntry {
  id?: string;
  siteId?: string;              // Foreign key to GrowSite (optional for migration)
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
  status: 'planned' | 'converted' | 'cancelled';
  convertedTrayId?: string;     // If converted to actual tray
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
  growSites!: Table<GrowSite>;
  growWeatherHistory!: Table<GrowWeatherHistory>;
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
  }
}

export const db = new PaddockDB();

// ============================================
// CONVENIENCE EXPORTS FOR MODULES
// ============================================

export const growDb = {
  sites: db.growSites,
  weatherHistory: db.growWeatherHistory,
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
};

export const aiDb = {
  conversations: db.aiConversations,
  messages: db.aiMessages,
};
