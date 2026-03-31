/**
 * Seed Data — Microgreen Variety Configurations
 *
 * Pre-populates variety configurations for the Grow module.
 * Prices in AUD, based on typical Australian supplier rates (2024).
 *
 * Split into core (beginner through brassica) and extended
 * (lettuce, legume, allium, herb, specialty) arrays for maintainability.
 */

import type { GrowVarietyConfig } from './schema';
import { extendedVarieties } from './seed-varieties-extended';

type VarietyEntry = Omit<GrowVarietyConfig, 'id'>;

const coreVarieties: VarietyEntry[] = [
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

];

export const defaultVarieties: VarietyEntry[] = [
  ...coreVarieties,
  ...extendedVarieties,
];
