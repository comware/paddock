/**
 * Tests for succession planning.
 *
 * These dates end up in front of a grower as a plan they may act on, so the arithmetic
 * is pinned rather than trusted.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPlanOptions,
  peakOccupancy,
  groundingStatement,
  type SuccessionRequest,
  type ProposedPlanting,
} from '../planner';

const base: SuccessionRequest = {
  variety: 'Basil',
  harvestFrom: '2026-10-01',
  harvestTo: '2026-11-01',
  cadenceDays: 7,
  daysToHarvest: 19,
  configuredDaysToHarvest: 16,
};

const tightOf = (opts: ReturnType<typeof buildPlanOptions>) =>
  opts.find((o) => o.strategy === 'tight')!;

function planting(sow: string, harvest: string, quantity = 1): ProposedPlanting {
  return {
    variety: 'Basil',
    plannedSowDate: sow,
    targetHarvestDate: harvest,
    quantity,
  };
}

describe('peakOccupancy', () => {
  it('counts a single tray', () => {
    expect(peakOccupancy([planting('2026-10-01', '2026-10-20')])).toBe(1);
  });

  it('counts overlapping trays together', () => {
    expect(
      peakOccupancy([
        planting('2026-10-01', '2026-10-20'),
        planting('2026-10-08', '2026-10-27'),
      ]),
    ).toBe(2);
  });

  it('frees a tray once harvested', () => {
    // Second sown the day after the first is harvested - never concurrent.
    expect(
      peakOccupancy([
        planting('2026-10-01', '2026-10-20'),
        planting('2026-10-21', '2026-11-09'),
      ]),
    ).toBe(1);
  });

  it('respects quantity per sowing', () => {
    expect(peakOccupancy([planting('2026-10-01', '2026-10-20', 3)])).toBe(3);
  });

  it('is zero for an empty plan', () => {
    expect(peakOccupancy([])).toBe(0);
  });
});

describe('buildPlanOptions', () => {
  it('works backwards from wanted harvest dates', () => {
    const [first] = tightOf(buildPlanOptions(base)).plantings;

    // First harvest wanted 2026-10-01, 19 days to grow -> sow 2026-09-12.
    expect(first.plannedSowDate).toBe('2026-09-12');
    expect(first.targetHarvestDate).toBe('2026-10-01');
  });

  it('spaces sowings at the requested cadence', () => {
    const { plantings } = tightOf(buildPlanOptions(base));
    const gaps = plantings
      .slice(1)
      .map(
        (p, i) =>
          (new Date(p.plannedSowDate).getTime() -
            new Date(plantings[i].plannedSowDate).getTime()) /
          86_400_000,
      );

    expect(new Set(gaps)).toEqual(new Set([7]));
  });

  it('covers the requested window and stops', () => {
    const { plantings, coverage } = tightOf(buildPlanOptions(base));

    expect(coverage.firstHarvest).toBe('2026-10-01');
    expect(new Date(coverage.lastHarvest!) <= new Date('2026-11-01')).toBe(true);
    expect(plantings.length).toBe(5); // Oct 1, 8, 15, 22, 29
  });

  it('plans against observed days-to-harvest, not the configured value', () => {
    const observed = tightOf(buildPlanOptions(base)).plantings[0];
    const configured = tightOf(
      buildPlanOptions({ ...base, daysToHarvest: 16 }),
    ).plantings[0];

    // Three days of divergence must show up as three days of earlier sowing.
    expect(observed.plannedSowDate).toBe('2026-09-12');
    expect(configured.plannedSowDate).toBe('2026-09-15');
  });

  it('always offers more than one option', () => {
    const options = buildPlanOptions(base);

    // A single recommendation turns the grower into an approver.
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(options.map((o) => o.strategy)).size).toBe(options.length);
  });

  it('ranks sequentially from 1', () => {
    const options = buildPlanOptions(base);
    expect(options.map((o) => o.rank)).toEqual(options.map((_, i) => i + 1));
  });

  describe('unavailable windows', () => {
    const away: SuccessionRequest = {
      ...base,
      unavailable: [{ from: '2026-09-08', to: '2026-09-15', reason: 'away' }],
    };

    it('moves a sowing out of the window', () => {
      const { plantings } = tightOf(buildPlanOptions(away));

      for (const p of plantings) {
        expect(p.plannedSowDate < '2026-09-08' || p.plannedSowDate > '2026-09-15').toBe(
          true,
        );
      }
    });

    it('shifts later when shifting earlier would waste the harvest', () => {
      const { plantings } = tightOf(buildPlanOptions(away));
      const first = plantings[0];

      // Ideal sow 2026-09-12 is blocked. Shifting early to 09-07 harvests 09-26, before
      // the requested window opens on 10-01 - a wasted tray. Shifting late to 09-16
      // harvests 10-05, inside the window.
      expect(first.plannedSowDate).toBe('2026-09-16');
      expect(first.targetHarvestDate).toBe('2026-10-05');
    });

    it('keeps every harvest inside the requested window', () => {
      const { coverage } = tightOf(buildPlanOptions(away));

      // Regression: the first version always shifted earlier, producing a harvest five
      // days before the window opened and a 12-day hole after it.
      expect(coverage.harvestsOutsideWindow).toEqual([]);
    });

    it('covers the start of the window', () => {
      expect(tightOf(buildPlanOptions(away)).coverage.windowStartCovered).toBe(true);
    });

    it('does not open a gap wider than the cadence', () => {
      expect(tightOf(buildPlanOptions(away)).coverage.gaps).toEqual([]);
    });

    it('shifts earlier when that keeps the harvest closer to its target', () => {
      // Window opens 09-20, so harvests are wanted from 09-20. The second sowing's ideal
      // date (09-08) is blocked. Both directions land inside the window here, so the
      // closer one wins: early -> 09-07 harvests 09-26 (1 day off target), late -> 09-16
      // harvests 10-05 (8 days off).
      const openEarlier: SuccessionRequest = {
        ...away,
        harvestFrom: '2026-09-20',
        harvestTo: '2026-10-30',
      };
      const moved = tightOf(buildPlanOptions(openEarlier)).plantings.find(
        (p) => p.adjustment,
      );

      expect(moved!.plannedSowDate).toBe('2026-09-07');
      expect(moved!.adjustment).toContain('early');
    });

    it('explains the shift and its direction in the planting itself', () => {
      const moved = tightOf(buildPlanOptions(away)).plantings.find((p) => p.adjustment);

      expect(moved!.adjustment).toMatch(/\b(early|late)\b/);
      expect(moved!.adjustment).toContain('away');
    });

    it('resolves a shift that lands inside a second window', () => {
      const twoTrips: SuccessionRequest = {
        ...base,
        unavailable: [
          { from: '2026-09-08', to: '2026-09-15', reason: 'away' },
          { from: '2026-09-16', to: '2026-09-18', reason: 'market' },
        ],
      };
      const { plantings } = tightOf(buildPlanOptions(twoTrips));

      for (const p of plantings) {
        const d = p.plannedSowDate;
        expect(d < '2026-09-08' || (d > '2026-09-15' && d < '2026-09-16') || d > '2026-09-18').toBe(true);
      }
    });

    it('does not sow twice on the same day after shifting', () => {
      const dates = tightOf(buildPlanOptions(away)).plantings.map(
        (p) => p.plannedSowDate,
      );
      expect(new Set(dates).size).toBe(dates.length);
    });
  });

  describe('coverage reporting', () => {
    it('reports an unbroken plan as having no gaps', () => {
      const { coverage } = tightOf(buildPlanOptions(base));

      expect(coverage.gaps).toEqual([]);
      expect(coverage.windowStartCovered).toBe(true);
      expect(coverage.harvestsOutsideWindow).toEqual([]);
    });

    it('ranks an unbroken plan above one with a hole in it', () => {
      // Long unavailable window mid-run forces a break somewhere.
      const disrupted = buildPlanOptions({
        ...base,
        harvestTo: '2026-12-01',
        unavailable: [{ from: '2026-10-01', to: '2026-10-25', reason: 'harvest season' }],
      });

      const gapCounts = disrupted.map((o) => o.coverage.gaps.length);
      expect(gapCounts).toEqual([...gapCounts].sort((a, b) => a - b));
    });
  });

  describe('tray budget', () => {
    it('flags a plan that exceeds the budget', () => {
      const options = buildPlanOptions({ ...base, trayBudget: 1 });
      expect(tightOf(options).withinTrayBudget).toBe(false);
    });

    it('offers a leaner alternative that fits', () => {
      const options = buildPlanOptions({ ...base, trayBudget: 2 });
      const lean = options.find((o) => o.strategy === 'lean');

      expect(lean).toBeDefined();
      expect(lean!.peakTrayUsage).toBeLessThanOrEqual(2);
      expect(lean!.coverage.effectiveCadenceDays).toBeGreaterThan(base.cadenceDays);
    });

    it('still offers a leaner alternative when the budget is generous', () => {
      // A grower with room to spare may still prefer to tie up fewer trays. Offering
      // this only when the budget is busted leaves them with options that differ by a
      // day or two - which is not a choice.
      const options = buildPlanOptions({ ...base, trayBudget: 99 });
      const lean = options.find((o) => o.strategy === 'lean');
      const tight = tightOf(options);

      expect(lean).toBeDefined();
      expect(lean!.peakTrayUsage).toBeLessThan(tight.peakTrayUsage);
    });

    it('does not offer a lean option that saves nothing', () => {
      // One tray at a time cannot be reduced further.
      const options = buildPlanOptions({
        ...base,
        harvestFrom: '2026-10-01',
        harvestTo: '2026-10-01',
      });

      expect(options.find((o) => o.strategy === 'lean')).toBeUndefined();
    });

    it('ranks a plan that fits the budget above one that does not', () => {
      const options = buildPlanOptions({ ...base, trayBudget: 2 });

      expect(options[0].withinTrayBudget).toBe(true);
      const over = options.findIndex((o) => !o.withinTrayBudget);
      if (over !== -1) expect(over).toBeGreaterThan(0);
    });

    it('treats an absent budget as unconstrained', () => {
      expect(tightOf(buildPlanOptions(base)).withinTrayBudget).toBe(true);
    });
  });

  describe('buffered strategy', () => {
    it('sows earlier than the tight plan', () => {
      const options = buildPlanOptions(base);
      const buffered = options.find((o) => o.strategy === 'buffered')!;

      expect(buffered.plantings[0].plannedSowDate).toBe('2026-09-10'); // 2 days earlier
    });
  });

  it('handles a window too short for any harvest', () => {
    const options = buildPlanOptions({
      ...base,
      harvestFrom: '2026-10-01',
      harvestTo: '2026-09-01', // inverted
    });

    expect(tightOf(options).plantings).toEqual([]);
    expect(tightOf(options).coverage.harvestsPlanned).toBe(0);
  });

  it('handles a single-harvest window', () => {
    const options = buildPlanOptions({
      ...base,
      harvestFrom: '2026-10-01',
      harvestTo: '2026-10-01',
    });

    expect(tightOf(options).plantings).toHaveLength(1);
  });
});

describe('groundingStatement', () => {
  it('names the divergence when history disagrees with config', () => {
    const s = groundingStatement(base, 8);

    expect(s).toContain('19');
    expect(s).toContain('16');
    expect(s).toContain('8 trays');
    expect(s).toContain('+3');
  });

  it('says so when history confirms the config', () => {
    const s = groundingStatement(
      { ...base, daysToHarvest: 16, configuredDaysToHarvest: 16 },
      6,
    );

    expect(s).toMatch(/matching|confirmed/i);
  });

  it('admits when there is no history to stand on', () => {
    const s = groundingStatement({ ...base, configuredDaysToHarvest: undefined }, 0);

    // Never imply grounding that does not exist.
    expect(s).toMatch(/no harvest history/i);
  });
});
