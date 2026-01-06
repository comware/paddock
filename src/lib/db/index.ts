/**
 * Paddock Database
 *
 * Main entry point for database access.
 * Exports the Dexie instance and all table references.
 */

export { db, growDb, platformDb } from './schema';
export type {
  GrowTray,
  GrowObservation,
  GrowTimeEntry,
  GrowVarietyConfig,
  GrowMediumConfig,
  GrowExperiment,
  GrowDecision,
  PlatformSetting,
} from './schema';

export { seedDatabase, resetSeedData } from './seed';
