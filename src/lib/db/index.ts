/**
 * Paddock Database
 *
 * Main entry point for database access.
 * Exports the Dexie instance and all table references.
 */

export { db, growDb, platformDb, propDb, plannerDb } from './schema';
export type {
  GrowSite,
  GrowWeatherHistory,
  GrowTray,
  GrowObservation,
  GrowTimeEntry,
  EnterpriseId,
  GrowVarietyConfig,
  GrowMediumConfig,
  GrowTrayComment,
  GrowExperiment,
  GrowDecision,
  GrowPlannedPlanting,
  PlatformSetting,
  PlannerEvent,
  PlannerEventType,
  PlannerEventStatus,
} from './schema';

export { seedDatabase, resetSeedData } from './seed';
export { toKey, toId, withId } from './keys';
