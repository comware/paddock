/**
 * Tests for weather against outcome.
 *
 * A correlation over a handful of trays from one bench is easy to overstate, so most of
 * these pin the refusals: too few trays, too little temperature range, patchy readings,
 * and differences too small to mean anything all produce nothing rather than a finding.
 */

import { describe, it, expect } from 'vitest';
import { meanTempDuring, correlateWeather, correlateAllVarieties } from '../weatherCorrelation';
import type { GrowTray, GrowWeatherHistory } from '@/lib/db';

const DAY = 86_400_000;
const BASE = new Date('2026-01-01T00:00:00Z').getTime();
const at = (day: number) => new Date(BASE + day * DAY);

function weatherRange(fromDay: number, toDay: number, temperature: number) {
  const readings: GrowWeatherHistory[] = [];
  for (let d = fromDay; d <= toDay; d++) {
    readings.push({
      siteId: 's1',
      date: at(d),
      temperature,
      humidity: 70,
      conditions: 'Clear',
      source: 'api',
      fetchedAt: at(d),
      createdAt: at(d),
    } as GrowWeatherHistory);
  }
  return readings;
}

function tray(sowDay: number, span: number, overrides: Partial<GrowTray> = {}): GrowTray {
  return {
    trayNumber: sowDay,
    variety: 'Basil',
    dateSown: at(sowDay),
    dateHarvested: at(sowDay + span),
    seedWeight: 26,
    growingMedium: 'coco_coir',
    preSoaked: false,
    blackoutDays: 5,
    problemsObserved: '',
    lessonsLearned: '',
    createdAt: at(sowDay),
    updatedAt: at(sowDay),
    ...overrides,
  } as GrowTray;
}

/** Six trays: three grown cold and slow, three grown warm and fast. */
function coldAndWarm() {
  const weather = [
    ...weatherRange(0, 99, 8), // cold first hundred days
    ...weatherRange(100, 200, 18), // warm after
  ];
  const trays = [
    tray(0, 22), tray(25, 23), tray(50, 22),
    tray(100, 18), tray(125, 19), tray(150, 18),
  ];
  return { weather, trays };
}

describe('meanTempDuring', () => {
  it('averages readings across the period', () => {
    const weather = [...weatherRange(0, 4, 10), ...weatherRange(5, 9, 20)];
    expect(meanTempDuring(weather, at(0), at(9))).toBe(15);
  });

  it('ignores readings outside the period', () => {
    const weather = [...weatherRange(0, 9, 10), ...weatherRange(10, 20, 30)];
    expect(meanTempDuring(weather, at(0), at(9))).toBe(10);
  });

  it('refuses to answer from patchy readings', () => {
    // Two days of readings across a nineteen-day grow is worse than no answer.
    const weather = weatherRange(0, 1, 10);
    expect(meanTempDuring(weather, at(0), at(18))).toBeNull();
  });

  it('handles a reversed period', () => {
    expect(meanTempDuring(weatherRange(0, 10, 10), at(9), at(2))).toBeNull();
  });
});

describe('correlateWeather', () => {
  it('finds a difference between cold and warm trays', () => {
    const { trays, weather } = coldAndWarm();
    const result = correlateWeather(trays, weather, 'Basil')!;

    expect(result.buckets.length).toBeGreaterThanOrEqual(2);
    expect(result.finding).toContain('longer in the cold');
    expect(result.trayCount).toBe(6);
  });

  it('reports the temperature and duration of each bucket', () => {
    const { trays, weather } = coldAndWarm();
    const { buckets } = correlateWeather(trays, weather, 'Basil')!;

    const coolest = buckets[0];
    const warmest = buckets[buckets.length - 1];

    expect(coolest.avgTemperature).toBeLessThan(warmest.avgTemperature);
    expect(coolest.avgDaysToHarvest).toBeGreaterThan(warmest.avgDaysToHarvest);
  });

  it('says nothing when growing time does not track temperature', () => {
    const weather = [...weatherRange(0, 99, 8), ...weatherRange(100, 200, 18)];
    const trays = [
      tray(0, 19), tray(25, 19), tray(50, 19),
      tray(100, 19), tray(125, 19), tray(150, 19),
    ];

    // Buckets still computed; no claim made.
    expect(correlateWeather(trays, weather, 'Basil')!.finding).toBeNull();
  });

  it('refuses with too few harvested trays', () => {
    const weather = weatherRange(0, 200, 12);
    const trays = [tray(0, 19), tray(20, 20)];

    expect(correlateWeather(trays, weather, 'Basil')).toBeNull();
  });

  it('refuses when there is no temperature range to compare', () => {
    const weather = weatherRange(0, 200, 15);
    const trays = [tray(0, 19), tray(25, 20), tray(50, 19), tray(75, 21), tray(100, 20), tray(125, 19)];

    // A site with a flat climate has nothing to say about temperature.
    expect(correlateWeather(trays, weather, 'Basil')).toBeNull();
  });

  it('ignores trays that were never harvested', () => {
    const { trays, weather } = coldAndWarm();
    const withGrowing = [...trays, tray(180, 5, { dateHarvested: undefined })];

    expect(correlateWeather(withGrowing, weather, 'Basil')!.trayCount).toBe(6);
  });

  it('ignores trays with no weather covering their grow', () => {
    const { trays } = coldAndWarm();
    const weather = weatherRange(0, 99, 8); // nothing after day 99

    // Three trays lose their readings entirely, leaving too few to compare.
    expect(correlateWeather(trays, weather, 'Basil')).toBeNull();
  });

  it('ignores other varieties', () => {
    const { trays, weather } = coldAndWarm();
    const mixed = [...trays, tray(10, 8, { variety: 'Radish' })];

    expect(correlateWeather(mixed, weather, 'Basil')!.trayCount).toBe(6);
  });

  it('discards an implausible growing span', () => {
    const { trays, weather } = coldAndWarm();
    const withJunk = [...trays, tray(0, 500)];

    expect(correlateWeather(withJunk, weather, 'Basil')!.trayCount).toBe(6);
  });
});

describe('correlateAllVarieties', () => {
  it('returns only varieties with enough data, most trays first', () => {
    const { trays, weather } = coldAndWarm();
    const mixed = [
      ...trays,
      tray(10, 8, { variety: 'Radish' }),
      tray(30, 8, { variety: 'Radish' }),
    ];

    const results = correlateAllVarieties(mixed, weather);

    expect(results).toHaveLength(1);
    expect(results[0].variety).toBe('Basil');
  });

  it('returns nothing when no variety qualifies', () => {
    expect(correlateAllVarieties([], weatherRange(0, 100, 12))).toEqual([]);
  });
});
