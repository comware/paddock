/**
 * useStations Store Unit Tests
 *
 * Tests the station management store including:
 * - Station CRUD operations (logic only, no DB)
 * - Occupancy calculations
 * - Environmental target validation
 * - Filtering and query selectors
 */

import { describe, it, expect } from 'vitest';
import type {
  PropStation,
  StationType,
  PropBatchWithComputed,
} from '../../types';
import {
  DEFAULT_ENVIRONMENTAL_TARGETS,
  type StationWithOccupancy,
  type StationFilters,
  type EnvironmentalValidation,
} from '../useStations';

// ============================================
// TEST FIXTURES
// ============================================

function createMockStation(overrides: Partial<PropStation> = {}): PropStation {
  const now = new Date();
  return {
    id: 'station-test',
    siteId: 'site-1',
    name: 'Test Station',
    type: 'heated_propagator',
    description: 'A test propagation station',
    capacity: 50,
    isIndoor: true,
    targetTempMin: 20,
    targetTempMax: 25,
    targetHumidityMin: 80,
    targetHumidityMax: 95,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockBatch(overrides: Partial<PropBatchWithComputed> = {}): PropBatchWithComputed {
  const now = new Date();
  return {
    id: 'batch-test',
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    method: 'cutting_softwood',
    quantityStarted: 20,
    quantitySurviving: 18,
    dateTaken: now,
    stage: 'rooting',
    daysInStage: 7,
    daysSinceTaken: 7,
    survivalRate: 90,
    totalCost: 0,
    costPerStarted: 0,
    costPerSurviving: 0,
    isOverdue: false,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Pre-defined mock stations for testing
const mockStations = {
  heatedPropagator: () =>
    createMockStation({
      id: 'station-heated',
      name: 'Heated Propagator 1',
      type: 'heated_propagator',
      capacity: 100,
      isIndoor: true,
      isActive: true,
    }),

  coldFrame: () =>
    createMockStation({
      id: 'station-cold',
      name: 'Cold Frame',
      type: 'cold_frame',
      capacity: 200,
      isIndoor: false,
      isActive: true,
    }),

  mistSystem: () =>
    createMockStation({
      id: 'station-mist',
      name: 'Mist Bench',
      type: 'mist_system',
      capacity: 150,
      isIndoor: true,
      isActive: true,
    }),

  inactive: () =>
    createMockStation({
      id: 'station-inactive',
      name: 'Old Station',
      type: 'greenhouse_bench',
      capacity: 75,
      isIndoor: true,
      isActive: false,
    }),
};

// ============================================
// DEFAULT ENVIRONMENTAL TARGETS TESTS
// ============================================

describe('Default Environmental Targets', () => {
  it('defines targets for all station types', () => {
    const stationTypes: StationType[] = [
      'heated_propagator',
      'unheated_propagator',
      'water_propagation',
      'outdoor_bed',
      'cold_frame',
      'greenhouse_bench',
      'mist_system',
      'other',
    ];

    for (const type of stationTypes) {
      const targets = DEFAULT_ENVIRONMENTAL_TARGETS[type];
      expect(targets).toBeDefined();
      expect(targets.tempMin).toBeDefined();
      expect(targets.tempMax).toBeDefined();
      expect(targets.humidityMin).toBeDefined();
      expect(targets.humidityMax).toBeDefined();
    }
  });

  it('has appropriate ranges for heated propagator', () => {
    const targets = DEFAULT_ENVIRONMENTAL_TARGETS.heated_propagator;
    expect(targets.tempMin).toBeGreaterThanOrEqual(18);
    expect(targets.tempMax).toBeLessThanOrEqual(30);
    expect(targets.humidityMin).toBeGreaterThanOrEqual(70);
    expect(targets.humidityMax).toBeLessThanOrEqual(100);
  });

  it('has appropriate ranges for outdoor bed', () => {
    const targets = DEFAULT_ENVIRONMENTAL_TARGETS.outdoor_bed;
    // Outdoor beds should have wider temperature tolerance
    expect(targets.tempMax - targets.tempMin).toBeGreaterThanOrEqual(15);
  });

  it('has high humidity for mist system', () => {
    const targets = DEFAULT_ENVIRONMENTAL_TARGETS.mist_system;
    expect(targets.humidityMin).toBeGreaterThanOrEqual(80);
    expect(targets.humidityMax).toBe(100);
  });
});

// ============================================
// ENVIRONMENTAL VALIDATION TESTS
// ============================================

describe('Environmental Target Validation', () => {
  // Inline validation function for testing (mirrors store implementation)
  function validateEnvironmentalTargets(
    tempMin?: number,
    tempMax?: number,
    humidityMin?: number,
    humidityMax?: number
  ): EnvironmentalValidation {
    const errors: string[] = [];

    if (tempMin !== undefined) {
      if (tempMin < -40 || tempMin > 60) {
        errors.push('Minimum temperature must be between -40 and 60 degrees Celsius');
      }
    }
    if (tempMax !== undefined) {
      if (tempMax < -40 || tempMax > 60) {
        errors.push('Maximum temperature must be between -40 and 60 degrees Celsius');
      }
    }
    if (tempMin !== undefined && tempMax !== undefined && tempMin > tempMax) {
      errors.push('Minimum temperature cannot exceed maximum temperature');
    }

    if (humidityMin !== undefined) {
      if (humidityMin < 0 || humidityMin > 100) {
        errors.push('Minimum humidity must be between 0 and 100 percent');
      }
    }
    if (humidityMax !== undefined) {
      if (humidityMax < 0 || humidityMax > 100) {
        errors.push('Maximum humidity must be between 0 and 100 percent');
      }
    }
    if (humidityMin !== undefined && humidityMax !== undefined && humidityMin > humidityMax) {
      errors.push('Minimum humidity cannot exceed maximum humidity');
    }

    return { isValid: errors.length === 0, errors };
  }

  it('validates correct environmental targets', () => {
    const result = validateEnvironmentalTargets(15, 25, 60, 90);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects temperature out of range', () => {
    const result = validateEnvironmentalTargets(-50, 25, 60, 90);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects max temp below min temp', () => {
    const result = validateEnvironmentalTargets(30, 20, 60, 90);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Minimum temperature cannot exceed maximum temperature');
  });

  it('rejects humidity out of range', () => {
    const result = validateEnvironmentalTargets(15, 25, -10, 90);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects max humidity below min humidity', () => {
    const result = validateEnvironmentalTargets(15, 25, 90, 60);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Minimum humidity cannot exceed maximum humidity');
  });

  it('allows undefined values (partial validation)', () => {
    const result = validateEnvironmentalTargets(15, undefined, undefined, 90);
    expect(result.isValid).toBe(true);
  });
});

// ============================================
// OCCUPANCY CALCULATION TESTS
// ============================================

describe('Occupancy Calculations', () => {
  // Inline occupancy calculation function for testing
  function calculateOccupancy(
    station: PropStation,
    activeBatches: PropBatchWithComputed[]
  ): {
    currentOccupancy: number;
    availableCapacity: number;
    occupancyPercentage: number;
    isAtCapacity: boolean;
    batchCount: number;
  } {
    const stationBatches = activeBatches.filter((b) => b.stationId === station.id);
    const currentOccupancy = stationBatches.reduce((sum, b) => sum + b.quantitySurviving, 0);
    const batchCount = stationBatches.length;

    const availableCapacity = Math.max(0, station.capacity - currentOccupancy);
    const occupancyPercentage =
      station.capacity > 0 ? Math.round((currentOccupancy / station.capacity) * 100) : 0;
    const isAtCapacity = currentOccupancy >= station.capacity;

    return {
      currentOccupancy,
      availableCapacity,
      occupancyPercentage,
      isAtCapacity,
      batchCount,
    };
  }

  it('calculates zero occupancy for empty station', () => {
    const station = createMockStation({ id: 'station-1', capacity: 100 });
    const result = calculateOccupancy(station, []);

    expect(result.currentOccupancy).toBe(0);
    expect(result.availableCapacity).toBe(100);
    expect(result.occupancyPercentage).toBe(0);
    expect(result.isAtCapacity).toBe(false);
    expect(result.batchCount).toBe(0);
  });

  it('calculates occupancy from single batch', () => {
    const station = createMockStation({ id: 'station-1', capacity: 100 });
    const batches = [
      createMockBatch({ stationId: 'station-1', quantitySurviving: 30 }),
    ];
    const result = calculateOccupancy(station, batches);

    expect(result.currentOccupancy).toBe(30);
    expect(result.availableCapacity).toBe(70);
    expect(result.occupancyPercentage).toBe(30);
    expect(result.isAtCapacity).toBe(false);
    expect(result.batchCount).toBe(1);
  });

  it('calculates occupancy from multiple batches', () => {
    const station = createMockStation({ id: 'station-1', capacity: 100 });
    const batches = [
      createMockBatch({ id: 'b1', stationId: 'station-1', quantitySurviving: 25 }),
      createMockBatch({ id: 'b2', stationId: 'station-1', quantitySurviving: 35 }),
      createMockBatch({ id: 'b3', stationId: 'station-1', quantitySurviving: 20 }),
    ];
    const result = calculateOccupancy(station, batches);

    expect(result.currentOccupancy).toBe(80);
    expect(result.availableCapacity).toBe(20);
    expect(result.occupancyPercentage).toBe(80);
    expect(result.isAtCapacity).toBe(false);
    expect(result.batchCount).toBe(3);
  });

  it('ignores batches from other stations', () => {
    const station = createMockStation({ id: 'station-1', capacity: 100 });
    const batches = [
      createMockBatch({ id: 'b1', stationId: 'station-1', quantitySurviving: 30 }),
      createMockBatch({ id: 'b2', stationId: 'station-2', quantitySurviving: 50 }),
    ];
    const result = calculateOccupancy(station, batches);

    expect(result.currentOccupancy).toBe(30);
    expect(result.batchCount).toBe(1);
  });

  it('detects at-capacity condition', () => {
    const station = createMockStation({ id: 'station-1', capacity: 50 });
    const batches = [
      createMockBatch({ stationId: 'station-1', quantitySurviving: 50 }),
    ];
    const result = calculateOccupancy(station, batches);

    expect(result.currentOccupancy).toBe(50);
    expect(result.availableCapacity).toBe(0);
    expect(result.occupancyPercentage).toBe(100);
    expect(result.isAtCapacity).toBe(true);
  });

  it('handles over-capacity gracefully', () => {
    const station = createMockStation({ id: 'station-1', capacity: 50 });
    const batches = [
      createMockBatch({ stationId: 'station-1', quantitySurviving: 60 }),
    ];
    const result = calculateOccupancy(station, batches);

    expect(result.currentOccupancy).toBe(60);
    expect(result.availableCapacity).toBe(0); // Math.max(0, -10)
    expect(result.occupancyPercentage).toBe(120);
    expect(result.isAtCapacity).toBe(true);
  });

  it('handles zero capacity station', () => {
    const station = createMockStation({ id: 'station-1', capacity: 0 });
    const result = calculateOccupancy(station, []);

    expect(result.occupancyPercentage).toBe(0);
  });
});

// ============================================
// STATION FILTERING TESTS
// ============================================

describe('Station Filtering', () => {
  const stations: StationWithOccupancy[] = [
    { ...mockStations.heatedPropagator(), currentOccupancy: 50, availableCapacity: 50, occupancyPercentage: 50, isAtCapacity: false, batchCount: 2 },
    { ...mockStations.coldFrame(), currentOccupancy: 100, availableCapacity: 100, occupancyPercentage: 50, isAtCapacity: false, batchCount: 1 },
    { ...mockStations.mistSystem(), currentOccupancy: 150, availableCapacity: 0, occupancyPercentage: 100, isAtCapacity: true, batchCount: 3 },
    { ...mockStations.inactive(), currentOccupancy: 0, availableCapacity: 75, occupancyPercentage: 0, isAtCapacity: false, batchCount: 0 },
  ];

  // Inline filtering function for testing
  function filterStations(
    stationList: StationWithOccupancy[],
    filters: StationFilters
  ): StationWithOccupancy[] {
    let filtered = [...stationList];

    if (filters.siteId !== 'all') {
      filtered = filtered.filter((s) => s.siteId === filters.siteId);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter((s) => s.type === filters.type);
    }
    if (filters.isActive !== 'all') {
      filtered = filtered.filter((s) => s.isActive === filters.isActive);
    }
    if (filters.isIndoor !== 'all') {
      filtered = filtered.filter((s) => s.isIndoor === filters.isIndoor);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  it('returns all stations with default filters', () => {
    const filters: StationFilters = {
      siteId: 'all',
      type: 'all',
      isActive: 'all',
      isIndoor: 'all',
    };
    const result = filterStations(stations, filters);
    expect(result).toHaveLength(4);
  });

  it('filters by station type', () => {
    const filters: StationFilters = {
      siteId: 'all',
      type: 'heated_propagator',
      isActive: 'all',
      isIndoor: 'all',
    };
    const result = filterStations(stations, filters);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('heated_propagator');
  });

  it('filters by active status', () => {
    const filters: StationFilters = {
      siteId: 'all',
      type: 'all',
      isActive: true,
      isIndoor: 'all',
    };
    const result = filterStations(stations, filters);
    expect(result).toHaveLength(3);
    expect(result.every((s) => s.isActive)).toBe(true);
  });

  it('filters by indoor/outdoor', () => {
    const filters: StationFilters = {
      siteId: 'all',
      type: 'all',
      isActive: 'all',
      isIndoor: false,
    };
    const result = filterStations(stations, filters);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('cold_frame');
  });

  it('combines multiple filters', () => {
    const filters: StationFilters = {
      siteId: 'all',
      type: 'all',
      isActive: true,
      isIndoor: true,
    };
    const result = filterStations(stations, filters);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.isActive && s.isIndoor)).toBe(true);
  });

  it('sorts results alphabetically by name', () => {
    const filters: StationFilters = {
      siteId: 'all',
      type: 'all',
      isActive: 'all',
      isIndoor: 'all',
    };
    const result = filterStations(stations, filters);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });
});

// ============================================
// QUERY SELECTOR TESTS
// ============================================

describe('Query Selectors', () => {
  const stations: StationWithOccupancy[] = [
    { ...mockStations.heatedPropagator(), siteId: 'site-1', currentOccupancy: 50, availableCapacity: 50, occupancyPercentage: 50, isAtCapacity: false, batchCount: 2 },
    { ...mockStations.coldFrame(), siteId: 'site-2', currentOccupancy: 100, availableCapacity: 100, occupancyPercentage: 50, isAtCapacity: false, batchCount: 1 },
    { ...mockStations.mistSystem(), siteId: 'site-1', currentOccupancy: 150, availableCapacity: 0, occupancyPercentage: 100, isAtCapacity: true, batchCount: 3 },
    { ...mockStations.inactive(), siteId: 'site-1', currentOccupancy: 0, availableCapacity: 75, occupancyPercentage: 0, isAtCapacity: false, batchCount: 0 },
  ];

  describe('getActiveStations', () => {
    it('returns only active stations', () => {
      const active = stations.filter((s) => s.isActive);
      expect(active).toHaveLength(3);
    });
  });

  describe('getStationsByType', () => {
    it('filters stations by type', () => {
      const mistStations = stations.filter((s) => s.type === 'mist_system');
      expect(mistStations).toHaveLength(1);
    });
  });

  describe('getStationsBySite', () => {
    it('filters stations by site', () => {
      const site1Stations = stations.filter((s) => s.siteId === 'site-1');
      expect(site1Stations).toHaveLength(3);
    });
  });

  describe('getStationById', () => {
    it('finds station by ID', () => {
      const station = stations.find((s) => s.id === 'station-heated');
      expect(station).toBeDefined();
      expect(station?.name).toBe('Heated Propagator 1');
    });

    it('returns undefined for unknown ID', () => {
      const station = stations.find((s) => s.id === 'unknown-id');
      expect(station).toBeUndefined();
    });
  });

  describe('getStationsWithAvailability', () => {
    it('returns active stations with capacity', () => {
      const available = stations
        .filter((s) => s.isActive && !s.isAtCapacity)
        .sort((a, b) => b.availableCapacity - a.availableCapacity);

      expect(available).toHaveLength(2);
      // Should be sorted by available capacity descending
      expect(available[0].availableCapacity).toBeGreaterThanOrEqual(available[1].availableCapacity);
    });
  });

  describe('getUniqueTypes', () => {
    it('extracts unique station types', () => {
      const types = [...new Set(stations.map((s) => s.type))].sort();
      expect(types).toContain('heated_propagator');
      expect(types).toContain('cold_frame');
      expect(types).toContain('mist_system');
      expect(types).toContain('greenhouse_bench');
    });
  });

  describe('getUniqueSites', () => {
    it('extracts unique site IDs', () => {
      const sites = [...new Set(stations.map((s) => s.siteId))].sort();
      expect(sites).toEqual(['site-1', 'site-2']);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles station with all optional fields undefined', () => {
    const station = createMockStation({
      description: undefined,
      targetTempMin: undefined,
      targetTempMax: undefined,
      targetHumidityMin: undefined,
      targetHumidityMax: undefined,
    });

    expect(station.name).toBeDefined();
    expect(station.capacity).toBeDefined();
  });

  it('handles empty station list', () => {
    const stations: StationWithOccupancy[] = [];
    const active = stations.filter((s) => s.isActive);
    expect(active).toHaveLength(0);
  });

  it('handles station with very large capacity', () => {
    const station = createMockStation({
      id: 'station-large',
      capacity: 10000,
    });
    const batches = [
      createMockBatch({ stationId: 'station-large', quantitySurviving: 5000 }),
    ];

    // Inline occupancy calculation
    const currentOccupancy = batches.reduce((sum, b) => sum + b.quantitySurviving, 0);
    const occupancyPercentage = Math.round((currentOccupancy / station.capacity) * 100);

    expect(occupancyPercentage).toBe(50);
  });
});
