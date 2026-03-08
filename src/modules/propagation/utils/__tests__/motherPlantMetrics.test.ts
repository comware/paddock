/**
 * motherPlantMetrics - Unit Tests
 *
 * Tests mother plant productivity calculations including
 * batch queries, success rates, method breakdowns, and display helpers.
 * Mocks propDb for database isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PropBatch } from '../../types';

const { mockBatchesTable } = vi.hoisted(() => {
  const fn = vi.fn;
  const table = {
    where: fn().mockReturnThis(),
    equals: fn().mockReturnThis(),
    toArray: fn().mockResolvedValue([]),
    count: fn().mockResolvedValue(0),
  };
  return { mockBatchesTable: table };
});

vi.mock('@/lib/db', () => ({
  propDb: {
    batches: mockBatchesTable,
  },
}));

import {
  getBatchesByMotherPlant,
  getTotalBatchesTaken,
  getSuccessRate,
  getMotherPlantMetrics,
  formatSeason,
  formatSuccessRate,
  getProductivityLevel,
  getProductivityColor,
} from '../motherPlantMetrics';

// ============================================
// HELPERS
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  const now = new Date();
  return {
    id: `batch-${Math.random().toString(36).slice(2, 9)}`,
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    motherPlantId: 'mother-1',
    species: 'Lavender',
    method: 'cutting_softwood',
    quantityStarted: 10,
    quantitySurviving: 8,
    dateTaken: daysAgo(30),
    stage: 'rooting',
    daysInStage: 14,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================
// BATCH QUERIES
// ============================================

describe('getBatchesByMotherPlant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchesTable.where.mockReturnThis();
    mockBatchesTable.equals.mockReturnThis();
  });

  it('returns batches from db query', async () => {
    const mockBatches = [createBatch(), createBatch()];
    mockBatchesTable.toArray.mockResolvedValueOnce(mockBatches);
    const result = await getBatchesByMotherPlant('mother-1');
    expect(result).toHaveLength(2);
    expect(mockBatchesTable.where).toHaveBeenCalledWith('motherPlantId');
    expect(mockBatchesTable.equals).toHaveBeenCalledWith('mother-1');
  });

  it('returns empty array when no batches exist', async () => {
    mockBatchesTable.toArray.mockResolvedValueOnce([]);
    const result = await getBatchesByMotherPlant('mother-none');
    expect(result).toHaveLength(0);
  });
});

describe('getTotalBatchesTaken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchesTable.where.mockReturnThis();
    mockBatchesTable.equals.mockReturnThis();
  });

  it('returns count from db', async () => {
    mockBatchesTable.count.mockResolvedValueOnce(5);
    const result = await getTotalBatchesTaken('mother-1');
    expect(result).toBe(5);
  });
});

// ============================================
// SUCCESS RATE
// ============================================

describe('getSuccessRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchesTable.where.mockReturnThis();
    mockBatchesTable.equals.mockReturnThis();
  });

  it('returns 0 when no completed batches', async () => {
    mockBatchesTable.toArray.mockResolvedValueOnce([
      createBatch({ stage: 'rooting' }),
    ]);
    const result = await getSuccessRate('mother-1');
    expect(result).toBe(0);
  });

  it('calculates rate from graduated and failed batches', async () => {
    mockBatchesTable.toArray.mockResolvedValueOnce([
      createBatch({ stage: 'graduated' }),
      createBatch({ stage: 'graduated' }),
      createBatch({ stage: 'failed' }),
      createBatch({ stage: 'rooting' }),
    ]);
    const result = await getSuccessRate('mother-1');
    expect(result).toBe(67);
  });

  it('returns 0 when all batches failed', async () => {
    mockBatchesTable.toArray.mockResolvedValueOnce([
      createBatch({ stage: 'failed' }),
      createBatch({ stage: 'failed' }),
    ]);
    const result = await getSuccessRate('mother-1');
    expect(result).toBe(0);
  });
});

// ============================================
// COMPREHENSIVE METRICS
// ============================================

describe('getMotherPlantMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchesTable.where.mockReturnThis();
    mockBatchesTable.equals.mockReturnThis();
  });

  it('returns zeroed metrics for no batches', async () => {
    mockBatchesTable.toArray.mockResolvedValueOnce([]);
    const metrics = await getMotherPlantMetrics('mother-1');
    expect(metrics.totalBatches).toBe(0);
    expect(metrics.totalPropagules).toBe(0);
    expect(metrics.totalGraduated).toBe(0);
    expect(metrics.successRate).toBe(0);
  });

  it('calculates correct totals with mixed batches', async () => {
    mockBatchesTable.toArray.mockResolvedValueOnce([
      createBatch({ stage: 'graduated', quantityStarted: 10, quantitySurviving: 8 }),
      createBatch({ stage: 'failed', quantityStarted: 5, quantitySurviving: 0 }),
      createBatch({ stage: 'rooting', quantityStarted: 15, quantitySurviving: 12 }),
    ]);
    const metrics = await getMotherPlantMetrics('mother-1');
    expect(metrics.totalBatches).toBe(3);
    expect(metrics.totalPropagules).toBe(30);
    expect(metrics.totalGraduated).toBe(8);
    expect(metrics.successRate).toBe(50);
  });
});

// ============================================
// DISPLAY HELPERS
// ============================================

describe('formatSeason', () => {
  it('capitalizes first letter', () => {
    expect(formatSeason('summer')).toBe('Summer');
    expect(formatSeason('autumn')).toBe('Autumn');
  });
});

describe('formatSuccessRate', () => {
  it('returns "No data" for 0', () => {
    expect(formatSuccessRate(0)).toBe('No data');
  });

  it('formats with percent sign', () => {
    expect(formatSuccessRate(75)).toBe('75%');
  });
});

describe('getProductivityLevel', () => {
  it('returns insufficient_data for few batches', () => {
    expect(getProductivityLevel(100, 2)).toBe('insufficient_data');
  });

  it('returns excellent for high rates', () => {
    expect(getProductivityLevel(85, 5)).toBe('excellent');
  });

  it('returns good for moderate rates', () => {
    expect(getProductivityLevel(65, 5)).toBe('good');
  });

  it('returns fair for lower rates', () => {
    expect(getProductivityLevel(45, 5)).toBe('fair');
  });

  it('returns poor for low rates', () => {
    expect(getProductivityLevel(30, 5)).toBe('poor');
  });
});

describe('getProductivityColor', () => {
  it('returns a Tailwind color class for each level', () => {
    expect(getProductivityColor('excellent')).toContain('text-');
    expect(getProductivityColor('good')).toContain('text-');
    expect(getProductivityColor('poor')).toContain('text-');
    expect(getProductivityColor('insufficient_data')).toContain('text-');
  });
});
