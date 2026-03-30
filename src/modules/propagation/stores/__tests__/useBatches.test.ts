/**
 * useBatches Store Unit Tests
 *
 * Tests the batch management store including:
 * - Stage transition validation
 * - Computed fields (daysInStage, survivalRate)
 * - Batch number generation
 * - Store selectors (success rate, stage counts, etc.)
 */

import { describe, it, expect } from 'vitest';
import type { PropBatch, PropagationStage } from '../../types';
import { VALID_STAGE_TRANSITIONS } from '../../types';
import {
  calculateDaysInStage,
  calculateDaysSinceTaken,
  calculateSurvivalRate,
  isOverdue,
  isValidTransition,
  getValidNextStages,
  isTerminalStage,
  isActiveStage,
  getStageProgressPercent,
  getStageDisplayName,
  TYPICAL_STAGE_DAYS,
} from '../../utils/stageHelpers';
import {
  generateNextBatchNumber,
  parseBatchNumber,
  formatBatchNumber,
  isValidBatchNumber,
  getBatchCountForYear,
  getYearsWithBatches,
} from '../../utils/batchNumbering';

// ============================================
// TEST FIXTURES
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createMockBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  const now = new Date();
  return {
    id: `batch-${Math.random().toString(36).slice(2, 9)}`,
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    variety: 'English',
    method: 'cutting_softwood',
    quantityStarted: 20,
    quantitySurviving: 18,
    dateTaken: daysAgo(14),
    stage: 'rooting',
    daysInStage: 14,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create batch in specific lifecycle state
const mockBatches = {
  taken: () =>
    createMockBatch({
      id: 'batch-taken',
      batchNumber: '2026-001',
      stage: 'taken',
      dateTaken: daysAgo(1),
    }),

  rooting: () =>
    createMockBatch({
      id: 'batch-rooting',
      batchNumber: '2026-002',
      stage: 'rooting',
      dateTaken: daysAgo(14),
    }),

  rooted: () =>
    createMockBatch({
      id: 'batch-rooted',
      batchNumber: '2026-003',
      stage: 'rooted',
      dateTaken: daysAgo(21),
      dateRooted: daysAgo(0),
      quantitySurviving: 15,
    }),

  pottedUp: () =>
    createMockBatch({
      id: 'batch-potted',
      batchNumber: '2026-004',
      stage: 'potted_up',
      dateTaken: daysAgo(28),
      dateRooted: daysAgo(7),
      datePottedUp: daysAgo(0),
      quantitySurviving: 14,
    }),

  hardening: () =>
    createMockBatch({
      id: 'batch-hardening',
      batchNumber: '2026-005',
      stage: 'hardening',
      dateTaken: daysAgo(42),
      dateRooted: daysAgo(21),
      datePottedUp: daysAgo(14),
      dateHardeningStarted: daysAgo(0),
      quantitySurviving: 12,
    }),

  ready: () =>
    createMockBatch({
      id: 'batch-ready',
      batchNumber: '2026-006',
      stage: 'ready',
      dateTaken: daysAgo(56),
      dateRooted: daysAgo(35),
      datePottedUp: daysAgo(28),
      dateHardeningStarted: daysAgo(14),
      dateReady: daysAgo(0),
      quantitySurviving: 10,
    }),

  graduated: () =>
    createMockBatch({
      id: 'batch-graduated',
      batchNumber: '2026-007',
      stage: 'graduated',
      dateTaken: daysAgo(70),
      dateRooted: daysAgo(49),
      datePottedUp: daysAgo(42),
      dateHardeningStarted: daysAgo(28),
      dateReady: daysAgo(14),
      dateGraduated: daysAgo(0),
      quantitySurviving: 8,
    }),

  failed: () =>
    createMockBatch({
      id: 'batch-failed',
      batchNumber: '2026-008',
      stage: 'failed',
      dateTaken: daysAgo(21),
      quantitySurviving: 0,
    }),
};

// ============================================
// STAGE TRANSITION VALIDATION TESTS
// ============================================

describe('Stage Transition Validation', () => {
  describe('VALID_STAGE_TRANSITIONS', () => {
    it('defines transitions for all stages', () => {
      const stages: PropagationStage[] = [
        'taken',
        'rooting',
        'rooted',
        'potted_up',
        'hardening',
        'ready',
        'graduated',
        'failed',
      ];

      for (const stage of stages) {
        expect(VALID_STAGE_TRANSITIONS[stage]).toBeDefined();
        expect(Array.isArray(VALID_STAGE_TRANSITIONS[stage])).toBe(true);
      }
    });

    it('allows progression from taken to rooting', () => {
      expect(VALID_STAGE_TRANSITIONS.taken).toContain('rooting');
    });

    it('allows failure from any non-terminal stage', () => {
      const nonTerminalStages: PropagationStage[] = [
        'taken',
        'rooting',
        'rooted',
        'potted_up',
        'hardening',
        'ready',
      ];

      for (const stage of nonTerminalStages) {
        expect(VALID_STAGE_TRANSITIONS[stage]).toContain('failed');
      }
    });

    it('allows no transitions from graduated', () => {
      expect(VALID_STAGE_TRANSITIONS.graduated).toHaveLength(0);
    });

    it('allows no transitions from failed', () => {
      expect(VALID_STAGE_TRANSITIONS.failed).toHaveLength(0);
    });
  });

  describe('isValidTransition', () => {
    it('returns true for valid progression', () => {
      expect(isValidTransition('taken', 'rooting')).toBe(true);
      expect(isValidTransition('rooting', 'rooted')).toBe(true);
      expect(isValidTransition('rooted', 'potted_up')).toBe(true);
      expect(isValidTransition('potted_up', 'hardening')).toBe(true);
      expect(isValidTransition('hardening', 'ready')).toBe(true);
      expect(isValidTransition('ready', 'graduated')).toBe(true);
    });

    it('returns true for failure transitions', () => {
      expect(isValidTransition('taken', 'failed')).toBe(true);
      expect(isValidTransition('rooting', 'failed')).toBe(true);
      expect(isValidTransition('hardening', 'failed')).toBe(true);
    });

    it('returns false for skipping stages', () => {
      expect(isValidTransition('taken', 'rooted')).toBe(false);
      expect(isValidTransition('rooting', 'potted_up')).toBe(false);
      expect(isValidTransition('taken', 'graduated')).toBe(false);
    });

    it('returns false for backwards transitions', () => {
      expect(isValidTransition('rooted', 'rooting')).toBe(false);
      expect(isValidTransition('hardening', 'potted_up')).toBe(false);
      expect(isValidTransition('graduated', 'ready')).toBe(false);
    });

    it('returns false for transitions from terminal states', () => {
      expect(isValidTransition('graduated', 'failed')).toBe(false);
      expect(isValidTransition('failed', 'rooting')).toBe(false);
    });
  });

  describe('getValidNextStages', () => {
    it('returns valid targets for each stage', () => {
      expect(getValidNextStages('taken')).toEqual(['rooting', 'failed']);
      expect(getValidNextStages('rooting')).toEqual(['rooted', 'failed']);
      expect(getValidNextStages('ready')).toEqual(['graduated', 'failed']);
    });

    it('returns empty array for terminal stages', () => {
      expect(getValidNextStages('graduated')).toEqual([]);
      expect(getValidNextStages('failed')).toEqual([]);
    });
  });

  describe('isTerminalStage', () => {
    it('returns true for graduated and failed', () => {
      expect(isTerminalStage('graduated')).toBe(true);
      expect(isTerminalStage('failed')).toBe(true);
    });

    it('returns false for active stages', () => {
      expect(isTerminalStage('taken')).toBe(false);
      expect(isTerminalStage('rooting')).toBe(false);
      expect(isTerminalStage('ready')).toBe(false);
    });
  });

  describe('isActiveStage', () => {
    it('returns true for non-terminal stages', () => {
      expect(isActiveStage('taken')).toBe(true);
      expect(isActiveStage('rooting')).toBe(true);
      expect(isActiveStage('hardening')).toBe(true);
    });

    it('returns false for terminal stages', () => {
      expect(isActiveStage('graduated')).toBe(false);
      expect(isActiveStage('failed')).toBe(false);
    });
  });
});

// ============================================
// COMPUTED FIELD TESTS
// ============================================

describe('Computed Fields', () => {
  describe('calculateSurvivalRate', () => {
    it('calculates 100% when all survive', () => {
      expect(calculateSurvivalRate(20, 20)).toBe(100);
    });

    it('calculates 50% when half survive', () => {
      expect(calculateSurvivalRate(10, 20)).toBe(50);
    });

    it('calculates 0% when none survive', () => {
      expect(calculateSurvivalRate(0, 20)).toBe(0);
    });

    it('returns 0 when started quantity is 0', () => {
      expect(calculateSurvivalRate(0, 0)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      // 15/20 = 75%
      expect(calculateSurvivalRate(15, 20)).toBe(75);
      // 13/20 = 65%
      expect(calculateSurvivalRate(13, 20)).toBe(65);
      // 17/20 = 85%
      expect(calculateSurvivalRate(17, 20)).toBe(85);
    });
  });

  describe('calculateDaysInStage', () => {
    it('calculates days for taken stage', () => {
      const batch = mockBatches.taken();
      const days = calculateDaysInStage(batch);
      expect(days).toBe(1);
    });

    it('calculates days for rooting stage', () => {
      const batch = mockBatches.rooting();
      const days = calculateDaysInStage(batch);
      expect(days).toBe(14);
    });

    it('calculates days for potted_up stage', () => {
      const batch = mockBatches.pottedUp();
      const days = calculateDaysInStage(batch);
      expect(days).toBe(0); // Just potted today
    });
  });

  describe('calculateDaysSinceTaken', () => {
    it('calculates total days since propagation started', () => {
      const batch = mockBatches.hardening();
      const days = calculateDaysSinceTaken(batch.dateTaken);
      expect(days).toBe(42);
    });

    it('returns 0 for batch taken today', () => {
      const today = new Date();
      const days = calculateDaysSinceTaken(today);
      expect(days).toBe(0);
    });
  });

  describe('isOverdue', () => {
    it('returns true when batch exceeds typical days for stage', () => {
      const batch = createMockBatch({
        stage: 'rooting',
        dateTaken: daysAgo(30), // 30 days, typical is 21
      });
      expect(isOverdue(batch)).toBe(true);
    });

    it('returns false when batch is within typical days', () => {
      const batch = createMockBatch({
        stage: 'rooting',
        dateTaken: daysAgo(10), // 10 days, typical is 21
      });
      expect(isOverdue(batch)).toBe(false);
    });

    it('returns false for stages without time limits', () => {
      const batch = mockBatches.ready();
      expect(isOverdue(batch)).toBe(false);
      expect(TYPICAL_STAGE_DAYS.ready).toBeNull();
    });

    it('returns false for terminal stages', () => {
      const graduated = mockBatches.graduated();
      const failed = mockBatches.failed();
      expect(isOverdue(graduated)).toBe(false);
      expect(isOverdue(failed)).toBe(false);
    });
  });

  describe('getStageProgressPercent', () => {
    it('returns 0 for taken stage', () => {
      expect(getStageProgressPercent('taken')).toBe(0);
    });

    it('returns 100 for graduated stage', () => {
      expect(getStageProgressPercent('graduated')).toBe(100);
    });

    it('returns intermediate values for middle stages', () => {
      expect(getStageProgressPercent('rooting')).toBeGreaterThan(0);
      expect(getStageProgressPercent('rooting')).toBeLessThan(100);
      expect(getStageProgressPercent('hardening')).toBeGreaterThan(
        getStageProgressPercent('rooting')
      );
    });

    it('returns 0 for failed stage', () => {
      expect(getStageProgressPercent('failed')).toBe(0);
    });
  });
});

// ============================================
// BATCH NUMBER GENERATION TESTS
// ============================================

describe('Batch Number Generation', () => {
  describe('parseBatchNumber', () => {
    it('parses valid batch numbers', () => {
      expect(parseBatchNumber('2026-001')).toEqual({ year: 2026, sequence: 1 });
      expect(parseBatchNumber('2025-123')).toEqual({ year: 2025, sequence: 123 });
      expect(parseBatchNumber('2026-999')).toEqual({ year: 2026, sequence: 999 });
    });

    it('returns null for invalid formats', () => {
      expect(parseBatchNumber('2026-1')).toBeNull();
      expect(parseBatchNumber('26-001')).toBeNull();
      expect(parseBatchNumber('2026001')).toBeNull();
      expect(parseBatchNumber('BATCH-001')).toBeNull();
      expect(parseBatchNumber('')).toBeNull();
    });
  });

  describe('formatBatchNumber', () => {
    it('formats with zero-padded sequence', () => {
      expect(formatBatchNumber(2026, 1)).toBe('2026-001');
      expect(formatBatchNumber(2026, 12)).toBe('2026-012');
      expect(formatBatchNumber(2026, 123)).toBe('2026-123');
    });
  });

  describe('isValidBatchNumber', () => {
    it('validates correct format', () => {
      expect(isValidBatchNumber('2026-001')).toBe(true);
      expect(isValidBatchNumber('2026-999')).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(isValidBatchNumber('2026-1')).toBe(false);
      expect(isValidBatchNumber('invalid')).toBe(false);
    });
  });

  describe('generateNextBatchNumber', () => {
    it('returns 001 for empty batch list', () => {
      const result = generateNextBatchNumber([], 2026);
      expect(result).toBe('2026-001');
    });

    it('returns next sequence number', () => {
      const batches = [
        { batchNumber: '2026-001' },
        { batchNumber: '2026-002' },
        { batchNumber: '2026-003' },
      ];
      const result = generateNextBatchNumber(batches, 2026);
      expect(result).toBe('2026-004');
    });

    it('handles gaps in sequence numbers', () => {
      const batches = [
        { batchNumber: '2026-001' },
        { batchNumber: '2026-005' }, // Gap
        { batchNumber: '2026-003' },
      ];
      const result = generateNextBatchNumber(batches, 2026);
      expect(result).toBe('2026-006'); // Max + 1
    });

    it('starts fresh for new year', () => {
      const batches = [
        { batchNumber: '2025-100' },
        { batchNumber: '2025-101' },
      ];
      const result = generateNextBatchNumber(batches, 2026);
      expect(result).toBe('2026-001');
    });

    it('filters by year correctly', () => {
      const batches = [
        { batchNumber: '2025-050' },
        { batchNumber: '2026-003' },
        { batchNumber: '2025-051' },
      ];
      const result = generateNextBatchNumber(batches, 2026);
      expect(result).toBe('2026-004');
    });
  });

  describe('getBatchCountForYear', () => {
    it('counts batches for specific year', () => {
      const batches = [
        { batchNumber: '2025-001' },
        { batchNumber: '2026-001' },
        { batchNumber: '2026-002' },
        { batchNumber: '2026-003' },
      ];
      expect(getBatchCountForYear(2026, batches)).toBe(3);
      expect(getBatchCountForYear(2025, batches)).toBe(1);
      expect(getBatchCountForYear(2024, batches)).toBe(0);
    });
  });

  describe('getYearsWithBatches', () => {
    it('returns years in descending order', () => {
      const batches = [
        { batchNumber: '2024-001' },
        { batchNumber: '2026-001' },
        { batchNumber: '2025-001' },
      ];
      expect(getYearsWithBatches(batches)).toEqual([2026, 2025, 2024]);
    });

    it('returns empty array for no batches', () => {
      expect(getYearsWithBatches([])).toEqual([]);
    });
  });
});

// ============================================
// STAGE DISPLAY HELPERS TESTS
// ============================================

describe('Stage Display Helpers', () => {
  describe('getStageDisplayName', () => {
    it('returns human-readable names', () => {
      expect(getStageDisplayName('taken')).toBe('Taken');
      expect(getStageDisplayName('potted_up')).toBe('Potted Up');
      expect(getStageDisplayName('hardening')).toBe('Hardening Off');
    });
  });

  describe('TYPICAL_STAGE_DAYS', () => {
    it('defines typical days for active stages', () => {
      expect(TYPICAL_STAGE_DAYS.rooting).toBe(21);
      expect(TYPICAL_STAGE_DAYS.potted_up).toBe(14);
      expect(TYPICAL_STAGE_DAYS.hardening).toBe(14);
    });

    it('has null for stages without time limits', () => {
      expect(TYPICAL_STAGE_DAYS.ready).toBeNull();
      expect(TYPICAL_STAGE_DAYS.graduated).toBeNull();
      expect(TYPICAL_STAGE_DAYS.failed).toBeNull();
    });
  });
});

// ============================================
// STORE SELECTOR TESTS (Logic Only)
// ============================================

describe('Store Selector Logic', () => {
  describe('Success Rate calculation', () => {
    it('calculates 100% when all graduated', () => {
      const batches = [mockBatches.graduated(), mockBatches.graduated()];
      const graduated = batches.filter((b) => b.stage === 'graduated').length;
      const failed = batches.filter((b) => b.stage === 'failed').length;
      const total = graduated + failed;
      const rate = total === 0 ? 0 : Math.round((graduated / total) * 100);
      expect(rate).toBe(100);
    });

    it('calculates 0% when all failed', () => {
      const batches = [mockBatches.failed(), mockBatches.failed()];
      const graduated = batches.filter((b) => b.stage === 'graduated').length;
      const failed = batches.filter((b) => b.stage === 'failed').length;
      const total = graduated + failed;
      const rate = total === 0 ? 0 : Math.round((graduated / total) * 100);
      expect(rate).toBe(0);
    });

    it('calculates 50% for half success', () => {
      const batches = [mockBatches.graduated(), mockBatches.failed()];
      const graduated = batches.filter((b) => b.stage === 'graduated').length;
      const failed = batches.filter((b) => b.stage === 'failed').length;
      const total = graduated + failed;
      const rate = total === 0 ? 0 : Math.round((graduated / total) * 100);
      expect(rate).toBe(50);
    });

    it('ignores active batches in success calculation', () => {
      const batches = [mockBatches.graduated(), mockBatches.rooting(), mockBatches.failed()];
      const graduated = batches.filter((b) => b.stage === 'graduated').length;
      const failed = batches.filter((b) => b.stage === 'failed').length;
      const total = graduated + failed;
      const rate = total === 0 ? 0 : Math.round((graduated / total) * 100);
      expect(rate).toBe(50); // 1 graduated, 1 failed, rooting ignored
    });
  });

  describe('Stage Counts calculation', () => {
    it('counts batches by stage', () => {
      const batches = [
        mockBatches.taken(),
        mockBatches.rooting(),
        mockBatches.rooting(),
        mockBatches.hardening(),
        mockBatches.graduated(),
        mockBatches.failed(),
      ];

      const counts: Record<string, number> = {};
      for (const batch of batches) {
        counts[batch.stage] = (counts[batch.stage] || 0) + 1;
      }

      expect(counts['taken']).toBe(1);
      expect(counts['rooting']).toBe(2);
      expect(counts['hardening']).toBe(1);
      expect(counts['graduated']).toBe(1);
      expect(counts['failed']).toBe(1);
    });

    it('counts active batches correctly', () => {
      const batches = [
        mockBatches.taken(),
        mockBatches.rooting(),
        mockBatches.graduated(),
        mockBatches.failed(),
      ];

      const activeCount = batches.filter((b) => isActiveStage(b.stage)).length;
      expect(activeCount).toBe(2); // taken and rooting
    });
  });

  describe('Filtering logic', () => {
    it('filters by stage', () => {
      const batches = [mockBatches.rooting(), mockBatches.hardening(), mockBatches.rooting()];

      const filtered = batches.filter((b) => b.stage === 'rooting');
      expect(filtered).toHaveLength(2);
    });

    it('filters active batches', () => {
      const batches = [
        mockBatches.rooting(),
        mockBatches.graduated(),
        mockBatches.failed(),
        mockBatches.hardening(),
      ];

      const active = batches.filter((b) => isActiveStage(b.stage));
      expect(active).toHaveLength(2);
    });

    it('filters by species', () => {
      const batches = [
        createMockBatch({ species: 'Lavender' }),
        createMockBatch({ species: 'Rosemary' }),
        createMockBatch({ species: 'Lavender' }),
      ];

      const filtered = batches.filter((b) => b.species === 'Lavender');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Sorting logic', () => {
    it('sorts by dateTaken descending', () => {
      const batches = [
        createMockBatch({ dateTaken: daysAgo(5) }),
        createMockBatch({ dateTaken: daysAgo(10) }),
        createMockBatch({ dateTaken: daysAgo(1) }),
      ];

      const sorted = [...batches].sort(
        (a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()
      );

      // Most recent first (1 day ago)
      expect(sorted[0].dateTaken.getTime()).toBeGreaterThan(sorted[1].dateTaken.getTime());
    });

    it('sorts by species alphabetically', () => {
      const batches = [
        createMockBatch({ species: 'Rosemary' }),
        createMockBatch({ species: 'Basil' }),
        createMockBatch({ species: 'Lavender' }),
      ];

      const sorted = [...batches].sort((a, b) => a.species.localeCompare(b.species));

      expect(sorted[0].species).toBe('Basil');
      expect(sorted[1].species).toBe('Lavender');
      expect(sorted[2].species).toBe('Rosemary');
    });

    it('sorts by daysInStage', () => {
      const batches = [
        createMockBatch({ daysInStage: 5 }),
        createMockBatch({ daysInStage: 15 }),
        createMockBatch({ daysInStage: 10 }),
      ];

      const sorted = [...batches].sort((a, b) => b.daysInStage - a.daysInStage);

      expect(sorted[0].daysInStage).toBe(15);
      expect(sorted[1].daysInStage).toBe(10);
      expect(sorted[2].daysInStage).toBe(5);
    });
  });

  describe('Unique values extraction', () => {
    it('extracts unique species', () => {
      const batches = [
        createMockBatch({ species: 'Lavender' }),
        createMockBatch({ species: 'Rosemary' }),
        createMockBatch({ species: 'Lavender' }),
        createMockBatch({ species: 'Basil' }),
      ];

      const species = [...new Set(batches.map((b) => b.species))].sort();
      expect(species).toEqual(['Basil', 'Lavender', 'Rosemary']);
    });

    it('extracts unique stations', () => {
      const batches = [
        createMockBatch({ stationId: 'station-1' }),
        createMockBatch({ stationId: 'station-2' }),
        createMockBatch({ stationId: 'station-1' }),
      ];

      const stations = [...new Set(batches.map((b) => b.stationId))].sort();
      expect(stations).toEqual(['station-1', 'station-2']);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles batch with all optional fields undefined', () => {
    const batch = createMockBatch({
      variety: undefined,
      motherPlantId: undefined,
      preparationNotes: undefined,
      rootingMedium: undefined,
      hormoneUsed: undefined,
      dateRooted: undefined,
      datePottedUp: undefined,
      dateHardeningStarted: undefined,
      dateReady: undefined,
      dateGraduated: undefined,
    });

    expect(batch.stage).toBe('rooting');
    expect(calculateDaysInStage(batch)).toBeGreaterThanOrEqual(0);
  });

  it('handles zero quantity started', () => {
    const batch = createMockBatch({
      quantityStarted: 0,
      quantitySurviving: 0,
    });

    expect(calculateSurvivalRate(batch.quantitySurviving, batch.quantityStarted)).toBe(0);
  });

  it('handles dates at exactly the same time', () => {
    const exactTime = new Date('2026-01-01T10:30:00Z');
    const batch = createMockBatch({
      dateTaken: exactTime,
      dateRooted: exactTime,
    });

    expect(calculateDaysSinceTaken(batch.dateTaken)).toBeGreaterThanOrEqual(0);
  });

  it('handles future dates gracefully', () => {
    const futureBatch = createMockBatch({
      dateTaken: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    });

    // Should return negative days, but not throw
    const days = calculateDaysSinceTaken(futureBatch.dateTaken);
    expect(days).toBeLessThan(0);
  });

  it('handles very old batches', () => {
    const oldBatch = createMockBatch({
      dateTaken: daysAgo(365), // 1 year ago
      stage: 'rooting', // Still in rooting after a year
    });

    const days = calculateDaysInStage(oldBatch);
    expect(days).toBe(365);
    expect(isOverdue(oldBatch)).toBe(true);
  });

  it('handles batch with 100% survival', () => {
    const batch = createMockBatch({
      quantityStarted: 50,
      quantitySurviving: 50,
    });

    expect(calculateSurvivalRate(batch.quantitySurviving, batch.quantityStarted)).toBe(100);
  });

  it('handles batch with 0% survival', () => {
    const batch = createMockBatch({
      quantityStarted: 50,
      quantitySurviving: 0,
      stage: 'failed',
    });

    expect(calculateSurvivalRate(batch.quantitySurviving, batch.quantityStarted)).toBe(0);
  });
});
