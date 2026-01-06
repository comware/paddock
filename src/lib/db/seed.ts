/**
 * Database Seed Data
 *
 * Pre-populates variety configurations with defaults from PRD Section 9.1
 */

import { db, type GrowVarietyConfig } from './schema';

const defaultVarieties: Omit<GrowVarietyConfig, 'id'>[] = [
  {
    name: 'Sunflower',
    seedCostPerKg: 35,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Pea Shoots',
    seedCostPerKg: 30,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Radish',
    seedCostPerKg: 80,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Broccoli',
    seedCostPerKg: 200,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
];

/**
 * Seeds the database with default variety configurations.
 * Only runs if no varieties exist yet.
 */
export async function seedDatabase(): Promise<void> {
  const existingCount = await db.growVarietyConfigs.count();

  if (existingCount === 0) {
    console.log('[Paddock] Seeding default variety configurations...');
    await db.growVarietyConfigs.bulkAdd(defaultVarieties);
    console.log('[Paddock] Seeded', defaultVarieties.length, 'varieties');
  }
}

/**
 * Resets all seed data (for development/testing)
 */
export async function resetSeedData(): Promise<void> {
  await db.growVarietyConfigs.clear();
  await seedDatabase();
}
