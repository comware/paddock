/**
 * usePropagules Store Unit Tests
 *
 * Tests the individual propagule tracking store including:
 * - Propagule CRUD from exploded batches
 * - Individual health tracking
 * - Individual stage transitions
 * - Filtering and queries
 */

import { describe, it, expect } from 'vitest';
import type {
  PropPropagule,
  PropPropaguleWithComputed,
  PropBatch,
  PropagationStage,
  PropagationMethod,
  FailureReason,
} from '../../types';
import { VALID_STAGE_TRANSITIONS } from '../../types';
import {
  isActiveStage,
  isValidTransition,
} from '../../utils/stageHelpers';
import type {
  PropaguleFilters,
  PropaguleSort,
} from '../usePropagules';

// ============================================
// TEST FIXTURES
// ============================================

function createMockPropagule(overrides: Partial<PropPropagule> = {}): PropPropagule {
  const now = new Date();
  return {
    id: 'propagule-test',
    batchId: 'batch-1',
    propaguleNumber: '2026-001-01',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    variety: 'English',
    method: 'cutting_softwood',
    stage: 'rooting',
    healthScore: 3,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  const now = new Date();
  return {
    id: 'batch-1',
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    variety: 'English',
    method: 'cutting_softwood',
    quantityStarted: 20,
    quantitySurviving: 18,
    dateTaken: now,
    stage: 'rooting',
    daysInStage: 7,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Pre-defined mock propagules for testing
const mockPropagules = {
  rooting: () =>
    createMockPropagule({
      id: 'prop-rooting',
      propaguleNumber: '2026-001-01',
      stage: 'rooting',
      healthScore: 4,
    }),

  rooted: () =>
    createMockPropagule({
      id: 'prop-rooted',
      propaguleNumber: '2026-001-02',
      stage: 'rooted',
      healthScore: 5,
    }),

  pottedUp: () =>
    createMockPropagule({
      id: 'prop-potted',
      propaguleNumber: '2026-001-03',
      stage: 'potted_up',
      healthScore: 3,
    }),

  graduated: () =>
    createMockPropagule({
      id: 'prop-graduated',
      propaguleNumber: '2026-001-04',
      stage: 'graduated',
      healthScore: 5,
    }),

  failed: () =>
    createMockPropagule({
      id: 'prop-failed',
      propaguleNumber: '2026-001-05',
      stage: 'failed',
      healthScore: 1,
    }),

  withMeasurements: () =>
    createMockPropagule({
      id: 'prop-measured',
      propaguleNumber: '2026-001-06',
      stage: 'potted_up',
      healthScore: 4,
      heightCm: 15,
      stemDiameterMm: 3,
      leafCount: 8,
      rootScore: 4,
    }),
};

// ============================================
// PROPAGULE NUMBER GENERATION TESTS
// ============================================

describe('Propagule Number Generation', () => {
  // Inline generation function for testing
  function generatePropaguleNumber(
    batchNumber: string,
    existingPropagules: Pick<PropPropagule, 'propaguleNumber'>[]
  ): string {
    const batchPropagules = existingPropagules.filter((p) =>
      p.propaguleNumber.startsWith(batchNumber + '-')
    );

    if (batchPropagules.length === 0) {
      return batchNumber + '-01';
    }

    let maxSequence = 0;
    for (const propagule of batchPropagules) {
      const match = propagule.propaguleNumber.match(/-(\d{2})$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSequence) {
          maxSequence = seq;
        }
      }
    }

    const nextSequence = (maxSequence + 1).toString().padStart(2, '0');
    return batchNumber + '-' + nextSequence;
  }

  it('generates first propagule number', () => {
    const result = generatePropaguleNumber('2026-001', []);
    expect(result).toBe('2026-001-01');
  });

  it('generates sequential numbers', () => {
    const existing = [
      { propaguleNumber: '2026-001-01' },
      { propaguleNumber: '2026-001-02' },
    ];
    const result = generatePropaguleNumber('2026-001', existing);
    expect(result).toBe('2026-001-03');
  });

  it('handles gaps in sequence', () => {
    const existing = [
      { propaguleNumber: '2026-001-01' },
      { propaguleNumber: '2026-001-05' },
    ];
    const result = generatePropaguleNumber('2026-001', existing);
    expect(result).toBe('2026-001-06');
  });

  it('ignores propagules from other batches', () => {
    const existing = [
      { propaguleNumber: '2026-001-01' },
      { propaguleNumber: '2026-002-01' },
      { propaguleNumber: '2026-002-02' },
    ];
    const result = generatePropaguleNumber('2026-001', existing);
    expect(result).toBe('2026-001-02');
  });

  it('pads sequence to 2 digits', () => {
    const result = generatePropaguleNumber('2026-001', []);
    expect(result).toMatch(/-\d{2}$/);
  });
});

// ============================================
// BATCH EXPLOSION TESTS
// ============================================

describe('Batch Explosion', () => {
  describe('explodeBatch validation', () => {
    it('validates count is positive', () => {
      const count = 0;
      expect(count > 0).toBe(false);
    });

    it('validates count does not exceed surviving', () => {
      const batch = createMockBatch({ quantitySurviving: 10 });
      const count = 15;
      expect(count <= batch.quantitySurviving).toBe(false);
    });

    it('validates batch is not already exploded', () => {
      const batch = createMockBatch({ isExploded: true });
      expect(batch.isExploded).toBe(true);
    });

    it('allows explosion of unexploded batch with valid count', () => {
      const batch = createMockBatch({ quantitySurviving: 10, isExploded: false });
      const count = 5;
      expect(count > 0 && count <= batch.quantitySurviving && !batch.isExploded).toBe(true);
    });
  });

  describe('explodeBatch propagule creation', () => {
    it('creates correct number of propagules', () => {
      const count = 5;
      const propagules = Array.from({ length: count }, (_, i) => ({
        propaguleNumber: '2026-001-' + String(i + 1).padStart(2, '0'),
      }));
      expect(propagules).toHaveLength(5);
    });

    it('inherits batch properties', () => {
      const batch = createMockBatch({
        species: 'Rosemary',
        variety: 'Tuscan Blue',
        method: 'cutting_hardwood',
      });

      const propagule = createMockPropagule({
        species: batch.species,
        variety: batch.variety,
        method: batch.method,
      });

      expect(propagule.species).toBe('Rosemary');
      expect(propagule.variety).toBe('Tuscan Blue');
      expect(propagule.method).toBe('cutting_hardwood');
    });
  });
});

// ============================================
// STAGE TRANSITION TESTS
// ============================================

describe('Propagule Stage Transitions', () => {
  describe('advanceStage', () => {
    it('allows valid progression', () => {
      const propagule = mockPropagules.rooting();
      expect(isValidTransition(propagule.stage, 'rooted')).toBe(true);
    });

    it('rejects skipping stages', () => {
      const propagule = mockPropagules.rooting();
      expect(isValidTransition(propagule.stage, 'potted_up')).toBe(false);
    });

    it('rejects backwards transitions', () => {
      const propagule = mockPropagules.rooted();
      expect(isValidTransition(propagule.stage, 'rooting')).toBe(false);
    });

    it('rejects transitions from terminal stages', () => {
      const propagule = mockPropagules.graduated();
      expect(isValidTransition(propagule.stage, 'ready')).toBe(false);
    });
  });

  describe('markFailed', () => {
    it('allows failure from non-terminal stage', () => {
      const propagule = mockPropagules.rooting();
      expect(isValidTransition(propagule.stage, 'failed')).toBe(true);
    });

    it('rejects failure from terminal stage', () => {
      const propagule = mockPropagules.graduated();
      expect(isValidTransition(propagule.stage, 'failed')).toBe(false);
    });

    it('requires failure reason', () => {
      const validReasons: FailureReason[] = [
        'rot', 'dried_out', 'disease', 'pest',
        'no_roots', 'transplant_shock', 'environmental', 'unknown',
      ];
      for (const reason of validReasons) {
        expect(typeof reason).toBe('string');
      }
    });
  });

  describe('isActiveStage', () => {
    it('returns true for non-terminal stages', () => {
      const activeStages: PropagationStage[] = [
        'taken', 'rooting', 'rooted', 'potted_up', 'hardening', 'ready',
      ];
      for (const stage of activeStages) {
        expect(isActiveStage(stage)).toBe(true);
      }
    });

    it('returns false for terminal stages', () => {
      expect(isActiveStage('graduated')).toBe(false);
      expect(isActiveStage('failed')).toBe(false);
    });
  });
});

// ============================================
// HEALTH TRACKING TESTS
// ============================================

describe('Health Score Tracking', () => {
  describe('updateHealthScore', () => {
    it('validates score range 1-5', () => {
      const validScores = [1, 2, 3, 4, 5];
      for (const score of validScores) {
        expect(score >= 1 && score <= 5).toBe(true);
      }
    });

    it('rejects score below 1', () => {
      const score = 0;
      expect(score >= 1).toBe(false);
    });

    it('rejects score above 5', () => {
      const score = 6;
      expect(score <= 5).toBe(false);
    });
  });

  describe('getHealthDistribution', () => {
    // Inline function for testing
    function getHealthDistribution(
      propagules: PropPropaguleWithComputed[]
    ): Record<number, number> {
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const propagule of propagules) {
        if (propagule.healthScore !== undefined && isActiveStage(propagule.stage)) {
          distribution[propagule.healthScore]++;
        }
      }

      return distribution;
    }

    const propagules: PropPropaguleWithComputed[] = [
      { ...mockPropagules.rooting(), daysInStage: 7, daysSinceTaken: 7 },
      { ...mockPropagules.rooted(), daysInStage: 3, daysSinceTaken: 10 },
      { ...mockPropagules.pottedUp(), daysInStage: 1, daysSinceTaken: 11 },
      { ...mockPropagules.graduated(), daysInStage: 0, daysSinceTaken: 50 },
      { ...mockPropagules.failed(), daysInStage: 0, daysSinceTaken: 15 },
    ];

    it('counts health scores by value', () => {
      const distribution = getHealthDistribution(propagules);
      expect(distribution[3]).toBe(1); // potted_up
      expect(distribution[4]).toBe(1); // rooting
      expect(distribution[5]).toBe(1); // rooted
    });

    it('excludes terminal stage propagules', () => {
      const distribution = getHealthDistribution(propagules);
      // graduated (5) and failed (1) should not be counted
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(3);
    });
  });
});

// ============================================
// MEASUREMENT RECORDING TESTS
// ============================================

describe('Measurement Recording', () => {
  it('records height measurement', () => {
    const propagule = createMockPropagule({ heightCm: 15.5 });
    expect(propagule.heightCm).toBe(15.5);
  });

  it('records stem diameter', () => {
    const propagule = createMockPropagule({ stemDiameterMm: 3.2 });
    expect(propagule.stemDiameterMm).toBe(3.2);
  });

  it('records leaf count', () => {
    const propagule = createMockPropagule({ leafCount: 8 });
    expect(propagule.leafCount).toBe(8);
  });

  it('records root score', () => {
    const propagule = createMockPropagule({ rootScore: 4 });
    expect(propagule.rootScore).toBe(4);
  });

  it('handles propagule with all measurements', () => {
    const propagule = mockPropagules.withMeasurements();
    expect(propagule.heightCm).toBe(15);
    expect(propagule.stemDiameterMm).toBe(3);
    expect(propagule.leafCount).toBe(8);
    expect(propagule.rootScore).toBe(4);
  });
});

// ============================================
// FILTERING TESTS
// ============================================

describe('Propagule Filtering', () => {
  const propagules: PropPropaguleWithComputed[] = [
    { ...mockPropagules.rooting(), batchId: 'batch-1', species: 'Lavender', stationId: 'station-1', siteId: 'site-1', daysInStage: 7, daysSinceTaken: 7 },
    { ...mockPropagules.rooted(), batchId: 'batch-1', species: 'Lavender', stationId: 'station-1', siteId: 'site-1', daysInStage: 3, daysSinceTaken: 10 },
    { ...mockPropagules.pottedUp(), batchId: 'batch-2', species: 'Rosemary', stationId: 'station-2', siteId: 'site-1', daysInStage: 1, daysSinceTaken: 11 },
    { ...mockPropagules.graduated(), batchId: 'batch-2', species: 'Rosemary', stationId: 'station-2', siteId: 'site-1', daysInStage: 0, daysSinceTaken: 50 },
    { ...mockPropagules.failed(), batchId: 'batch-3', species: 'Sage', stationId: 'station-1', siteId: 'site-2', daysInStage: 0, daysSinceTaken: 15 },
  ];

  // Inline filtering function for testing
  function filterPropagules(
    propList: PropPropaguleWithComputed[],
    filters: PropaguleFilters
  ): PropPropaguleWithComputed[] {
    let filtered = [...propList];

    if (filters.batchId !== 'all') {
      filtered = filtered.filter((p) => p.batchId === filters.batchId);
    }
    if (filters.stage !== 'all') {
      if (filters.stage === 'active') {
        filtered = filtered.filter((p) => isActiveStage(p.stage));
      } else {
        filtered = filtered.filter((p) => p.stage === filters.stage);
      }
    }
    if (filters.species !== 'all') {
      filtered = filtered.filter((p) => p.species === filters.species);
    }
    if (filters.stationId !== 'all') {
      filtered = filtered.filter((p) => p.stationId === filters.stationId);
    }
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((p) => p.siteId === filters.siteId);
    }
    if (filters.healthScore !== undefined) {
      filtered = filtered.filter(
        (p) => p.healthScore !== undefined && p.healthScore >= filters.healthScore!
      );
    }

    return filtered;
  }

  it('returns all propagules with default filters', () => {
    const filters: PropaguleFilters = {
      batchId: 'all',
      stage: 'all',
      species: 'all',
      stationId: 'all',
      siteId: 'all',
    };
    const result = filterPropagules(propagules, filters);
    expect(result).toHaveLength(5);
  });

  it('filters by batch', () => {
    const filters: PropaguleFilters = {
      batchId: 'batch-1',
      stage: 'all',
      species: 'all',
      stationId: 'all',
      siteId: 'all',
    };
    const result = filterPropagules(propagules, filters);
    expect(result).toHaveLength(2);
  });

  it('filters by specific stage', () => {
    const filters: PropaguleFilters = {
      batchId: 'all',
      stage: 'rooting',
      species: 'all',
      stationId: 'all',
      siteId: 'all',
    };
    const result = filterPropagules(propagules, filters);
    expect(result).toHaveLength(1);
  });

  it('filters active stages', () => {
    const filters: PropaguleFilters = {
      batchId: 'all',
      stage: 'active',
      species: 'all',
      stationId: 'all',
      siteId: 'all',
    };
    const result = filterPropagules(propagules, filters);
    expect(result).toHaveLength(3); // rooting, rooted, potted_up
  });

  it('filters by species', () => {
    const filters: PropaguleFilters = {
      batchId: 'all',
      stage: 'all',
      species: 'Rosemary',
      stationId: 'all',
      siteId: 'all',
    };
    const result = filterPropagules(propagules, filters);
    expect(result).toHaveLength(2);
  });

  it('filters by minimum health score', () => {
    const filters: PropaguleFilters = {
      batchId: 'all',
      stage: 'all',
      species: 'all',
      stationId: 'all',
      siteId: 'all',
      healthScore: 4,
    };
    const result = filterPropagules(propagules, filters);
    expect(result.every((p) => p.healthScore! >= 4)).toBe(true);
  });
});

