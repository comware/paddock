/**
 * Database Seed Data — Orchestrator
 *
 * Pre-populates variety and growing medium configurations.
 * Data arrays are split into separate modules for maintainability.
 */

import { db } from './schema';
import { defaultVarieties } from './seed-varieties';
import { defaultMediums } from './seed-mediums';

/**
 * Seeds the database with default configurations.
 * Only runs if tables are empty.
 */
export async function seedDatabase(): Promise<void> {
  // Seed varieties
  const varietyCount = await db.growVarietyConfigs.count();
  if (varietyCount === 0) {
    if (import.meta.env.DEV) console.log('[Paddock] Seeding default variety configurations...');
    await db.growVarietyConfigs.bulkAdd(defaultVarieties);
    if (import.meta.env.DEV) console.log('[Paddock] Seeded', defaultVarieties.length, 'varieties');
  }

  // Seed growing mediums
  const mediumCount = await db.growMediumConfigs.count();
  if (mediumCount === 0) {
    if (import.meta.env.DEV) console.log('[Paddock] Seeding default growing medium configurations...');
    await db.growMediumConfigs.bulkAdd(defaultMediums);
    if (import.meta.env.DEV) console.log('[Paddock] Seeded', defaultMediums.length, 'growing mediums');
  }
}

/**
 * Resets all seed data (for development/testing)
 */
export async function resetSeedData(): Promise<void> {
  await db.growVarietyConfigs.clear();
  await db.growMediumConfigs.clear();
  await seedDatabase();
}
