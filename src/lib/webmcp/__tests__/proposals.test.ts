/**
 * Tests for proposal state transitions.
 *
 * The central claim of this integration is that an agent stages and only a human commits.
 * These pin that: approving one option must schedule exactly that option and discard the
 * rest, and nothing may reach 'planned' without an explicit approval.
 *
 * Dexie is mocked because the project has no IndexedDB implementation under test; the
 * logic being verified is the transition rules, not Dexie itself.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GrowPlannedPlanting } from '@/lib/db';

/**
 * In-memory stand-in for the plannedPlantings table.
 *
 * Rows are given NUMERIC ids, matching what Dexie actually does with a `++id` key -
 * even though GrowPlannedPlanting types `id` as a string. A mock that handed out string
 * ids would hide the exact class of bug this file exists to catch: looking a row up by a
 * stringified key matches nothing, and the write is silently lost.
 */
let rows: GrowPlannedPlanting[] = [];
let nextId = 1;

function matches(index: string, value: unknown) {
  return (r: GrowPlannedPlanting) => {
    if (index === 'proposalId') return r.proposalId === value;
    if (index === 'status') return r.status === value;
    if (index === '[proposalId+status]') {
      const [pid, status] = value as [string, string];
      return r.proposalId === pid && r.status === status;
    }
    return false;
  };
}

/** Mirrors Dexie's Collection: filter() narrows, modify() writes and returns a count. */
function collection(predicate: (r: GrowPlannedPlanting) => boolean) {
  return {
    toArray: async () => rows.filter(predicate),
    filter: (extra: (r: GrowPlannedPlanting) => boolean) =>
      collection((r) => predicate(r) && extra(r)),
    modify: async (changes: Partial<GrowPlannedPlanting>) => {
      const hit = rows.filter(predicate);
      hit.forEach((r) => Object.assign(r, changes));
      return hit.length;
    },
  };
}

vi.mock('@/lib/db', () => ({
  growDb: {
    plannedPlantings: {
      bulkAdd: vi.fn(async (added: GrowPlannedPlanting[]) => {
        rows.push(
          ...added.map((r) => ({ ...r, id: nextId++ as unknown as string })),
        );
      }),
      where: (index: string) => ({
        equals: (value: unknown) => collection(matches(index, value)),
      }),
    },
  },
}));

const { stageProposal, approveProposalOption, rejectProposal, getProposal } = await import(
  '../proposals'
);

function option(rank: number, sowDates: string[]) {
  return {
    rank,
    strategy: 'tight' as const,
    label: `Option ${rank}`,
    rationale: '',
    plantings: sowDates.map((d) => ({
      variety: 'Basil',
      plannedSowDate: d,
      targetHarvestDate: '2026-10-20',
      quantity: 1,
    })),
    coverage: {
      harvestsPlanned: sowDates.length,
      firstHarvest: null,
      lastHarvest: null,
      effectiveCadenceDays: 7,
      gaps: [],
      harvestsOutsideWindow: [],
      windowStartCovered: true,
    },
    peakTrayUsage: 1,
    withinTrayBudget: true,
    totalTrays: sowDates.length,
  };
}

const twoOptions = [
  option(1, ['2026-10-01', '2026-10-08']),
  option(2, ['2026-10-01', '2026-10-11']),
];

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe('key handling', () => {
  it('writes actually land on rows with numeric ids', async () => {
    // Regression: approve and reject looked rows up by String(row.id). Dexie keys a
    // `++id` table with numbers, so the lookup matched nothing, both calls succeeded
    // silently, and the UI button appeared to do nothing at all.
    const id = await stageProposal(twoOptions, 'site-1', 'note');
    expect(rows.every((r) => typeof r.id === 'number')).toBe(true);

    await rejectProposal(id);

    expect(rows.every((r) => r.status === 'cancelled')).toBe(true);
  });
});

