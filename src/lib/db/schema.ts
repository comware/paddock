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

export interface GrowTray {
  id?: string;
  trayNumber: number;
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
  date: Date;                   // Unique per day
  week: number;                 // 1-6
  dayOfWeek: number;            // 1-7
  temperature?: number;         // Celsius
  humidity?: number;            // Percentage
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
  growExperiments!: Table<GrowExperiment>;
  growDecisions!: Table<GrowDecision>;

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
  }
}

export const db = new PaddockDB();

// ============================================
// CONVENIENCE EXPORTS FOR MODULES
// ============================================

export const growDb = {
  trays: db.growTrays,
  observations: db.growObservations,
  timeEntries: db.growTimeEntries,
  varietyConfigs: db.growVarietyConfigs,
  mediumConfigs: db.growMediumConfigs,
  experiments: db.growExperiments,
  decisions: db.growDecisions,
};

export const platformDb = {
  settings: db.platformSettings,
};
