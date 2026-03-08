/**
 * exporters - Unit Tests
 *
 * Tests propagation module export/import functions:
 * JSON backup structure, import validation, CSV formatting,
 * and database statistics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPropDb, mockDb } = vi.hoisted(() => {
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
  propDb: mockPropDb,
}));

import {
  exportPropagationAsJSON,
  importPropagationFromJSON,
  getPropagationStats,
} from '../exporters';
import type { PropagationBackup } from '../exporters';

// ============================================
// JSON EXPORT
// ============================================

describe('exportPropagationAsJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid JSON string', async () => {
    const result = await exportPropagationAsJSON();
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('has correct module and version', async () => {
    const result = JSON.parse(await exportPropagationAsJSON());
    expect(result.version).toBe(1);
    expect(result.module).toBe('propagation');
    expect(result.exportedAt).toBeTruthy();
  });

  it('data section has all 10 tables', async () => {
    const result = JSON.parse(await exportPropagationAsJSON());
    const expectedTables = [
      'motherPlants', 'stations', 'stationLogs', 'batches',
      'propagules', 'stageTransitions', 'graduations',
      'supplies', 'batchCosts', 'speciesConfigs',
    ];
    for (const table of expectedTables) {
      expect(result.data).toHaveProperty(table);
    }
  });

  it('includes data from db queries', async () => {
    mockPropDb.batches.toArray.mockResolvedValueOnce([
      { id: 'b1', batchNumber: '2026-001', species: 'Lavender' },
    ]);
    const result = JSON.parse(await exportPropagationAsJSON());
    expect(result.data.batches).toHaveLength(1);
    expect(result.data.batches[0].batchNumber).toBe('2026-001');
  });
});

// ============================================
// JSON IMPORT
// ============================================

describe('importPropagationFromJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid JSON', async () => {
    const result = await importPropagationFromJSON('not json');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects non-propagation backup', async () => {
    const result = await importPropagationFromJSON(JSON.stringify({
      version: 1,
      module: 'other',
      data: {},
    }));
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects unsupported version', async () => {
    const result = await importPropagationFromJSON(JSON.stringify({
      version: 99,
      module: 'propagation',
      data: {},
    }));
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('imports valid backup successfully', async () => {
    const backup: PropagationBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      module: 'propagation',
      data: {
        motherPlants: [],
        stations: [{ id: 's1', name: 'Station A' }] as any[],
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
    const result = await importPropagationFromJSON(JSON.stringify(backup));
    expect(result.errors).toHaveLength(0);
    expect(result.imported.stations).toBe(1);
  });

  it('reports correct import counts', async () => {
    const backup: PropagationBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      module: 'propagation',
      data: {
        motherPlants: [{ id: 'm1' }] as any[],
        stations: [{ id: 's1' }, { id: 's2' }] as any[],
        stationLogs: [],
        batches: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] as any[],
        propagules: [],
        stageTransitions: [],
        graduations: [],
        supplies: [],
        batchCosts: [],
        speciesConfigs: [],
      },
    };
    const result = await importPropagationFromJSON(JSON.stringify(backup));
    expect(result.imported.motherPlants).toBe(1);
    expect(result.imported.stations).toBe(2);
    expect(result.imported.batches).toBe(3);
  });
});

// ============================================
// STATISTICS
// ============================================

describe('getPropagationStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns counts for all tables', async () => {
    mockPropDb.batches.count.mockResolvedValueOnce(10);
    mockPropDb.motherPlants.count.mockResolvedValueOnce(3);
    const stats = await getPropagationStats();
    expect(stats.batches).toBe(10);
    expect(stats.motherPlants).toBe(3);
    expect(stats).toHaveProperty('stations');
    expect(stats).toHaveProperty('supplies');
  });
});
