/**
 * Database Seed Data
 *
 * Pre-populates variety and growing medium configurations.
 * Prices in AUD, based on typical Australian supplier rates (2024).
 */

import { db, type GrowVarietyConfig, type GrowMediumConfig } from './schema';

const defaultVarieties: Omit<GrowVarietyConfig, 'id'>[] = [
  // ============================================
  // BEGINNER-FRIENDLY VARIETIES
  // High germination, fast growth, forgiving
  // ============================================
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
    name: 'Radish (China Rose)',
    seedCostPerKg: 80,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Radish (Daikon)',
    seedCostPerKg: 70,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Buckwheat',
    seedCostPerKg: 25,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Wheatgrass',
    seedCostPerKg: 20,
    defaultBlackoutDays: 3,
    preSoakRequired: true,
    typicalDaysToHarvest: 9,
  },

  // ============================================
  // INTERMEDIATE VARIETIES
  // Brassicas and leafy greens - reliable but need attention
  // ============================================
  {
    name: 'Broccoli',
    seedCostPerKg: 180,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Kale',
    seedCostPerKg: 200,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Red Cabbage',
    seedCostPerKg: 150,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Kohlrabi',
    seedCostPerKg: 180,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Arugula',
    seedCostPerKg: 120,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 9,
  },
  {
    name: 'Mustard (Yellow)',
    seedCostPerKg: 60,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Mustard (Red)',
    seedCostPerKg: 80,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 9,
  },
  {
    name: 'Cress',
    seedCostPerKg: 100,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },

  // ============================================
  // ADVANCED VARIETIES
  // Slower growth, temperature sensitive, or mucilaginous
  // ============================================
  {
    name: 'Basil',
    seedCostPerKg: 300,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 16,
  },
  {
    name: 'Cilantro',
    seedCostPerKg: 40,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Fennel',
    seedCostPerKg: 100,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Dill',
    seedCostPerKg: 90,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Amaranth (Red)',
    seedCostPerKg: 250,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Beet',
    seedCostPerKg: 60,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Chard (Rainbow)',
    seedCostPerKg: 80,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Celery',
    seedCostPerKg: 350,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Leek',
    seedCostPerKg: 200,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 16,
  },
  {
    name: 'Onion',
    seedCostPerKg: 180,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 16,
  },
  {
    name: 'Sorrel',
    seedCostPerKg: 220,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 12,
  },

  // ============================================
  // BRASSICA FAMILY - ADDITIONAL VARIETIES
  // Fast growing, nutritious, reliable
  // ============================================
  {
    name: 'Brussels Sprout',
    seedCostPerKg: 180,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Cauliflower',
    seedCostPerKg: 160,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Collard Greens',
    seedCostPerKg: 120,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Pak Choi',
    seedCostPerKg: 100,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Tatsoi',
    seedCostPerKg: 120,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Turnip',
    seedCostPerKg: 80,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Mizuna',
    seedCostPerKg: 100,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Mibuna',
    seedCostPerKg: 110,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Komatsuna',
    seedCostPerKg: 100,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Radish (Sango Purple)',
    seedCostPerKg: 90,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Mustard (Osaka Purple)',
    seedCostPerKg: 90,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 9,
  },
  {
    name: 'Mustard (Southern Giant)',
    seedCostPerKg: 70,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Mustard (Crimson Tide)',
    seedCostPerKg: 100,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 9,
  },

  // ============================================
  // LETTUCE FAMILY
  // Mild flavor, popular for salads
  // ============================================
  {
    name: 'Lettuce (Romaine)',
    seedCostPerKg: 150,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Lettuce (Butterhead)',
    seedCostPerKg: 150,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Lettuce (Red Oakleaf)',
    seedCostPerKg: 160,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Lettuce (Lollo Rossa)',
    seedCostPerKg: 160,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Endive',
    seedCostPerKg: 140,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 12,
  },

  // ============================================
  // LEGUME FAMILY
  // High yield, protein-rich, affordable
  // ============================================
  {
    name: 'Fenugreek',
    seedCostPerKg: 30,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Lentil (Red)',
    seedCostPerKg: 25,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Lentil (Green)',
    seedCostPerKg: 25,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Mung Bean',
    seedCostPerKg: 20,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Chickpea',
    seedCostPerKg: 25,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Clover (Red)',
    seedCostPerKg: 80,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Clover (Crimson)',
    seedCostPerKg: 85,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Alfalfa',
    seedCostPerKg: 60,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 8,
  },

  // ============================================
  // ALLIUM FAMILY
  // Slow growing, aromatic, delicate
  // ============================================
  {
    name: 'Chive',
    seedCostPerKg: 250,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Garlic Chive',
    seedCostPerKg: 280,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Scallion',
    seedCostPerKg: 200,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 16,
  },

  // ============================================
  // HERB FAMILY - ADDITIONAL VARIETIES
  // Slow growing, aromatic, flavorful
  // ============================================
  {
    name: 'Basil (Thai)',
    seedCostPerKg: 320,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Basil (Lemon)',
    seedCostPerKg: 340,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Basil (Purple)',
    seedCostPerKg: 350,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 20,
  },
  {
    name: 'Parsley (Flat Leaf)',
    seedCostPerKg: 180,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Parsley (Curly)',
    seedCostPerKg: 180,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Chervil',
    seedCostPerKg: 200,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 16,
  },
  {
    name: 'Lemon Balm',
    seedCostPerKg: 280,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Oregano',
    seedCostPerKg: 400,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 20,
  },
  {
    name: 'Thyme',
    seedCostPerKg: 450,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 21,
  },
  {
    name: 'Sage',
    seedCostPerKg: 380,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 20,
  },

  // ============================================
  // SPECIALTY & UNIQUE VARIETIES
  // Unusual, colorful, or niche market
  // ============================================
  {
    name: 'Corn Shoots',
    seedCostPerKg: 15,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Popcorn Shoots',
    seedCostPerKg: 15,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 8,
  },
  {
    name: 'Chia',
    seedCostPerKg: 120,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Borage',
    seedCostPerKg: 200,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Nasturtium',
    seedCostPerKg: 180,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Carrot',
    seedCostPerKg: 150,
    defaultBlackoutDays: 5,
    preSoakRequired: false,
    typicalDaysToHarvest: 18,
  },
  {
    name: 'Shiso (Perilla)',
    seedCostPerKg: 300,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Amaranth (Green)',
    seedCostPerKg: 240,
    defaultBlackoutDays: 3,
    preSoakRequired: false,
    typicalDaysToHarvest: 10,
  },
  {
    name: 'Spinach',
    seedCostPerKg: 100,
    defaultBlackoutDays: 4,
    preSoakRequired: true,
    typicalDaysToHarvest: 12,
  },
  {
    name: 'Purslane',
    seedCostPerKg: 180,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Anise',
    seedCostPerKg: 120,
    defaultBlackoutDays: 4,
    preSoakRequired: false,
    typicalDaysToHarvest: 14,
  },
  {
    name: 'Coriander (Slow Bolt)',
    seedCostPerKg: 45,
    defaultBlackoutDays: 5,
    preSoakRequired: true,
    typicalDaysToHarvest: 18,
  },
];

