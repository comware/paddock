/**
 * Tests for time estimation.
 *
 * An estimate that is too high gets accepted without much thought and quietly corrupts
 * the record it is meant to build, so the conservative behaviours are pinned: modest
 * defaults, no rate from a thin sample, and nothing offered for an empty day.
 */

import { describe, it, expect } from 'vitest';
import { deriveRates, countActivity, estimateTime } from '../timeEstimate';
import type { TrayWithComputed } from '../../stores';
import type { GrowTimeEntry } from '@/lib/db';

const TODAY = new Date('2026-08-28T09:00:00');
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY);

function tray(overrides: Partial<TrayWithComputed> = {}): TrayWithComputed {
  return {
    id: 't1',
    trayNumber: 1,
    variety: 'Basil',
    dateSown: TODAY,
    seedWeight: 26,
    growingMedium: 'coco_coir',
    preSoaked: false,
    blackoutDays: 5,
    problemsObserved: '',
    lessonsLearned: '',
    createdAt: TODAY,
    updatedAt: TODAY,
    status: 'blackout',
    daysInPhase: 0,
    ...overrides,
  } as TrayWithComputed;
}

function entry(overrides: Partial<GrowTimeEntry> = {}): GrowTimeEntry {
  return {
    date: TODAY,
    week: 1,
    wateringChecking: 0,
    sowing: 0,
    harvesting: 0,
    packaging: 0,
    cleanup: 0,
    researchLearning: 0,
    other: 0,
    notes: '',
    createdAt: TODAY,
    updatedAt: TODAY,
    ...overrides,
  } as GrowTimeEntry;
}

describe('countActivity', () => {
  it('counts sowings and harvests on the day', () => {
    const activity = countActivity(
      [
        tray({ id: 'a', dateSown: TODAY }),
        tray({ id: 'b', dateSown: daysAgo(20), dateHarvested: TODAY }),
        tray({ id: 'c', dateSown: daysAgo(5) }),
      ],
      TODAY,
    );

    expect(activity.sowings).toBe(1);
    expect(activity.harvests).toBe(1);
  });

  it('counts trays on the bench, including ones harvested that day', () => {
    const activity = countActivity(
      [
        tray({ id: 'a', dateSown: daysAgo(5) }),
        tray({ id: 'b', dateSown: daysAgo(20), dateHarvested: TODAY }),
        tray({ id: 'c', dateSown: daysAgo(30), dateHarvested: daysAgo(10) }),
      ],
      TODAY,
    );

    // The third finished long ago; the second still needed attention today.
    expect(activity.traysOnBench).toBe(2);
  });

  it('does not count a tray sown after the day in question', () => {
    const activity = countActivity([tray({ dateSown: TODAY })], daysAgo(3));
    expect(activity.traysOnBench).toBe(0);
  });
});

describe('deriveRates', () => {
  it('falls back to defaults with no history', () => {
    const rates = deriveRates([], []);

    expect(rates.personalised).toBe(false);
    expect(rates.minutesPerSowing).toBe(12);
  });

  it('learns this grower rate from enough matching days', () => {
    const trays: TrayWithComputed[] = [];
    const entries: GrowTimeEntry[] = [];

    // Three days, two sowings each, 40 minutes each - 20 minutes per sowing.
    for (let i = 1; i <= 3; i++) {
      const date = daysAgo(i);
      trays.push(tray({ id: `a${i}`, dateSown: date }));
      trays.push(tray({ id: `b${i}`, dateSown: date }));
      entries.push(entry({ date, sowing: 40 }));
    }

    const rates = deriveRates(entries, trays);

    expect(rates.minutesPerSowing).toBe(20);
    expect(rates.personalised).toBe(true);
  });

  it('ignores a sample too thin to mean anything', () => {
    const date = daysAgo(1);
    const rates = deriveRates(
      [entry({ date, sowing: 90 })],
      [tray({ dateSown: date })],
    );

    // One unusual day must not become the rate.
    expect(rates.minutesPerSowing).toBe(12);
    expect(rates.personalised).toBe(false);
  });

  it('ignores logged time with no matching activity', () => {
    const entries = [1, 2, 3].map((i) => entry({ date: daysAgo(i), harvesting: 60 }));

    // Sixty minutes of harvesting on days with no harvest says nothing about how long a
    // harvest takes.
    const rates = deriveRates(entries, []);
    expect(rates.minutesPerHarvest).toBe(15);
  });
});

describe('estimateTime', () => {
  const defaults = deriveRates([], []);

  it('estimates from sowings, harvests, and trays on the bench', () => {
    const estimate = estimateTime(
      { sowings: 2, harvests: 1, traysOnBench: 5 },
      defaults,
    )!;

    expect(estimate.minutes.sowing).toBe(24);
    expect(estimate.minutes.harvesting).toBe(15);
    expect(estimate.minutes.wateringChecking).toBe(10);
    expect(estimate.totalMinutes).toBe(49);
  });

  it('offers nothing for an empty day', () => {
    // "Accept an estimate of zero minutes" is a strange thing to ask.
    expect(estimateTime({ sowings: 0, harvests: 0, traysOnBench: 0 }, defaults)).toBeNull();
  });

  it('explains what the estimate is built from', () => {
    const estimate = estimateTime({ sowings: 2, harvests: 0, traysOnBench: 3 }, defaults)!;

    expect(estimate.basis.join(' ')).toContain('2 sowings');
    expect(estimate.basis.join(' ')).toContain('3 trays');
  });

  it('reports whether the rates were this grower own', () => {
    expect(
      estimateTime({ sowings: 1, harvests: 0, traysOnBench: 0 }, defaults)!.personalised,
    ).toBe(false);

    expect(
      estimateTime(
        { sowings: 1, harvests: 0, traysOnBench: 0 },
        { ...defaults, personalised: true },
      )!.personalised,
    ).toBe(true);
  });

  it('omits categories with no activity behind them', () => {
    const estimate = estimateTime({ sowings: 0, harvests: 2, traysOnBench: 0 }, defaults)!;

    expect(estimate.minutes.sowing).toBeUndefined();
    expect(estimate.minutes.harvesting).toBe(30);
  });
});
