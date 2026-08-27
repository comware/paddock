/**
 * Verifies the demo history produces the figures the demo actually claims.
 *
 * The narration says basil runs ~20 days on this bench against a configured 16, and that
 * radish runs to book. If the fixtures drift, the demo starts asserting numbers the data
 * does not support - so these are pinned here.
 *
 * Tests `buildDemoTrays` rather than `seedDemoHistory` so no IndexedDB implementation is
 * needed; the write path is a single bulkAdd.
 */

import { describe, it, expect } from 'vitest';
import { aggregateHistory } from '@/lib/webmcp';
import { buildDemoTrays } from '../seed-demo-history';
import { defaultVarieties } from '../seed-varieties';

const SITE = 'site-1';
// Fixed reference time so these assertions never depend on when they run.
const NOW = new Date('2026-08-27T00:00:00Z').getTime();

const trays = buildDemoTrays(SITE, NOW);
const history = aggregateHistory(trays);

const forVariety = (name: string) => history.find((h) => h.variety === name)!;
const configured = (name: string) =>
  defaultVarieties.find((v) => v.name === name)!.typicalDaysToHarvest;

describe('demo growing history', () => {
  it('builds a plausible number of trays, all attached to the site', () => {
    expect(trays.length).toBeGreaterThan(15);
    expect(trays.every((t) => t.siteId === SITE)).toBe(true);
  });

  it('numbers trays chronologically', () => {
    const sownOrder = trays.map((t) => new Date(t.dateSown).getTime());
    const ascending = [...sownOrder].sort((a, b) => a - b);
    expect(sownOrder).toEqual(ascending);
    expect(trays.map((t) => t.trayNumber)).toEqual(trays.map((_, i) => i + 1));
  });

  it('gives basil an observed harvest time well above its configured value', () => {
    const basil = forVariety('Basil');

    // The demo narration claims "about twenty days, not the sixteen configured".
    expect(configured('Basil')).toBe(16);
    expect(basil.avgDaysToHarvest).toBeGreaterThanOrEqual(19);
    expect(basil.avgDaysToHarvest).toBeLessThanOrEqual(21);
  });

  it('gives radish an observed harvest time matching its configured value', () => {
    const radish = forVariety('Radish (China Rose)');

    // The contrast case. Without one variety running to book, "basil runs slow here"
    // reads as a broken calculation rather than a real characteristic of this bench.
    expect(radish.avgDaysToHarvest).toBeGreaterThanOrEqual(configured('Radish (China Rose)'));
    expect(radish.avgDaysToHarvest).toBeLessThanOrEqual(configured('Radish (China Rose)') + 0.5);
  });

  it('backs the basil claim with enough trays to be credible', () => {
    // Below three harvests the divergence is anecdote, and buildAdvisory suppresses it.
    expect(forVariety('Basil').plantings).toBeGreaterThanOrEqual(6);
  });

  it('includes failures so the record is not implausibly clean', () => {
    const withFailures = history.filter((h) => h.failureRate > 0);
    expect(withFailures.length).toBeGreaterThanOrEqual(2);

    // ...but the operation is not failing overall.
    for (const h of history) {
      expect(h.failureRate).toBeLessThan(50);
    }
  });

  it('varies germination rather than reporting one tidy number', () => {
    const rates = trays
      .map((t) => t.germinationRate)
      .filter((r): r is number => typeof r === 'number');

    expect(new Set(rates).size).toBeGreaterThan(5);
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(30);
  });

  it('records problems in the grower own words', () => {
    const basil = forVariety('Basil');

    expect(basil.commonProblems.length).toBeGreaterThan(0);
    expect(basil.commonProblems.join(' ')).toMatch(/cold|damping|germination/i);
  });

  it('records mixed quality grades', () => {
    expect(Object.keys(forVariety('Basil').qualityMix).length).toBeGreaterThan(1);
  });

  it('leaves some trays still growing', () => {
    const growing = trays.filter((t) => !t.dateHarvested);
    expect(growing.length).toBeGreaterThanOrEqual(3);
  });

  it('uses only varieties that are actually configured', () => {
    const known = new Set(defaultVarieties.map((v) => v.name));
    for (const h of history) {
      expect(known.has(h.variety)).toBe(true);
    }
  });

  it('is deterministic for a given reference time', () => {
    const again = aggregateHistory(buildDemoTrays(SITE, NOW));

    // A demo recorded today and re-recorded tomorrow must show identical figures.
    expect(again.map((h) => h.avgDaysToHarvest)).toEqual(
      history.map((h) => h.avgDaysToHarvest),
    );
  });
});
