/**
 * Seed Data — Extended Variety Configurations
 *
 * Lettuce, legume, allium, herb, and specialty varieties.
 * Prices in AUD, based on typical Australian supplier rates (2024).
 */

import type { GrowVarietyConfig } from './schema';

export const extendedVarieties: Omit<GrowVarietyConfig, 'id'>[] = [
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
