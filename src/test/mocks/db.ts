/**
 * Database Mocks for Testing
 *
 * Provides mock implementations and test fixtures for Dexie tables.
 * These are plain in-memory fixtures and fakes - they do not touch IndexedDB. For tests
 * that need real database behaviour, use the `db` instance directly; `src/test/setup.ts`
 * installs fake-indexeddb globally.
 */

import { vi } from 'vitest';
import type { GrowTray, GrowSite, GrowObservation } from '@/lib/db/schema';

// ============================================
// TEST FIXTURES
// ============================================

export function createMockSite(overrides: Partial<GrowSite> = {}): GrowSite {
  return {
    id: 'site-1',
    name: 'Test Greenhouse',
    description: 'Test site for unit tests',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    isDefault: true,
    isIndoor: true,
    weatherEnabled: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockTray(overrides: Partial<GrowTray> = {}): GrowTray {
  const now = new Date();
  return {
    id: `tray-${Math.random().toString(36).slice(2, 9)}`,
    siteId: 'site-1',
    trayNumber: 1,
    variety: 'Sunflower',
    dateSown: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    seedWeight: 50,
    growingMedium: 'Coco Coir',
    preSoaked: true,
    blackoutDays: 3,
    problemsObserved: '',
    lessonsLearned: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockObservation(overrides: Partial<GrowObservation> = {}): GrowObservation {
  const now = new Date();
  return {
    id: `obs-${Math.random().toString(36).slice(2, 9)}`,
    siteId: 'site-1',
    date: now,
    week: 1,
    dayOfWeek: now.getDay() || 7,
    traysBlackout: 2,
    traysLight: 3,
    traysHarvestedToday: 0,
    problemsSpotted: '',
    actionsTaken: '',
    moodEnergy: 7,
    keyLearning: '',
    tomorrowPriority: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create tray in specific lifecycle state
export const mockTrays = {
  blackout: () =>
    createMockTray({
      id: 'tray-blackout',
      trayNumber: 1,
      dateSown: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    }),

  light: () =>
    createMockTray({
      id: 'tray-light',
      trayNumber: 2,
      dateSown: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      dateToLight: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      germinationRate: 90,
    }),

  harvested: () =>
    createMockTray({
      id: 'tray-harvested',
      trayNumber: 3,
      dateSown: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      dateToLight: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
      dateHarvested: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      harvestWeight: 200,
      qualityGrade: 'A',
      sellable: true,
    }),

  failed: () =>
    createMockTray({
      id: 'tray-failed',
      trayNumber: 4,
      dateSown: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      qualityGrade: 'F',
      problemsObserved: 'Severe mold - failed batch',
      dateHarvested: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }),
};

// ============================================
// MOCK DATABASE HELPER
// ============================================

/**
 * Creates a mock growDb object for testing
 * Use this when you need to mock the entire database layer
 */
export function createMockGrowDb() {
  const trays: GrowTray[] = [];
  const sites: GrowSite[] = [];

  return {
    trays: {
      toArray: vi.fn(() => Promise.resolve([...trays])),
      add: vi.fn((tray: GrowTray) => {
        const id = `tray-${trays.length + 1}`;
        trays.push({ ...tray, id });
        return Promise.resolve(id);
      }),
      update: vi.fn((id: string, updates: Partial<GrowTray>) => {
        const index = trays.findIndex((t) => t.id === id);
        if (index !== -1) {
          trays[index] = { ...trays[index], ...updates };
        }
        return Promise.resolve();
      }),
      delete: vi.fn((id: string) => {
        const index = trays.findIndex((t) => t.id === id);
        if (index !== -1) {
          trays.splice(index, 1);
        }
        return Promise.resolve();
      }),
      get: vi.fn((id: string) => Promise.resolve(trays.find((t) => t.id === id))),
      _data: trays, // For test inspection
    },
    sites: {
      toArray: vi.fn(() => Promise.resolve([...sites])),
      add: vi.fn((site: GrowSite) => {
        const id = `site-${sites.length + 1}`;
        sites.push({ ...site, id });
        return Promise.resolve(id);
      }),
      get: vi.fn((id: string) => Promise.resolve(sites.find((s) => s.id === id))),
      _data: sites, // For test inspection
    },
  };
}

// ============================================
// DATE HELPERS FOR TESTS
// ============================================

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