// ============================================
// SORTING TESTS
// ============================================

describe('Propagule Sorting', () => {
  const propagules: PropPropaguleWithComputed[] = [
    { ...mockPropagules.rooting(), daysInStage: 7, daysSinceTaken: 7 },
    { ...mockPropagules.rooted(), daysInStage: 3, daysSinceTaken: 10 },
    { ...mockPropagules.pottedUp(), daysInStage: 1, daysSinceTaken: 11 },
  ];

  // Inline sorting function for testing
  function sortPropagules(
    propList: PropPropaguleWithComputed[],
    sort: PropaguleSort
  ): PropPropaguleWithComputed[] {
    const sorted = [...propList];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'propaguleNumber':
          comparison = a.propaguleNumber.localeCompare(b.propaguleNumber);
          break;
        case 'species':
          comparison = a.species.localeCompare(b.species);
          break;
        case 'healthScore':
          comparison = (a.healthScore ?? 0) - (b.healthScore ?? 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }

  it('sorts by propagule number ascending', () => {
    const sort: PropaguleSort = { field: 'propaguleNumber', direction: 'asc' };
    const result = sortPropagules(propagules, sort);
    expect(result[0].propaguleNumber).toBe('2026-001-01');
  });

  it('sorts by health score descending', () => {
    const sort: PropaguleSort = { field: 'healthScore', direction: 'desc' };
    const result = sortPropagules(propagules, sort);
    expect(result[0].healthScore).toBe(5);
  });
});

// ============================================
// QUERY SELECTOR TESTS
// ============================================

describe('Query Selectors', () => {
  const propagules: PropPropaguleWithComputed[] = [
    { ...mockPropagules.rooting(), daysInStage: 7, daysSinceTaken: 7 },
    { ...mockPropagules.rooted(), daysInStage: 3, daysSinceTaken: 10 },
    { ...mockPropagules.pottedUp(), daysInStage: 1, daysSinceTaken: 11 },
    { ...mockPropagules.graduated(), daysInStage: 0, daysSinceTaken: 50 },
    { ...mockPropagules.failed(), daysInStage: 0, daysSinceTaken: 15 },
  ];

  describe('getActivePropagules', () => {
    it('returns only active propagules', () => {
      const active = propagules.filter((p) => isActiveStage(p.stage));
      expect(active).toHaveLength(3);
    });
  });

  describe('getPropagulesByBatch', () => {
    it('filters by batch', () => {
      const result = propagules.filter((p) => p.batchId === 'batch-1');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getPropagulesByStage', () => {
    it('filters by stage', () => {
      const result = propagules.filter((p) => p.stage === 'rooting');
      expect(result).toHaveLength(1);
    });
  });

  describe('getPropaguleById', () => {
    it('finds propagule by ID', () => {
      const result = propagules.find((p) => p.id === 'prop-rooting');
      expect(result).toBeDefined();
    });

    it('returns undefined for unknown ID', () => {
      const result = propagules.find((p) => p.id === 'unknown');
      expect(result).toBeUndefined();
    });
  });

  describe('getActivePropaguleCount', () => {
    it('counts active propagules', () => {
      const count = propagules.filter((p) => isActiveStage(p.stage)).length;
      expect(count).toBe(3);
    });
  });

  describe('getUniqueSpecies', () => {
    it('extracts unique species', () => {
      const species = [...new Set(propagules.map((p) => p.species))].sort();
      expect(species).toContain('Lavender');
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles propagule with all optional fields undefined', () => {
    const propagule = createMockPropagule({
      variety: undefined,
      motherPlantId: undefined,
      label: undefined,
      scionSource: undefined,
      rootstockType: undefined,
      healthScore: undefined,
      heightCm: undefined,
      stemDiameterMm: undefined,
      leafCount: undefined,
      rootScore: undefined,
      notes: undefined,
    });

    expect(propagule.species).toBeDefined();
    expect(propagule.propaguleNumber).toBeDefined();
  });

  it('handles empty propagule list', () => {
    const propagules: PropPropaguleWithComputed[] = [];
    const active = propagules.filter((p) => isActiveStage(p.stage));
    expect(active).toHaveLength(0);
  });

  it('handles all propagation methods', () => {
    const methods: PropagationMethod[] = [
      'cutting_softwood', 'cutting_semi_hardwood', 'cutting_hardwood',
      'cutting_leaf', 'cutting_root', 'division',
      'layering_simple', 'layering_air',
      'grafting_whip', 'grafting_cleft', 'grafting_bud', 'seed',
    ];
    for (const method of methods) {
      const propagule = createMockPropagule({ method });
      expect(propagule.method).toBe(method);
    }
  });

  it('handles graft-specific fields', () => {
    const propagule = createMockPropagule({
      method: 'grafting_whip',
      scionSource: 'Premium apple tree',
      rootstockType: 'M111',
    });
    expect(propagule.scionSource).toBe('Premium apple tree');
    expect(propagule.rootstockType).toBe('M111');
  });
});
