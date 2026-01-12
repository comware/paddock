/**
 * Paddock Database
 *
 * Main entry point for database access.
 * Exports the Dexie instance and all table references.
 */

export { db, growDb, platformDb, propDb } from './schema';
export type {
  GrowSite,
  GrowWeatherHistory,
  GrowTray,
  GrowObservation,
  GrowTimeEntry,
  GrowVarietyConfig,
  GrowMediumConfig,
  GrowTrayComment,
  GrowExperiment,
  GrowDecision,
  GrowPlannedPlanting,
  PlatformSetting,
} from './schema';

export { seedDatabase, resetSeedData } from './seed';
