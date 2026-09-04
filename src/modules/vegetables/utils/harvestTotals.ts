import type { VegHarvest } from '@/lib/db';

/**
 * Vegetables are picked repeatedly over weeks, not harvested once. This module turns that
 * log of individual picks into the figures a grower actually asks for — how much came off
 * a bed, in what units, and over how many days.
 *
 * Two decisions worth recording:
 *
 * - Totals are kept per-unit and never combined. A planting picked in both kilos and
 *   bunches has no single meaningful figure. Inventing one — by picking a "primary" unit,
 *   or silently adding incompatible units together — would produce a number that means
 *   nothing and would be believed. Two honest numbers beat one invented one.
 * - `daysHarvesting` counts both ends of the picking window. A planting picked once has
 *   been harvesting for one day, not zero — it's a span, not a subtraction.
 */

export type HarvestUnit = VegHarvest['unit'];

export interface HarvestSummary {
  totals: Partial<Record<HarvestUnit, number>>;
  sellableTotals: Partial<Record<HarvestUnit, number>>;
  harvestCount: number;
  firstHarvest?: Date;
  lastHarvest?: Date;
  daysHarvesting: number;
}

/**
 * Summarise a log of harvest picks into per-unit totals and the span of the picking window.
 *
 * Does not mutate `harvests` — a store may hand this array straight out of state, and
 * sorting in place would silently reorder the caller's data.
 */
export function summariseHarvests(harvests: VegHarvest[]): HarvestSummary {
  if (harvests.length === 0) {
    return {
      totals: {},
      sellableTotals: {},
      harvestCount: 0,
      firstHarvest: undefined,
      lastHarvest: undefined,
      daysHarvesting: 0,
    };
  }

  const totals: Partial<Record<HarvestUnit, number>> = {};
  const sellableTotals: Partial<Record<HarvestUnit, number>> = {};
  let firstHarvest = harvests[0].date;
  let lastHarvest = harvests[0].date;

  for (const harvest of harvests) {
    totals[harvest.unit] = (totals[harvest.unit] ?? 0) + harvest.quantity;
    if (harvest.sellable) {
      sellableTotals[harvest.unit] = (sellableTotals[harvest.unit] ?? 0) + harvest.quantity;
    }
    if (harvest.date < firstHarvest) firstHarvest = harvest.date;
    if (harvest.date > lastHarvest) lastHarvest = harvest.date;
  }

  // Normalise to whole-day (UTC) boundaries before differencing, rather than dividing the
  // raw millisecond gap by a day-length constant. A raw ms diff drifts across a daylight
  // saving change (a 15-day span can come out as 14.958 days, which floors to the wrong
  // answer) — comparing calendar-day boundaries in UTC sidesteps DST entirely.
  const toUtcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const daySpan = Math.round((toUtcDay(lastHarvest) - toUtcDay(firstHarvest)) / 86_400_000);
  const daysHarvesting = daySpan + 1;

  return {
    totals,
    sellableTotals,
    harvestCount: harvests.length,
    firstHarvest,
    lastHarvest,
    daysHarvesting,
  };
}
