/**
 * Tests for growing-context aggregation.
 *
 * These matter more than typical unit tests: `avgDaysToHarvest` is the number the agent
 * uses instead of the seed packet's, and it is the central claim of the WebMCP
 * integration. If it is wrong, the advice is wrong.
 */

import { describe, it, expect } from 'vitest';
import { aggregateHistory } from '../context';
import type { GrowTray } from '@/lib/db';

const day = 86_400_000;

function tray(overrides: Partial<GrowTray> = {}): GrowTray {
  const dateSown = overrides.dateSown ?? new Date('2026-01-01');
  return {
    trayNumber: 1,
    variety: 'Basil',
    dateSown,
    seedWeight: 30,
    growingMedium: 'coco_coir',
    preSoaked: false,
    blackoutDays: 4,
    problemsObserved: '',
    lessonsLearned: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as GrowTray;
}

/** Harvested tray with an explicit sow-to-harvest span. */
function harvested(days: number, overrides: Partial<GrowTray> = {}): GrowTray {
  const dateSown = new Date('2026-01-01');
  return tray({
    dateSown,
    dateHarvested: new Date(dateSown.getTime() + days * day),
    qualityGrade: 'A',
    ...overrides,
  });
}

describe('aggregateHistory', () => {
  it('averages observed days-to-harvest across harvested trays', () => {
    const [basil] = aggregateHistory([harvested(18), harvested(20), harvested(19)]);

    expect(basil.variety).toBe('Basil');
    expect(basil.plantings).toBe(3);
    expect(basil.avgDaysToHarvest).toBe(19);
  });

  it('excludes trays still growing from harvest-based averages', () => {
    const [basil] = aggregateHistory([
      harvested(20),
      tray({ trayNumber: 2 }), // still growing, no dateHarvested
    ]);

    expect(basil.plantings).toBe(2);
    // The unharvested tray must not drag the average toward zero.
    expect(basil.avgDaysToHarvest).toBe(20);
  });

  it('reports null rather than a guess when nothing has been harvested', () => {
    const [basil] = aggregateHistory([tray(), tray({ trayNumber: 2 })]);

    // Distinguishing "no data" from "poor performance" lets the agent say so.
    expect(basil.avgDaysToHarvest).toBeNull();
    expect(basil.avgHarvestWeight).toBeNull();
  });

  it('averages only germination rates that were actually recorded', () => {
    const [basil] = aggregateHistory([
      harvested(19, { germinationRate: 90 }),
      harvested(19, { germinationRate: 80 }),
      harvested(19), // not recorded
    ]);

    expect(basil.avgGerminationRate).toBe(85);
  });

  it('ignores implausible spans from bad data', () => {
    const [basil] = aggregateHistory([
      harvested(19),
      harvested(500), // data entry error
    ]);

    expect(basil.avgDaysToHarvest).toBe(19);
  });

  it('counts an F grade as a failure', () => {
    const [basil] = aggregateHistory([
      harvested(19),
      harvested(19, { qualityGrade: 'F' }),
    ]);

    expect(basil.failureRate).toBe(50);
  });

  it('counts a harvested but unsellable tray as a failure', () => {
    const [basil] = aggregateHistory([
      harvested(19, { sellable: true }),
      harvested(19, { qualityGrade: 'B', sellable: false }),
    ]);

    expect(basil.failureRate).toBe(50);
  });

  it('does not count a still-growing tray as a failure', () => {
    const [basil] = aggregateHistory([harvested(19), tray({ trayNumber: 2 })]);

    expect(basil.failureRate).toBe(0);
  });

  it('tallies quality grades that were recorded', () => {
    const [basil] = aggregateHistory([
      harvested(19, { qualityGrade: 'A' }),
      harvested(19, { qualityGrade: 'A' }),
      harvested(19, { qualityGrade: 'B' }),
    ]);

    expect(basil.qualityMix).toEqual({ A: 2, B: 1 });
  });

  it('dedupes problems and returns the most recent first', () => {
    const [basil] = aggregateHistory([
      tray({ dateSown: new Date('2026-01-01'), problemsObserved: 'damping off' }),
      tray({ dateSown: new Date('2026-02-01'), problemsObserved: 'uneven germination' }),
      tray({ dateSown: new Date('2026-03-01'), problemsObserved: 'damping off' }),
    ]);

    expect(basil.commonProblems).toEqual(['damping off', 'uneven germination']);
  });

  it('separates varieties and orders by how much data backs each', () => {
    const history = aggregateHistory([
      harvested(19, { variety: 'Basil' }),
      harvested(19, { variety: 'Basil' }),
      harvested(12, { variety: 'Radish' }),
    ]);

    expect(history.map((h) => h.variety)).toEqual(['Basil', 'Radish']);
    expect(history[1].avgDaysToHarvest).toBe(12);
  });

  it('returns nothing for an empty database', () => {
    expect(aggregateHistory([])).toEqual([]);
  });
});
