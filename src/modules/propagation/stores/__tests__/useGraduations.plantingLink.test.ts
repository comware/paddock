/**
 * Graduation -> planting link persistence.
 *
 * `sold` has always pointed at something structured via saleReferenceId while
 * `planted_garden` pointed at free text. plantingId closes that gap for a tracked
 * vegetable planting, while plantedLocation stays for a destination that isn't one -
 * "mum's garden", "the front verge". Both fields coexist on the same row.
 *
 * Every assertion reads back out of propDb.graduations rather than store state - see
 * useSupplies.persistence.test.ts for why that discipline matters in this codebase.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, propDb } from '@/lib/db';
import { useGraduations } from '../useGraduations';
import { DEFAULT_FILTERS } from '../useGraduations.types';

describe('graduation plantingId persistence', () => {
  beforeEach(async () => {
    await db.open();
    await propDb.graduations.clear();
    useGraduations.setState({
      rawGraduations: [],
      graduations: [],
      graduationsByBatch: new Map(),
      isLoading: false,
      error: null,
      filters: { ...DEFAULT_FILTERS },
    });
  });

  it('persists plantingId for a planted_garden graduation', async () => {
    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 4,
      outcome: 'planted_garden',
      plantingId: 'planting-abc',
    });

    const rows = await propDb.graduations.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].plantingId).toBe('planting-abc');
    // A foreign key is stored as a string in application memory and IndexedDB - it is
    // never passed through toKey (see src/lib/db/keys.ts and the task's convention note).
    expect(typeof rows[0].plantingId).toBe('string');
  });

  it('still persists plantedLocation alone for an untracked destination', async () => {
    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 2,
      outcome: 'planted_garden',
      plantedLocation: "Mum's garden",
    });

    const rows = await propDb.graduations.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].plantedLocation).toBe("Mum's garden");
    expect(rows[0].plantingId).toBeUndefined();
  });

  it('persists both a tracked planting and a note about where in it', async () => {
    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 3,
      outcome: 'planted_garden',
      plantingId: 'planting-xyz',
      plantedLocation: 'North end of the bed',
    });

    const rows = await propDb.graduations.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].plantingId).toBe('planting-xyz');
    expect(rows[0].plantedLocation).toBe('North end of the bed');
  });
});
