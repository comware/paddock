/**
 * Growing Context Builder
 *
 * Assembles everything an agent needs to reason about this grower's operation into a
 * single payload.
 *
 * Why one big payload instead of several small tools: each agent tool call costs roughly
 * 25 seconds of model deliberation regardless of how trivial the tool is (measured, see
 * webmcp-challenge/docs/FINDINGS.md F4). Four small tools would be unusable. One
 * coarse-grained call is not a shortcut - it is the correct shape for this transport.
 *
 * Everything here is read from IndexedDB. None of it exists on a server, because Paddock
 * has no server.
 */

import { growDb, platformDb } from '@/lib/db';
import type { GrowTray, GrowSite } from '@/lib/db';

// ============================================
// Types
// ============================================

export interface VarietyHistory {
  variety: string;
  plantings: number;
  /** Percent, averaged across trays that recorded it. Null when never recorded. */
  avgGerminationRate: number | null;
  /** Grams, averaged across harvested trays. Null when nothing harvested yet. */
  avgHarvestWeight: number | null;
  /**
   * The number that matters: actual observed sow-to-harvest days for THIS grower on
   * THIS bench. Usually diverges from the seed packet, which is the whole point.
   */
  avgDaysToHarvest: number | null;
  /** e.g. { A: 4, B: 2 } - only grades actually recorded */
  qualityMix: Record<string, number>;
  /** Free-text problems the grower recorded, deduped, most recent first. */
  commonProblems: string[];
  failureRate: number;
}

export interface GrowingContext {
  site: {
    name: string;
    timezone: string;
    isIndoor: boolean;
  } | null;
  varieties: Array<{
    name: string;
    packetDaysToHarvest: number;
    defaultBlackoutDays: number;
    preSoakRequired: boolean;
    seedCostPerKg: number;
  }>;
  inFlight: Array<{
    trayNumber: number;
    variety: string;
    dateSown: string;
    daysSinceSown: number;
    expectedHarvest: string | null;
  }>;
  history: VarietyHistory[];
  planned: Array<{
    variety: string;
    plannedSowDate: string;
    targetHarvestDate: string;
    quantity: number;
    status: string;
  }>;
  capacity: {
    totalTrays: number;
    currentlyOccupied: number;
  };
  /** Present when history contradicts packet timings - the agent should prefer history. */
  advisory?: string;
}

// ============================================
// Helpers
// ============================================

const iso = (d: Date | undefined | null): string | null =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

const daysBetween = (a: Date, b: Date): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

const mean = (xs: number[]): number | null =>
  xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null;

/**
 * A tray counts as failed if it was graded F, or explicitly marked unsellable after
 * harvest. Trays still growing are neither failed nor successful yet.
 */
const isFailed = (t: GrowTray): boolean =>
  t.qualityGrade === 'F' || (Boolean(t.dateHarvested) && t.sellable === false);

// ============================================
// History aggregation
// ============================================

/**
 * Roll per-tray records up into per-variety performance.
 *
 * Deliberately does NOT fill gaps with defaults - a variety with no harvests yet
 * reports null rather than a guess, so the agent can tell "no data" from "poor
 * performance" and say so.
 */
export function aggregateHistory(trays: GrowTray[]): VarietyHistory[] {
  const byVariety = new Map<string, GrowTray[]>();
  for (const tray of trays) {
    const list = byVariety.get(tray.variety) ?? [];
    list.push(tray);
    byVariety.set(tray.variety, list);
  }

  const out: VarietyHistory[] = [];

  for (const [variety, vTrays] of byVariety) {
    const harvested = vTrays.filter((t) => t.dateHarvested);

    const germRates = vTrays
      .map((t) => t.germinationRate)
      .filter((r): r is number => typeof r === 'number');

    const weights = harvested
      .map((t) => t.harvestWeight)
      .filter((w): w is number => typeof w === 'number');

    const daysToHarvest = harvested
      .map((t) => daysBetween(t.dateSown, t.dateHarvested as Date))
      .filter((d) => d > 0 && d < 120); // guard against bad data

    const qualityMix: Record<string, number> = {};
    for (const t of harvested) {
      if (t.qualityGrade) {
        qualityMix[t.qualityGrade] = (qualityMix[t.qualityGrade] ?? 0) + 1;
      }
    }

    const commonProblems = [...vTrays]
      .sort((a, b) => new Date(b.dateSown).getTime() - new Date(a.dateSown).getTime())
      .map((t) => t.problemsObserved?.trim())
      .filter((p): p is string => Boolean(p));

    out.push({
      variety,
      plantings: vTrays.length,
      avgGerminationRate: mean(germRates),
      avgHarvestWeight: mean(weights),
      avgDaysToHarvest: mean(daysToHarvest),
      qualityMix,
      commonProblems: [...new Set(commonProblems)].slice(0, 3),
      failureRate: vTrays.length
        ? Math.round((vTrays.filter(isFailed).length / vTrays.length) * 100)
        : 0,
    });
  }

  return out.sort((a, b) => b.plantings - a.plantings);
}

