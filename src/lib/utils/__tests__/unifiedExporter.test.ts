/**
 * unifiedExporter - Unit Tests
 *
 * Tests the unified data export/import system for Paddock.
 * Mocks Dexie database calls to test export structure,
 * import validation, and database statistics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGrowDb, mockPropDb, mockDb } = vi.hoisted(() => {
  const fn = vi.fn;

  function mkTable() {
    return {
      toArray: fn().mockResolvedValue([]),
      count: fn().mockResolvedValue(0),
      clear: fn().mockResolvedValue(undefined),
      bulkAdd: fn().mockResolvedValue(undefined),
    };
  }

  return {
    mockGrowDb: {
      trays: mkTable(), observations: mkTable(), timeEntries: mkTable(),
      varietyConfigs: mkTable(), experiments: mkTable(), decisions: mkTable(),
    },
    mockPropDb: {
      motherPlants: mkTable(), stations: mkTable(), stationLogs: mkTable(),
      batches: mkTable(), propagules: mkTable(), stageTransitions: mkTable(),
      graduations: mkTable(), supplies: mkTable(), batchCosts: mkTable(),
      speciesConfigs: mkTable(),
    },
    mockDb: {
      transaction: fn().mockImplementation(async (_mode: string, _tables: unknown, f: () => Promise<void>) => f()),
      tables: [],
    },
  };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
  growDb: mockGrowDb,
  propDb: mockPropDb,
}));

import {
  exportUnifiedBackup,
  importUnifiedBackup,
  getUnifiedDatabaseStats,
} from '../unifiedExporter';
import type { UnifiedPaddockBackup } from '../unifiedExporter';

// ============================================
// EXPORT
// ============================================

describe('exportUnifiedBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid JSON string', async () => {
    const result = await exportUnifiedBackup();
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('has expected top-level keys', async () => {
    const result = JSON.parse(await exportUnifiedBackup());
    expect(result).toHaveProperty('version', 1);
    expect(result).toHaveProperty('exportedAt');
    expect(result).toHaveProperty('modules');
    expect(result).toHaveProperty('grow');
    expect(result).toHaveProperty('propagation');
  });

  it('modules array contains grow and propagation', async () => {
    const result = JSON.parse(await exportUnifiedBackup());
    expect(result.modules).toEqual(['grow', 'propagation']);
  });

  it('grow section has all expected tables', async () => {
    const result = JSON.parse(await exportUnifiedBackup());
    expect(result.grow).toHaveProperty('trays');
    expect(result.grow).toHaveProperty('observations');
    expect(result.grow).toHaveProperty('timeEntries');
    expect(result.grow).toHaveProperty('varietyConfigs');
    expect(result.grow).toHaveProperty('experiments');
    expect(result.grow).toHaveProperty('decisions');
  });

  it('propagation section has all expected tables', async () => {
    const result = JSON.parse(await exportUnifiedBackup());
    expect(result.propagation).toHaveProperty('motherPlants');
    expect(result.propagation).toHaveProperty('stations');
    expect(result.propagation).toHaveProperty('batches');
    expect(result.propagation).toHaveProperty('propagules');
    expect(result.propagation).toHaveProperty('supplies');
    expect(result.propagation).toHaveProperty('batchCosts');
    expect(result.propagation).toHaveProperty('speciesConfigs');
  });

  it('includes data from db calls', async () => {
    mockGrowDb.trays.toArray.mockResolvedValueOnce([{ id: '1', name: 'Test Tray' }]);
    const result = JSON.parse(await exportUnifiedBackup());
    expect(result.grow.trays).toHaveLength(1);
    expect(result.grow.trays[0].name).toBe('Test Tray');
  });
});

// ============================================
// IMPORT
// ============================================

describe('importUnifiedBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid JSON', async () => {
    const result = await importUnifiedBackup('not json');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects backup missing modules field', async () => {
    const result = await importUnifiedBackup(JSON.stringify({ version: 1, grow: {}, propagation: {} }));
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects backup missing required modules', async () => {
    const result = await importUnifiedBackup(JSON.stringify({ version: 1, modules: ['grow'] }));
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('imports grow data successfully', async () => {
    const backup: UnifiedPaddockBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      modules: ['grow', 'propagation'],
      grow: {
        trays: [{ id: '1', name: 'Tray 1' }] as any[],
        observations: [],
        timeEntries: [],
        varietyConfigs: [],
        experiments: [],
        decisions: [],
      },
      propagation: {
        motherPlants: [],
        stations: [],
        stationLogs: [],
        batches: [],
        propagules: [],
        stageTransitions: [],
        graduations: [],
        supplies: [],
        batchCosts: [],
        speciesConfigs: [],
      },
    };
    const result = await importUnifiedBackup(JSON.stringify(backup));
    expect(result.errors).toHaveLength(0);
    expect(result.imported.trays).toBe(1);
  });

  it('imports propagation data successfully', async () => {
    const backup: UnifiedPaddockBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      modules: ['grow', 'propagation'],
      grow: {
        trays: [],
        observations: [],
        timeEntries: [],
        varietyConfigs: [],
        experiments: [],
        decisions: [],
      },
      propagation: {
        motherPlants: [],
        stations: [{ id: '1', name: 'Station A' }] as any[],
        stationLogs: [],
        batches: [],
        propagules: [],
        stageTransitions: [],
        graduations: [],
        supplies: [],
        batchCosts: [],
        speciesConfigs: [],
      },
    };
    const result = await importUnifiedBackup(JSON.stringify(backup));
    expect(result.errors).toHaveLength(0);
    expect(result.imported.stations).toBe(1);
  });
});

// ============================================
// STATISTICS
// ============================================

describe('getUnifiedDatabaseStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns grow and propagation sections', async () => {
    const stats = await getUnifiedDatabaseStats();
    expect(stats).toHaveProperty('grow');
    expect(stats).toHaveProperty('propagation');
    expect(stats).toHaveProperty('total');
  });

  it('calculates total correctly', async () => {
    mockGrowDb.trays.count.mockResolvedValueOnce(5);
    mockPropDb.batches.count.mockResolvedValueOnce(3);
    const stats = await getUnifiedDatabaseStats();
    expect(stats.total).toBe(8);
  });
});
