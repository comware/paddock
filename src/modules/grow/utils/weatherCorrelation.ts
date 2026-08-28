/**
 * Weather against outcome
 *
 * Paddock has been storing daily temperature and humidity, and separately recording how
 * long each tray took. It never put the two together - so "the greenhouse is cold and
 * basil runs slow here" stayed an intuition when the data to test it was already on disk.
 *
 * For each harvested tray this works out the mean temperature across its actual growing
 * period, buckets trays by that, and reports how long each bucket took.
 *
 * Deliberately modest about what it claims. This is a correlation over a handful of
 * trays from one bench; it is offered as something to look at, not a finding. Where the
 * sample is too thin to mean anything, it says so instead.
 */

import { startOfDay } from 'date-fns';
import type { GrowTray, GrowWeatherHistory } from '@/lib/db';

/** Below this, a bucket is anecdote. */
const MIN_TRAYS_PER_BUCKET = 2;

/** Below this, the whole comparison is not worth showing. */
const MIN_TRAYS_TOTAL = 5;

/** Degrees between the coldest and warmest bucket before a difference is worth naming. */
const MEANINGFUL_SPREAD = 2;

export interface TemperatureBucket {
  label: string;
  minTemp: number;
  maxTemp: number;
  trays: number;
  avgDaysToHarvest: number;
  avgTemperature: number;
  avgHarvestWeight: number | null;
}

export interface WeatherCorrelation {
  variety: string;
  buckets: TemperatureBucket[];
  /** Set when cold and warm buckets differ enough to be worth mentioning. */
  finding: string | null;
  trayCount: number;
}

interface TrayWithConditions {
  tray: GrowTray;
  days: number;
  meanTemp: number;
}

/**
 * Mean temperature across a tray's growing period.
 *
 * Returns null when readings do not cover the period - an average over two of nineteen
 * days would be worse than no answer.
 */
export function meanTempDuring(
  weather: GrowWeatherHistory[],
  from: Date,
  to: Date,
): number | null {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  if (end < start) return null;

  const readings = weather.filter((w) => {
    const at = startOfDay(new Date(w.date)).getTime();
    return at >= start && at <= end;
  });

  const expectedDays = Math.round((end - start) / 86_400_000) + 1;
  if (readings.length < expectedDays * 0.6) return null;

  const sum = readings.reduce((total, r) => total + r.temperature, 0);
  return Math.round((sum / readings.length) * 10) / 10;
}

const mean = (xs: number[]): number =>
  Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;

/**
 * Group a variety's harvested trays by the temperature they grew in.
 *
 * Buckets are cut at terciles of the observed range rather than fixed thresholds, because
 * what counts as cold depends on the site.
 */
export function correlateWeather(
  trays: GrowTray[],
  weather: GrowWeatherHistory[],
  variety: string,
): WeatherCorrelation | null {
  const measured: TrayWithConditions[] = [];

  for (const tray of trays) {
    if (tray.variety !== variety || !tray.dateHarvested) continue;

    const sown = new Date(tray.dateSown);
    const harvested = new Date(tray.dateHarvested);
    const days = Math.round((harvested.getTime() - sown.getTime()) / 86_400_000);
    if (days <= 0 || days > 120) continue;

    const meanTemp = meanTempDuring(weather, sown, harvested);
    if (meanTemp === null) continue;

    measured.push({ tray, days, meanTemp });
  }

  if (measured.length < MIN_TRAYS_TOTAL) return null;

  const temps = measured.map((m) => m.meanTemp).sort((a, b) => a - b);
  const lowCut = temps[Math.floor(temps.length / 3)];
  const highCut = temps[Math.floor((temps.length * 2) / 3)];

  // A site with almost no seasonal variation has nothing to compare.
  if (highCut - lowCut < 1) return null;

  const groups: Array<{ label: string; members: TrayWithConditions[] }> = [
    { label: 'Coolest', members: measured.filter((m) => m.meanTemp <= lowCut) },
    {
      label: 'Middle',
      members: measured.filter((m) => m.meanTemp > lowCut && m.meanTemp < highCut),
    },
    { label: 'Warmest', members: measured.filter((m) => m.meanTemp >= highCut) },
  ];

  const buckets: TemperatureBucket[] = groups
    .filter((g) => g.members.length >= MIN_TRAYS_PER_BUCKET)
    .map((g) => {
      const weights = g.members
        .map((m) => m.tray.harvestWeight)
        .filter((w): w is number => typeof w === 'number');

      return {
        label: g.label,
        minTemp: Math.min(...g.members.map((m) => m.meanTemp)),
        maxTemp: Math.max(...g.members.map((m) => m.meanTemp)),
        trays: g.members.length,
        avgDaysToHarvest: mean(g.members.map((m) => m.days)),
        avgTemperature: mean(g.members.map((m) => m.meanTemp)),
        avgHarvestWeight: weights.length ? mean(weights) : null,
      };
    });

  if (buckets.length < 2) return null;

  const coolest = buckets[0];
  const warmest = buckets[buckets.length - 1];
  const dayGap = Math.round((coolest.avgDaysToHarvest - warmest.avgDaysToHarvest) * 10) / 10;
  const tempGap = Math.round((warmest.avgTemperature - coolest.avgTemperature) * 10) / 10;

  const finding =
    Math.abs(dayGap) >= MEANINGFUL_SPREAD && tempGap >= 2
      ? `${variety} trays grown around ${coolest.avgTemperature}°C took ` +
        `${coolest.avgDaysToHarvest} days; those around ${warmest.avgTemperature}°C took ` +
        `${warmest.avgDaysToHarvest}. That is ${Math.abs(dayGap)} ` +
        `${Math.abs(dayGap) === 1 ? 'day' : 'days'} ` +
        `${dayGap > 0 ? 'longer' : 'shorter'} in the cold.`
      : null;

  return { variety, buckets, finding, trayCount: measured.length };
}

/** Every variety with enough harvested trays to compare, most trays first. */
export function correlateAllVarieties(
  trays: GrowTray[],
  weather: GrowWeatherHistory[],
): WeatherCorrelation[] {
  const varieties = [...new Set(trays.map((t) => t.variety))];

  return varieties
    .map((variety) => correlateWeather(trays, weather, variety))
    .filter((c): c is WeatherCorrelation => c !== null)
    .sort((a, b) => b.trayCount - a.trayCount);
}