/**
 * Flag varieties where this grower's observed timing differs from the packet by enough
 * to change a succession plan. Threshold of 2 days is roughly where a weekly cadence
 * starts to drift within a season.
 */
function buildAdvisory(
  history: VarietyHistory[],
  varieties: GrowingContext['varieties'],
): string | undefined {
  const notes: string[] = [];

  for (const h of history) {
    if (h.avgDaysToHarvest === null || h.plantings < 3) continue;
    const cfg = varieties.find((v) => v.name === h.variety);
    if (!cfg?.packetDaysToHarvest) continue;

    const delta = h.avgDaysToHarvest - cfg.packetDaysToHarvest;
    if (Math.abs(delta) >= 2) {
      notes.push(
        `${h.variety}: observed ${h.avgDaysToHarvest} days to harvest across ` +
          `${h.plantings} trays, vs ${cfg.packetDaysToHarvest} configured ` +
          `(${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}).`,
      );
    }
  }

  if (!notes.length) return undefined;

  return (
    'Prefer observed history over configured defaults when planning dates. ' +
    notes.join(' ')
  );
}

// ============================================
// Entry point
// ============================================

export async function buildGrowingContext(): Promise<GrowingContext> {
  const [sites, varietyConfigs, trays, plannedPlantings] = await Promise.all([
    platformDb.sites.toArray(),
    growDb.varietyConfigs.toArray(),
    growDb.trays.toArray(),
    growDb.plannedPlantings.toArray(),
  ]);

  const site: GrowSite | undefined = sites.find((s) => s.isDefault) ?? sites[0];

  const varieties = varietyConfigs.map((v) => ({
    name: v.name,
    packetDaysToHarvest: v.typicalDaysToHarvest,
    defaultBlackoutDays: v.defaultBlackoutDays,
    preSoakRequired: v.preSoakRequired,
    seedCostPerKg: v.seedCostPerKg,
  }));

  const now = new Date();
  const growing = trays.filter((t) => !t.dateHarvested);
  const history = aggregateHistory(trays);

  const inFlight = growing.map((t) => {
    const observed = history.find((h) => h.variety === t.variety)?.avgDaysToHarvest;
    const cfg = varieties.find((v) => v.name === t.variety);
    const days = observed ?? cfg?.packetDaysToHarvest ?? null;

    return {
      trayNumber: t.trayNumber,
      variety: t.variety,
      dateSown: iso(t.dateSown) as string,
      daysSinceSown: daysBetween(t.dateSown, now),
      expectedHarvest:
        days === null
          ? null
          : iso(new Date(new Date(t.dateSown).getTime() + days * 86_400_000)),
    };
  });

  return {
    site: site
      ? { name: site.name, timezone: site.timezone, isIndoor: site.isIndoor }
      : null,
    varieties,
    inFlight,
    history,
    planned: plannedPlantings
      .filter((p) => p.status === 'planned' || p.status === 'proposed')
      .map((p) => ({
        variety: p.variety,
        plannedSowDate: iso(p.plannedSowDate) as string,
        targetHarvestDate: iso(p.targetHarvestDate) as string,
        quantity: p.quantity,
        status: p.status,
      })),
    capacity: {
      totalTrays: trays.length,
      currentlyOccupied: growing.length,
    },
    advisory: buildAdvisory(history, varieties),
  };
}
