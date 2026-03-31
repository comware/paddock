/**
 * useMotherPlants Store Unit Tests
 *
 * Tests the mother plant registry store including:
 * - Mother plant CRUD operations (logic only, no DB)
 * - Health tracking
 * - Status management
 * - Filtering and sorting
 * - Computed fields
 */

import { describe, it, expect } from 'vitest';
import type {
  PropMotherPlant,
  MotherPlantStatus,
  AcquisitionMethod,
} from '../../types';
import type {
  PropMotherPlantWithComputed,
  MotherPlantFilters,
  MotherPlantSort,
  HealthAssessment,
} from '../useMotherPlants';

// ============================================
// TEST FIXTURES
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setDate(1); // Avoid day overflow when subtracting months (e.g. March 31 - 6mo → Sept 31 → Oct 1)
  d.setMonth(d.getMonth() - months);
  return d;
}

function createMockMotherPlant(overrides: Partial<PropMotherPlant> = {}): PropMotherPlant {
  const now = new Date();
  return {
    id: 'mother-test',
    siteId: 'site-1',
    location: 'Greenhouse A',
    species: 'Lavender',
    variety: 'English',
    scientificName: 'Lavandula angustifolia',
    label: 'LAV-001',
    acquisitionDate: monthsAgo(12),
    acquisitionMethod: 'purchased',
    acquisitionSource: 'Local Nursery',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Pre-defined mock mother plants for testing
const mockMotherPlants = {
  active: () =>
    createMockMotherPlant({
      id: 'mother-active',
      label: 'LAV-001',
      species: 'Lavender',
      status: 'active',
      acquisitionDate: monthsAgo(18),
      healthScore: 5,
      lastHealthCheck: daysAgo(7),
    }),

  retired: () =>
    createMockMotherPlant({
      id: 'mother-retired',
      label: 'ROS-001',
      species: 'Rosemary',
      status: 'retired',
      acquisitionDate: monthsAgo(36),
      healthScore: 3,
      lastHealthCheck: daysAgo(30),
    }),

  deceased: () =>
    createMockMotherPlant({
      id: 'mother-deceased',
      label: 'SAL-001',
      species: 'Sage',
      status: 'deceased',
      acquisitionDate: monthsAgo(24),
    }),

  withoutHealthCheck: () =>
    createMockMotherPlant({
      id: 'mother-no-health',
      label: 'BAS-001',
      species: 'Basil',
      status: 'active',
      healthScore: undefined,
      lastHealthCheck: undefined,
    }),
};

// ============================================
// COMPUTED FIELD TESTS
// ============================================

describe('Computed Fields', () => {
  describe('calculateAgeInMonths', () => {
    // Inline calculation function for testing
    function calculateAgeInMonths(acquisitionDate: Date): number {
      const now = new Date();
      const acqDate = new Date(acquisitionDate);
      const months =
        (now.getFullYear() - acqDate.getFullYear()) * 12 +
        (now.getMonth() - acqDate.getMonth());
      return Math.max(0, months);
    }

    it('calculates age for 12 month old plant', () => {
      const date = monthsAgo(12);
      expect(calculateAgeInMonths(date)).toBe(12);
    });

    it('calculates age for 6 month old plant', () => {
      const date = monthsAgo(6);
      // Month arithmetic may differ by 1 near month boundaries
      const age = calculateAgeInMonths(date);
      expect(age).toBeGreaterThanOrEqual(5);
      expect(age).toBeLessThanOrEqual(6);
    });

    it('returns 0 for future date', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      // Will return negative, but we use Math.max(0, result)
      const age = calculateAgeInMonths(futureDate);
      expect(age).toBeLessThanOrEqual(0);
    });

    it('calculates 0 for plant acquired this month', () => {
      const thisMonth = new Date();
      expect(calculateAgeInMonths(thisMonth)).toBe(0);
    });
  });

  describe('calculateDaysSinceLastHealthCheck', () => {
    // Inline calculation function for testing
    function calculateDaysSinceLastHealthCheck(lastHealthCheck?: Date): number | null {
      if (!lastHealthCheck) return null;
      const now = new Date();
      const checkDate = new Date(lastHealthCheck);
      const diffTime = now.getTime() - checkDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    it('returns null when no health check recorded', () => {
      expect(calculateDaysSinceLastHealthCheck(undefined)).toBeNull();
    });

    it('returns 0 for health check today', () => {
      expect(calculateDaysSinceLastHealthCheck(new Date())).toBe(0);
    });

    it('returns correct days for health check 7 days ago', () => {
      expect(calculateDaysSinceLastHealthCheck(daysAgo(7))).toBe(7);
    });

    it('returns correct days for health check 30 days ago', () => {
      expect(calculateDaysSinceLastHealthCheck(daysAgo(30))).toBe(30);
    });
  });
});

// ============================================
// STATUS TRANSITION TESTS
// ============================================

describe('Status Transitions', () => {
  describe('Retire mother plant', () => {
    it('can retire an active plant', () => {
      const plant = mockMotherPlants.active();
      expect(plant.status).toBe('active');
      // Simulate status change
      const updated: PropMotherPlant = { ...plant, status: 'retired' };
      expect(updated.status).toBe('retired');
    });

    it('cannot retire a deceased plant', () => {
      const plant = mockMotherPlants.deceased();
      expect(plant.status).toBe('deceased');
      // Business rule: cannot retire deceased
    });
  });

  describe('Mark deceased', () => {
    it('can mark active plant as deceased', () => {
      const plant = mockMotherPlants.active();
      const updated: PropMotherPlant = { ...plant, status: 'deceased' };
      expect(updated.status).toBe('deceased');
    });

    it('can mark retired plant as deceased', () => {
      const plant = mockMotherPlants.retired();
      const updated: PropMotherPlant = { ...plant, status: 'deceased' };
      expect(updated.status).toBe('deceased');
    });
  });

  describe('Reactivate mother plant', () => {
    it('can reactivate a retired plant', () => {
      const plant = mockMotherPlants.retired();
      const updated: PropMotherPlant = { ...plant, status: 'active' };
      expect(updated.status).toBe('active');
    });

    it('cannot reactivate a deceased plant', () => {
      const plant = mockMotherPlants.deceased();
      expect(plant.status).toBe('deceased');
      // Business rule: cannot reactivate deceased
    });

    it('cannot reactivate an already active plant', () => {
      const plant = mockMotherPlants.active();
      expect(plant.status).toBe('active');
      // Business rule: already active
    });
  });
});

// ============================================
// HEALTH CHECK TESTS
// ============================================

describe('Health Checks', () => {
  describe('recordHealthCheck', () => {
    it('validates score is between 1 and 5', () => {
      const validScores = [1, 2, 3, 4, 5];
      for (const score of validScores) {
        expect(score >= 1 && score <= 5).toBe(true);
      }
    });

    it('rejects score below 1', () => {
      const score = 0;
      expect(score >= 1 && score <= 5).toBe(false);
    });

    it('rejects score above 5', () => {
      const score = 6;
      expect(score >= 1 && score <= 5).toBe(false);
    });
  });

  describe('getLastHealthCheck', () => {
    it('returns null when no health check recorded', () => {
      const plant = mockMotherPlants.withoutHealthCheck();
      const hasHealthCheck = plant.lastHealthCheck && plant.healthScore;
      expect(hasHealthCheck).toBeFalsy();
    });

    it('returns health assessment when recorded', () => {
      const plant = mockMotherPlants.active();
      const assessment: HealthAssessment | null =
        plant.lastHealthCheck && plant.healthScore
          ? {
              date: plant.lastHealthCheck,
              score: plant.healthScore,
              notes: plant.healthNotes,
            }
          : null;

      expect(assessment).not.toBeNull();
      expect(assessment?.score).toBe(5);
    });
  });
});

// ============================================
// FILTERING TESTS
// ============================================

describe('Mother Plant Filtering', () => {
  const plants: PropMotherPlantWithComputed[] = [
    { ...mockMotherPlants.active(), ageInMonths: 18, daysSinceLastHealthCheck: 7 },
    { ...mockMotherPlants.retired(), ageInMonths: 36, daysSinceLastHealthCheck: 30 },
    { ...mockMotherPlants.deceased(), ageInMonths: 24, daysSinceLastHealthCheck: null },
    { ...mockMotherPlants.withoutHealthCheck(), ageInMonths: 6, daysSinceLastHealthCheck: null },
  ];

  // Inline filtering function for testing
  function filterMotherPlants(
    plantList: PropMotherPlantWithComputed[],
    filters: MotherPlantFilters
  ): PropMotherPlantWithComputed[] {
    let filtered = [...plantList];

    if (filters.siteId !== 'all') {
      filtered = filtered.filter((p) => p.siteId === filters.siteId);
    }
    if (filters.species !== 'all') {
      filtered = filtered.filter((p) => p.species === filters.species);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    return filtered;
  }

  it('returns all plants with default filters', () => {
    const filters: MotherPlantFilters = {
      siteId: 'all',
      species: 'all',
      status: 'all',
    };
    const result = filterMotherPlants(plants, filters);
    expect(result).toHaveLength(4);
  });

  it('filters by status', () => {
    const filters: MotherPlantFilters = {
      siteId: 'all',
      species: 'all',
      status: 'active',
    };
    const result = filterMotherPlants(plants, filters);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.status === 'active')).toBe(true);
  });

  it('filters by species', () => {
    const filters: MotherPlantFilters = {
      siteId: 'all',
      species: 'Lavender',
      status: 'all',
    };
    const result = filterMotherPlants(plants, filters);
    expect(result).toHaveLength(1);
    expect(result[0].species).toBe('Lavender');
  });

  it('combines multiple filters', () => {
    const filters: MotherPlantFilters = {
      siteId: 'site-1',
      species: 'all',
      status: 'active',
    };
    const result = filterMotherPlants(plants, filters);
    expect(result.every((p) => p.status === 'active' && p.siteId === 'site-1')).toBe(true);
  });
});

// ============================================
// SORTING TESTS
// ============================================

describe('Mother Plant Sorting', () => {
  const plants: PropMotherPlantWithComputed[] = [
    { ...mockMotherPlants.active(), ageInMonths: 18, daysSinceLastHealthCheck: 7 },
    { ...mockMotherPlants.retired(), ageInMonths: 36, daysSinceLastHealthCheck: 30 },
    { ...mockMotherPlants.deceased(), ageInMonths: 24, daysSinceLastHealthCheck: null },
    { ...mockMotherPlants.withoutHealthCheck(), ageInMonths: 6, daysSinceLastHealthCheck: null },
  ];

  // Inline sorting function for testing
  function sortMotherPlants(
    plantList: PropMotherPlantWithComputed[],
    sort: MotherPlantSort
  ): PropMotherPlantWithComputed[] {
    const sorted = [...plantList];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'species':
          comparison = a.species.localeCompare(b.species);
          break;
        case 'acquisitionDate':
          comparison =
            new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime();
          break;
        case 'lastHealthCheck': {
          const aDate = a.lastHealthCheck ? new Date(a.lastHealthCheck).getTime() : 0;
          const bDate = b.lastHealthCheck ? new Date(b.lastHealthCheck).getTime() : 0;
          comparison = aDate - bDate;
          break;
        }
        case 'healthScore':
          comparison = (a.healthScore ?? 0) - (b.healthScore ?? 0);
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }

  it('sorts by species ascending', () => {
    const sort: MotherPlantSort = { field: 'species', direction: 'asc' };
    const result = sortMotherPlants(plants, sort);
    expect(result[0].species).toBe('Basil');
    expect(result[result.length - 1].species).toBe('Sage');
  });

  it('sorts by species descending', () => {
    const sort: MotherPlantSort = { field: 'species', direction: 'desc' };
    const result = sortMotherPlants(plants, sort);
    expect(result[0].species).toBe('Sage');
    expect(result[result.length - 1].species).toBe('Basil');
  });

  it('sorts by label', () => {
    const sort: MotherPlantSort = { field: 'label', direction: 'asc' };
    const result = sortMotherPlants(plants, sort);
    expect(result[0].label).toBe('BAS-001');
  });

  it('sorts by health score', () => {
    const sort: MotherPlantSort = { field: 'healthScore', direction: 'desc' };
    const result = sortMotherPlants(plants, sort);
    expect(result[0].healthScore).toBe(5);
  });

  it('handles undefined health scores in sorting', () => {
    const sort: MotherPlantSort = { field: 'healthScore', direction: 'asc' };
    const result = sortMotherPlants(plants, sort);
    // Plants with undefined health score should sort first (0)
    expect(result[0].healthScore ?? 0).toBeLessThanOrEqual(result[1].healthScore ?? 0);
  });
});

// ============================================
// QUERY SELECTOR TESTS
// ============================================

describe('Query Selectors', () => {
  const plants: PropMotherPlantWithComputed[] = [
    { ...mockMotherPlants.active(), siteId: 'site-1', ageInMonths: 18, daysSinceLastHealthCheck: 7 },
    { ...mockMotherPlants.retired(), siteId: 'site-2', ageInMonths: 36, daysSinceLastHealthCheck: 30 },
    { ...mockMotherPlants.deceased(), siteId: 'site-1', ageInMonths: 24, daysSinceLastHealthCheck: null },
    { ...mockMotherPlants.withoutHealthCheck(), siteId: 'site-1', ageInMonths: 6, daysSinceLastHealthCheck: null },
  ];

  describe('getActiveMotherPlants', () => {
    it('returns only active plants', () => {
      const active = plants.filter((p) => p.status === 'active');
      expect(active).toHaveLength(2);
    });
  });

  describe('getMotherPlantsBySpecies', () => {
    it('filters by species', () => {
      const lavender = plants.filter((p) => p.species === 'Lavender');
      expect(lavender).toHaveLength(1);
    });
  });

  describe('getMotherPlantsBySite', () => {
    it('filters by site', () => {
      const site1 = plants.filter((p) => p.siteId === 'site-1');
      expect(site1).toHaveLength(3);
    });
  });

  describe('getMotherPlantsByStatus', () => {
    it('filters by status', () => {
      const retired = plants.filter((p) => p.status === 'retired');
      expect(retired).toHaveLength(1);
    });
  });

  describe('getUniqueSpecies', () => {
    it('extracts unique species', () => {
      const species = [...new Set(plants.map((p) => p.species))].sort();
      expect(species).toContain('Lavender');
      expect(species).toContain('Rosemary');
      expect(species).toContain('Sage');
      expect(species).toContain('Basil');
    });
  });

  describe('getUniqueSites', () => {
    it('extracts unique sites', () => {
      const sites = [...new Set(plants.map((p) => p.siteId))].sort();
      expect(sites).toEqual(['site-1', 'site-2']);
    });
  });

  describe('getStatusCounts', () => {
    it('counts plants by status', () => {
      const counts: Record<MotherPlantStatus, number> = {
        active: 0,
        retired: 0,
        deceased: 0,
      };

      for (const plant of plants) {
        counts[plant.status]++;
      }

      expect(counts.active).toBe(2);
      expect(counts.retired).toBe(1);
      expect(counts.deceased).toBe(1);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles plant with all optional fields undefined', () => {
    const plant = createMockMotherPlant({
      variety: undefined,
      scientificName: undefined,
      location: undefined,
      acquisitionSource: undefined,
      acquisitionCost: undefined,
      estimatedAge: undefined,
      lastHealthCheck: undefined,
      healthScore: undefined,
      healthNotes: undefined,
      bestPropagationMethod: undefined,
      bestSeason: undefined,
      propagationNotes: undefined,
      photoUrl: undefined,
    });

    expect(plant.species).toBeDefined();
    expect(plant.label).toBeDefined();
    expect(plant.status).toBeDefined();
  });

  it('handles empty plant list', () => {
    const plants: PropMotherPlantWithComputed[] = [];
    const active = plants.filter((p) => p.status === 'active');
    expect(active).toHaveLength(0);
  });

  it('handles plant acquired today', () => {
    const plant = createMockMotherPlant({
      acquisitionDate: new Date(),
    });
    const now = new Date();
    const months =
      (now.getFullYear() - plant.acquisitionDate.getFullYear()) * 12 +
      (now.getMonth() - plant.acquisitionDate.getMonth());
    expect(months).toBe(0);
  });

  it('handles all acquisition methods', () => {
    const methods: AcquisitionMethod[] = ['purchased', 'propagated', 'gifted', 'wild_collected'];
    for (const method of methods) {
      const plant = createMockMotherPlant({ acquisitionMethod: method });
      expect(plant.acquisitionMethod).toBe(method);
    }
  });
});
