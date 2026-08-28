/**
 * Tests for the derived day summary.
 *
 * This replaces questions the grower used to answer by hand, so a wrong count is worse
 * than no count - it looks authoritative and is not.
 */

import { describe, it, expect } from 'vitest';
import { deriveDaySummary, summariseActions } from '../daySummary';
import type { TrayWithComputed } from '../../stores';
import type { GrowPlannedPlanting, GrowVarietyConfig } from '@/lib/db';

const TODAY = new Date('2026-08-28T09:00:00');
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY);

function tray(overrides: Partial<TrayWithComputed> = {}): TrayWithComputed {
  return {
    id: 't1',
    siteId: 'site-1',
    trayNumber: 1,
    variety: 'Basil',
    dateSown: daysAgo(3),
    seedWeight: 26,
    growingMedium: 'coco_coir',
    preSoaked: false,
    blackoutDays: 5,
    problemsObserved: '',
    lessonsLearned: '',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    status: 'blackout',
    daysInPhase: 3,
    ...overrides,
  } as TrayWithComputed;
}

const varieties: GrowVarietyConfig[] = [
  { name: 'Basil', seedCostPerKg: 300, defaultBlackoutDays: 5, preSoakRequired: false, typicalDaysToHarvest: 16 },
  { name: 'Radish (China Rose)', seedCostPerKg: 30, defaultBlackoutDays: 3, preSoakRequired: false, typicalDaysToHarvest: 8 },
];

function planting(overrides: Partial<GrowPlannedPlanting> = {}): GrowPlannedPlanting {
  return {
    id: 'p1',
    siteId: 'site-1',
    variety: 'Basil',
    plannedSowDate: TODAY,
    targetHarvestDate: new Date(TODAY.getTime() + 19 * DAY),
    quantity: 1,
    status: 'planned',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    ...overrides,
  } as GrowPlannedPlanting;
}

const derive = (
  trays: TrayWithComputed[],
  plantings: GrowPlannedPlanting[] = [],
  siteId = 'site-1',
) => deriveDaySummary({ trays, plantings, varieties, siteId, today: TODAY });

describe('counts', () => {
  it('counts trays by phase', () => {
    const { counts } = derive([
      tray({ id: 'a', status: 'blackout' }),
      tray({ id: 'b', status: 'light' }),
      tray({ id: 'c', status: 'light' }),
    ]);

    expect(counts.blackout).toBe(1);
    expect(counts.light).toBe(2);
  });

  it('counts only trays harvested today', () => {
    const { counts } = derive([
      tray({ id: 'a', dateHarvested: TODAY, status: 'harvested' }),
      tray({ id: 'b', dateHarvested: daysAgo(1), status: 'harvested' }),
    ]);

    expect(counts.harvestedToday).toBe(1);
  });

  it('ignores trays from other sites', () => {
    const { counts } = derive([
      tray({ id: 'a', siteId: 'site-1', status: 'light' }),
      tray({ id: 'b', siteId: 'site-2', status: 'light' }),
    ]);

    expect(counts.light).toBe(1);
  });
});

describe('what happened today', () => {
  it('records a sowing', () => {
    const { happened } = derive([tray({ dateSown: TODAY })]);

    expect(happened.some((e) => e.kind === 'sown')).toBe(true);
    expect(happened[0].text).toContain('Tray #1');
  });

  it('records a harvest with its weight', () => {
    const { happened } = derive([
      tray({ dateHarvested: TODAY, harvestWeight: 210, status: 'harvested' }),
    ]);

    const harvest = happened.find((e) => e.kind === 'harvested');
    expect(harvest?.text).toContain('210 g');
  });

  it('records a tray coming out of blackout today', () => {
    // Sown 5 days ago with a 5-day blackout.
    const { happened } = derive([tray({ dateSown: daysAgo(5), blackoutDays: 5 })]);

    expect(happened.some((e) => e.kind === 'light')).toBe(true);
  });

  it('says nothing when nothing happened', () => {
    const { happened } = derive([tray({ dateSown: daysAgo(3) })]);
    expect(happened).toEqual([]);
  });
});

describe('what is due', () => {
  it('flags a tray still in blackout past its date', () => {
    const { due } = derive([
      tray({ dateSown: daysAgo(8), blackoutDays: 5, status: 'blackout' }),
    ]);

    const item = due.find((d) => d.kind === 'light');
    expect(item?.overdueDays).toBe(3);
  });

  it('flags a tray past its harvest date', () => {
    // Basil at 16 days, sown 18 days ago.
    const { due } = derive([
      tray({ dateSown: daysAgo(18), status: 'light' }),
    ]);

    const item = due.find((d) => d.kind === 'harvest');
    expect(item?.overdueDays).toBe(2);
    expect(item?.text).toContain('was ready');
  });

  it('reports a tray ready today as due, not overdue', () => {
    const { due } = derive([tray({ dateSown: daysAgo(16), status: 'light' })]);

    const item = due.find((d) => d.kind === 'harvest');
    expect(item?.overdueDays).toBe(0);
    expect(item?.text).toContain('ready to harvest');
  });

  it('does not chase a tray that has been harvested', () => {
    const { due } = derive([
      tray({ dateSown: daysAgo(20), dateHarvested: daysAgo(1), status: 'harvested' }),
    ]);

    expect(due).toEqual([]);
  });

  it('flags a scheduled sowing that is due', () => {
    const { due } = derive([], [planting()]);

    const item = due.find((d) => d.kind === 'sow');
    expect(item?.overdueDays).toBe(0);
    expect(item?.text).toContain('Sow 1 tray of Basil');
  });

  it('flags an overdue sowing', () => {
    const { due } = derive([], [planting({ plannedSowDate: daysAgo(4) })]);

    expect(due.find((d) => d.kind === 'sow')?.overdueDays).toBe(4);
  });

  it('ignores a sowing that is not due yet', () => {
    const { due } = derive(
      [],
      [planting({ plannedSowDate: new Date(TODAY.getTime() + 5 * DAY) })],
    );

    expect(due).toEqual([]);
  });

  it('ignores proposals - they are not work until approved', () => {
    const { due } = derive([], [planting({ status: 'proposed' })]);
    expect(due).toEqual([]);
  });

  it('puts the longest-waiting item first', () => {
    const { due } = derive(
      [tray({ id: 'a', dateSown: daysAgo(17), status: 'light' })],
      [planting({ plannedSowDate: daysAgo(6) })],
    );

    // Whatever has waited longest is what is most likely to have been forgotten.
    expect(due[0].overdueDays).toBe(6);
  });
});

describe('summariseActions', () => {
  it('turns the day into a sentence', () => {
    const summary = derive([
      tray({ id: 'a', dateSown: TODAY }),
      tray({ id: 'b', trayNumber: 2, dateHarvested: TODAY, harvestWeight: 200, status: 'harvested' }),
    ]);

    const text = summariseActions(summary);
    expect(text).toContain('Sowed');
    expect(text).toContain('Harvested');
    expect(text.endsWith('.')).toBe(true);
  });

  it('returns nothing when nothing happened', () => {
    // A log entry reading "nothing happened today" is worse than a blank one.
    expect(summariseActions(derive([tray()]))).toBe('');
  });
});
