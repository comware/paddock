/**
 * Time estimation from activity
 *
 * Manual time tracking asks the grower to recall a day, in minutes, across seven
 * categories. The dashboard reading "0h this week" is the predictable result.
 *
 * The app already knows what happened: trays sown, trays harvested, trays on the bench
 * needing watering. What it lacks is how long those take *this* grower - so it works that
 * out from days where they recorded both, exactly as days-to-harvest is derived from
 * their own trays rather than the seed packet.
 *
 * Estimates are a starting point, not a record. The grower adjusts and saves; nothing is
 * written without them.
 */

import { isSameDay, startOfDay } from 'date-fns';
import type { GrowTimeEntry } from '@/lib/db';
import type { TrayWithComputed } from '../stores';
import type { TimeCategory } from '../stores';

/**
 * Fallbacks for a grower with no history yet. Deliberately modest - an estimate that is
 * too high gets accepted uncritically and quietly corrupts the record.
 */
const DEFAULT_RATES = {
  minutesPerSowing: 12,
  minutesPerHarvest: 15,
  minutesPerTrayWatering: 2,
};

/** Below this, per-grower rates are noise and the defaults are the better guess. */
const MIN_OBSERVATIONS = 3;

export interface ActivityCounts {
  sowings: number;
  harvests: number;
  traysOnBench: number;
}

export interface TimeEstimate {
  minutes: Partial<Record<TimeCategory, number>>;
  totalMinutes: number;
  /** What the estimate was built from, so the grower can judge it. */
  basis: string[];
  /** True when rates came from this grower's own entries rather than defaults. */
  personalised: boolean;
}

interface DerivedRates {
  minutesPerSowing: number;
  minutesPerHarvest: number;
  minutesPerTrayWatering: number;
  personalised: boolean;
}

const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

/**
 * Work out this grower's own minutes-per-activity from days where they logged both the
 * time and the work.
 *
 * Only days with matching activity contribute: a day with 40 minutes of harvesting and no
 * harvests says nothing about how long a harvest takes.
 */
export function deriveRates(
  entries: GrowTimeEntry[],
  trays: TrayWithComputed[],
): DerivedRates {
  const sowingRates: number[] = [];
  const harvestRates: number[] = [];
  const wateringRates: number[] = [];

  for (const entry of entries) {
    const day = startOfDay(new Date(entry.date));

    const sowings = trays.filter((t) => isSameDay(new Date(t.dateSown), day)).length;
    const harvests = trays.filter(
      (t) => t.dateHarvested && isSameDay(new Date(t.dateHarvested), day),
    ).length;
    const onBench = trays.filter((t) => {
      const sown = startOfDay(new Date(t.dateSown));
      const done = t.dateHarvested ? startOfDay(new Date(t.dateHarvested)) : null;
      return sown <= day && (!done || done >= day);
    }).length;

    if (sowings > 0 && entry.sowing > 0) sowingRates.push(entry.sowing / sowings);
    if (harvests > 0 && entry.harvesting > 0) {
      harvestRates.push(entry.harvesting / harvests);
    }
    if (onBench > 0 && entry.wateringChecking > 0) {
      wateringRates.push(entry.wateringChecking / onBench);
    }
  }

  const enough = (xs: number[]) => xs.length >= MIN_OBSERVATIONS;

  return {
    minutesPerSowing: enough(sowingRates)
      ? Math.round(mean(sowingRates)!)
      : DEFAULT_RATES.minutesPerSowing,
    minutesPerHarvest: enough(harvestRates)
      ? Math.round(mean(harvestRates)!)
      : DEFAULT_RATES.minutesPerHarvest,
    minutesPerTrayWatering: enough(wateringRates)
      ? Math.round(mean(wateringRates)! * 10) / 10
      : DEFAULT_RATES.minutesPerTrayWatering,
    personalised:
      enough(sowingRates) || enough(harvestRates) || enough(wateringRates),
  };
}

/** What happened on a given day, from the tray records. */
export function countActivity(
  trays: TrayWithComputed[],
  date: Date,
): ActivityCounts {
  const day = startOfDay(date);

  return {
    sowings: trays.filter((t) => isSameDay(new Date(t.dateSown), day)).length,
    harvests: trays.filter(
      (t) => t.dateHarvested && isSameDay(new Date(t.dateHarvested), day),
    ).length,
    traysOnBench: trays.filter((t) => {
      const sown = startOfDay(new Date(t.dateSown));
      const done = t.dateHarvested ? startOfDay(new Date(t.dateHarvested)) : null;
      return sown <= day && (!done || done >= day);
    }).length,
  };
}

/**
 * Estimate a day's time from what happened.
 *
 * Returns nothing when nothing happened - offering "0 minutes" to accept would be a
 * strange thing to ask, and an empty day needs no entry.
 */
export function estimateTime(
  activity: ActivityCounts,
  rates: DerivedRates,
): TimeEstimate | null {
  const minutes: Partial<Record<TimeCategory, number>> = {};
  const basis: string[] = [];

  if (activity.sowings > 0) {
    minutes.sowing = Math.round(activity.sowings * rates.minutesPerSowing);
    basis.push(
      `${activity.sowings} ${activity.sowings === 1 ? 'sowing' : 'sowings'} at ` +
        `${rates.minutesPerSowing} min each`,
    );
  }

  if (activity.harvests > 0) {
    minutes.harvesting = Math.round(activity.harvests * rates.minutesPerHarvest);
    basis.push(
      `${activity.harvests} ${activity.harvests === 1 ? 'harvest' : 'harvests'} at ` +
        `${rates.minutesPerHarvest} min each`,
    );
  }

  if (activity.traysOnBench > 0) {
    minutes.wateringChecking = Math.round(
      activity.traysOnBench * rates.minutesPerTrayWatering,
    );
    basis.push(
      `${activity.traysOnBench} ${activity.traysOnBench === 1 ? 'tray' : 'trays'} to ` +
        `water and check`,
    );
  }

  const totalMinutes = Object.values(minutes).reduce((sum, m) => sum + (m ?? 0), 0);
  if (totalMinutes === 0) return null;

  return { minutes, totalMinutes, basis, personalised: rates.personalised };
}
