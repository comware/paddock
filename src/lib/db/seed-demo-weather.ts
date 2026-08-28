/**
 * Demo Weather History
 *
 * Daily readings for the demo site, so the analytics can ask whether the greenhouse being
 * cold actually explains the slow basil - rather than leaving it as a story in the seed
 * comments.
 *
 * Central Victoria, unheated greenhouse: winter overnight lows near freezing, summer
 * days into the high twenties, with a cold snap through what the tray fixtures record as
 * the slow run.
 *
 * Deterministic, like the tray history. The variation is a fixed function of the day
 * index rather than a random draw, so a demo recorded twice shows the same figures.
 */

import { db } from './schema';
import type { GrowWeatherHistory } from './schema';

const DAY = 86_400_000;

/** How many days of history to lay down. Covers every tray in the demo fixtures. */
const DAYS = 200;

/**
 * Southern-hemisphere seasonal mean, peaking in January and troughing in July.
 *
 * `dayOfYear` drives a cosine so the curve is smooth rather than stepped by month, which
 * matters when correlating against grow periods that straddle a boundary.
 */
function seasonalMean(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((date.getTime() - start) / DAY);

  // Peak ~15 January (day 15), trough ~15 July.
  const phase = ((dayOfYear - 15) / 365) * 2 * Math.PI;
  const annualMean = 15.5;
  const amplitude = 7.5;

  return annualMean + amplitude * Math.cos(phase);
}

/**
 * Fixed day-to-day variation. Two offset sines rather than a random draw: weather is not
 * white noise, and a demo has to reproduce.
 */
function variation(index: number): number {
  return 3.2 * Math.sin(index / 2.7) + 1.8 * Math.sin(index / 6.1 + 1.3);
}

/**
 * A colder-than-usual fortnight through the period the tray fixtures record as the slow
 * basil run, so the correlation has something real to find.
 */
function coldSnap(daysBeforeNow: number): number {
  return daysBeforeNow >= 118 && daysBeforeNow <= 145 ? -3.5 : 0;
}

function conditionsFor(temperature: number, index: number): string {
  if (temperature < 8) return 'Frost';
  const wet = Math.sin(index / 3.3) > 0.55;
  if (wet) return 'Rain';
  return Math.sin(index / 4.7) > 0 ? 'Clear' : 'Cloudy';
}

/** Build the readings without touching the database, so figures can be verified. */
export function buildDemoWeather(
  siteId: string,
  now: number = Date.now(),
): GrowWeatherHistory[] {
  const readings: GrowWeatherHistory[] = [];

  for (let i = DAYS; i >= 0; i--) {
    const date = new Date(now - i * DAY);
    const temperature =
      Math.round((seasonalMean(date) + variation(i) + coldSnap(i)) * 10) / 10;

    // Colder air holds less moisture, and the greenhouse runs humid regardless.
    const humidity = Math.min(
      95,
      Math.max(40, Math.round(82 - (temperature - 15) * 1.6 + variation(i + 40) * 2)),
    );

    readings.push({
      siteId,
      date,
      temperature,
      humidity,
      conditions: conditionsFor(temperature, i),
      source: 'api',
      fetchedAt: date,
      createdAt: date,
    } as GrowWeatherHistory);
  }

  return readings;
}

/** Seed weather history. No-op unless the table is empty. */
export async function seedDemoWeather(siteId: string, now = Date.now()): Promise<number> {
  const existing = await db.growWeatherHistory.count();
  if (existing > 0) return 0;

  const readings = buildDemoWeather(siteId, now);
  await db.growWeatherHistory.bulkAdd(readings);
  return readings.length;
}