// ============================================
// GROWING MEDIUMS
// ============================================

const defaultMediums: Omit<GrowMediumConfig, 'id'>[] = [
  {
    value: 'coco_coir',
    label: 'Coco Coir',
    costRating: 'low',
    bestFor: 'Most varieties, good moisture retention',
    notes: 'Sustainable, reusable if sterilized. Standard choice for beginners.',
  },
  {
    value: 'hemp_mat',
    label: 'Hemp Mat',
    costRating: 'medium',
    bestFor: 'Clean harvest, restaurant supply',
    notes: 'No mess at harvest, roots lift cleanly. Slightly lower yields.',
  },
  {
    value: 'biostrate',
    label: 'Biostrate',
    costRating: 'medium',
    bestFor: 'Brassicas, professional growers',
    notes: 'Felt-like mat, excellent root hold. Industry standard for commercial.',
  },
  {
    value: 'soil',
    label: 'Soil (Potting Mix)',
    costRating: 'low',
    bestFor: 'Sunflower, pea shoots, wheatgrass',
    notes: 'Traditional method, heavier yields. Messier harvest.',
  },
  {
    value: 'vermiculite',
    label: 'Vermiculite',
    costRating: 'low',
    bestFor: 'Even moisture distribution',
    notes: 'Often mixed with coco coir. Good for mucilaginous seeds.',
  },
  {
    value: 'jute_mat',
    label: 'Jute Mat',
    costRating: 'low',
    bestFor: 'Budget-conscious, biodegradable',
    notes: 'Natural fiber, fully compostable. Good drainage.',
  },
  {
    value: 'paper_towel',
    label: 'Paper Towel',
    costRating: 'low',
    bestFor: 'Experiments, germination tests',
    notes: 'Testing only - not for production. Dries out quickly.',
  },
];

/**
 * Seeds the database with default configurations.
 * Only runs if tables are empty.
 */
export async function seedDatabase(): Promise<void> {
  // Seed varieties
  const varietyCount = await db.growVarietyConfigs.count();
  if (varietyCount === 0) {
    console.log('[Paddock] Seeding default variety configurations...');
    await db.growVarietyConfigs.bulkAdd(defaultVarieties);
    console.log('[Paddock] Seeded', defaultVarieties.length, 'varieties');
  }

  // Seed growing mediums
  const mediumCount = await db.growMediumConfigs.count();
  if (mediumCount === 0) {
    console.log('[Paddock] Seeding default growing medium configurations...');
    await db.growMediumConfigs.bulkAdd(defaultMediums);
    console.log('[Paddock] Seeded', defaultMediums.length, 'growing mediums');
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
