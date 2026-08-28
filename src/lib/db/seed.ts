/**
 * Database Seed Data — Orchestrator
 *
 * Pre-populates variety and growing medium configurations.
 * Data arrays are split into separate modules for maintainability.
 */

import { db } from './schema';
import { defaultVarieties } from './seed-varieties';
import { defaultMediums } from './seed-mediums';
import { seedDemoHistory } from './seed-demo-history';

/**
 * In-flight seed, shared by concurrent callers.
 *
 * React StrictMode invokes effects twice in development, so seedDatabase ran twice
 * concurrently. Both calls saw an empty table, both wrote, and the second failed the
 * unique index on variety name - surfacing as
 * "growVarietyConfigs.bulkAdd(): 76 of 76 operations failed" in the error tracker on
 * every fresh install.
 *
 * Checking a count and then writing is not atomic; sharing the promise makes the second
 * caller await the first rather than race it.
 */
let seeding: Promise<void> | null = null;

/**
 * Seeds the database with default configurations.
 * Only runs if tables are empty. Safe to call concurrently.
 */
export async function seedDatabase(): Promise<void> {
  if (!seeding) {
    seeding = runSeed().finally(() => {
      seeding = null;
    });
  }
  return seeding;
}

async function runSeed(): Promise<void> {
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

  // Demo growing history - opt-in only.
  //
  // Gated behind an explicit env flag rather than DEV, because the demo deployment is a
  // production build. A real grower running their own Paddock must never find invented
  // trays in their database, so the default is off everywhere.
  if (import.meta.env.VITE_DEMO_SEED === 'true') {
    const count = await seedDemoHistory();
    if (count > 0 && import.meta.env.DEV) {
      console.log('[Paddock] Seeded', count, 'demo trays');
    }
  }
}

/**
 * Resets all seed data (for development/testing)
 */
export async function resetSeedData(): Promise<void> {
  seeding = null;
  await db.growVarietyConfigs.clear();
  await db.growMediumConfigs.clear();
  await seedDatabase();
}