describe('stageProposal', () => {
  it('writes every option, not just the top-ranked one', async () => {
    await stageProposal(twoOptions, 'site-1', 'note');

    // The grower compares alternatives in their own calendar rather than taking the
    // agent's ranking on trust.
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((r) => r.proposalOption))).toEqual(new Set([1, 2]));
  });

  it('stages everything as proposed, never planned', async () => {
    await stageProposal(twoOptions, 'site-1', 'note');

    expect(rows.every((r) => r.status === 'proposed')).toBe(true);
    expect(rows.some((r) => r.status === 'planned')).toBe(false);
  });

  it('records agent provenance', async () => {
    await stageProposal(twoOptions, 'site-1', 'note');
    expect(rows.every((r) => r.proposedBy === 'agent')).toBe(true);
  });

  it('groups every row under one proposal id', async () => {
    const id = await stageProposal(twoOptions, 'site-1', 'note');
    expect(rows.every((r) => r.proposalId === id)).toBe(true);
  });

  it('gives separate proposals separate ids', async () => {
    const a = await stageProposal(twoOptions, 'site-1', 'note');
    const b = await stageProposal(twoOptions, 'site-1', 'note');
    expect(a).not.toBe(b);
  });

  it('carries the grower note and any adjustment into the row', async () => {
    await stageProposal(
      [
        {
          ...option(1, ['2026-10-01']),
          plantings: [
            {
              variety: 'Basil',
              plannedSowDate: '2026-10-01',
              targetHarvestDate: '2026-10-20',
              quantity: 1,
              adjustment: 'sown 4 days late to clear away',
            },
          ],
        },
      ],
      'site-1',
      'north bench frosts early',
    );

    expect(rows[0].notes).toContain('north bench frosts early');
    expect(rows[0].notes).toContain('sown 4 days late');
  });
});

describe('approveProposalOption', () => {
  it('schedules the chosen option and discards the rest', async () => {
    const id = await stageProposal(twoOptions, 'site-1', 'note');

    const result = await approveProposalOption(id, 2);

    expect(result).toEqual({ approved: 2, discarded: 2 });
    expect(rows.filter((r) => r.status === 'planned').every((r) => r.proposalOption === 2)).toBe(true);
    expect(rows.filter((r) => r.status === 'cancelled').every((r) => r.proposalOption === 1)).toBe(true);
  });

  it('cancels rather than deletes the options not taken', async () => {
    const id = await stageProposal(twoOptions, 'site-1', 'note');
    await approveProposalOption(id, 1);

    // What the grower turned down is part of how the plan was arrived at.
    expect(rows).toHaveLength(4);
  });

  it('leaves nothing still awaiting a decision', async () => {
    const id = await stageProposal(twoOptions, 'site-1', 'note');
    await approveProposalOption(id, 1);

    expect(await getProposal(id)).toHaveLength(0);
  });

  it('does not touch a different proposal', async () => {
    const first = await stageProposal(twoOptions, 'site-1', 'note');
    const second = await stageProposal(twoOptions, 'site-1', 'note');

    await approveProposalOption(first, 1);

    expect(rows.filter((r) => r.proposalId === second).every((r) => r.status === 'proposed')).toBe(true);
  });

  it('discards everything when the chosen option does not exist', async () => {
    const id = await stageProposal(twoOptions, 'site-1', 'note');

    const result = await approveProposalOption(id, 99);

    // Nothing may be scheduled that the grower did not actually pick.
    expect(result.approved).toBe(0);
    expect(rows.some((r) => r.status === 'planned')).toBe(false);
  });
});

describe('rejectProposal', () => {
  it('cancels every option', async () => {
    const id = await stageProposal(twoOptions, 'site-1', 'note');

    const count = await rejectProposal(id);

    expect(count).toBe(4);
    expect(rows.every((r) => r.status === 'cancelled')).toBe(true);
    expect(rows.some((r) => r.status === 'planned')).toBe(false);
  });
});
