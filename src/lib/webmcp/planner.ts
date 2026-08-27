/**
 * Succession Planning
 *
 * Works out when to sow so there is something ready to harvest on a regular cadence
 * across a target window.
 *
 * The division of labour matters here. The *agent* turns "basil every week from October
 * through February, I'm away the second week of September" into structured intent. This
 * module then does the domain arithmetic deterministically - dates, overlaps, tray
 * occupancy - and hands back ranked options.
 *
 * Doing the arithmetic in the page rather than in the model is deliberate:
 *
 *   - It is testable. Dates either line up or they do not.
 *   - It is grounded. It plans against what this grower's trays actually did, not what
 *     the seed packet claims.
 *   - It is fast. Each agent round trip costs ~25s (FINDINGS F4); arithmetic costs none.
 *
 * The agent contributes language and judgement. The page contributes domain truth.
 */

const DAY = 86_400_000;

// ============================================
// Types
// ============================================

export interface UnavailableWindow {
  from: string; // ISO date
  to: string; // ISO date
  reason?: string;
}

export interface SuccessionRequest {
  variety: string;
  /** First date a harvest is wanted. ISO. */
  harvestFrom: string;
  /** Last date a harvest is wanted. ISO. */
  harvestTo: string;
  /** Days between successive harvests. */
  cadenceDays: number;
  /** Trays sown per sowing event. */
  traysPerSowing?: number;
  /** Maximum trays that may be occupied at any one moment. */
  trayBudget?: number;
  unavailable?: UnavailableWindow[];
  /** Observed sow-to-harvest days for this variety on this bench. */
  daysToHarvest: number;
  /** What the variety config says, for explaining the difference. */
  configuredDaysToHarvest?: number;
}

export interface ProposedPlanting {
  variety: string;
  plannedSowDate: string;
  targetHarvestDate: string;
  quantity: number;
  /** Set when the sow date had to move off its ideal position. */
  adjustment?: string;
}

export interface PlanOption {
  rank: number;
  strategy: 'tight' | 'lean' | 'buffered';
  label: string;
  rationale: string;
  plantings: ProposedPlanting[];
  coverage: {
    harvestsPlanned: number;
    firstHarvest: string | null;
    lastHarvest: string | null;
    /** Cadence actually achieved, which may differ from the one requested. */
    effectiveCadenceDays: number;
    /** Intervals longer than the requested cadence. Empty means unbroken continuity. */
    gaps: Array<{ after: string; before: string; days: number }>;
    /** Harvests landing outside the requested window - early ones are usually waste. */
    harvestsOutsideWindow: string[];
    /** Whether anything is ready within one cadence of the window opening. */
    windowStartCovered: boolean;
  };
  peakTrayUsage: number;
  withinTrayBudget: boolean;
  totalTrays: number;
}

// ============================================
// Date helpers
// ============================================

const toDate = (iso: string): Date => new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY);

const inWindow = (d: Date, w: UnavailableWindow): boolean =>
  d >= toDate(w.from) && d <= toDate(w.to);

/**
 * Move a sow date out of an unavailable window.
 *
 * Both directions are considered. Sowing before the grower leaves is the instinctive
 * answer, but it is not always the right one: shifting earlier can land the harvest
 * before the window the grower actually asked for, which wastes it entirely. Shifting
 * later delays a harvest but keeps it inside the window.
 *
 * So: prefer whichever shift keeps the harvest inside the requested window, and among
 * those the one closest to the date originally wanted. Earlier wins ties, since a
 * slightly over-mature tray is more use than one that is not ready.
 *
 * Adjacent windows are handled by scanning outward rather than recursing - two windows a
 * day apart would otherwise bounce a recursive search between them forever.
 */

/** Nearest date in the given direction that is not inside any window. */
function scanClear(
  from: Date,
  step: -1 | 1,
  windows: UnavailableWindow[],
  maxDays = 400,
): Date | null {
  let d = from;
  for (let i = 0; i < maxDays; i++) {
    if (!windows.some((w) => inWindow(d, w))) return d;
    d = addDays(d, step);
  }
  return null; // Blocked for longer than any plausible planning horizon.
}

function avoidUnavailable(
  sow: Date,
  windows: UnavailableWindow[],
  opts: { daysToHarvest: number; harvestFrom: Date; harvestTo: Date },
): { date: Date; adjustment?: string } {
  const hit = windows.find((w) => inWindow(sow, w));
  if (!hit) return { date: sow };

  const idealHarvest = addDays(sow, opts.daysToHarvest);

  const earlier = scanClear(addDays(toDate(hit.from), -1), -1, windows);
  const later = scanClear(addDays(toDate(hit.to), 1), 1, windows);

  const candidates = [
    earlier ? { date: earlier, direction: 'early' as const } : null,
    later ? { date: later, direction: 'late' as const } : null,
  ]
    .filter((c): c is { date: Date; direction: 'early' | 'late' } => c !== null)
    .map((c) => {
      const harvest = addDays(c.date, opts.daysToHarvest);
      return {
        ...c,
        harvest,
        inWindow: harvest >= opts.harvestFrom && harvest <= opts.harvestTo,
        distance: Math.abs(harvest.getTime() - idealHarvest.getTime()),
      };
    });

  // Blocked in both directions for longer than the planning horizon - leave it be rather
  // than inventing a date.
  if (candidates.length === 0) return { date: sow };

  const best = candidates.sort((a, b) => {
    if (a.inWindow !== b.inWindow) return a.inWindow ? -1 : 1;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.direction === 'early' ? -1 : 1;
  })[0];

  const shifted = Math.abs(Math.round((sow.getTime() - best.date.getTime()) / DAY));

  return {
    date: best.date,
    adjustment:
      `sown ${shifted} day${shifted === 1 ? '' : 's'} ${best.direction} to clear ` +
      (hit.reason ? `${hit.reason} ` : '') +
      `(${hit.from} to ${hit.to})`,
  };
}

/**
 * Find breaks in harvest continuity.
 *
 * A plan that quietly stops meeting the cadence it was asked for is worse than one that
 * admits it. Reports every interval longer than the requested cadence, plus harvests that
 * fall outside the window entirely.
 */
export function findCoverageGaps(
  plantings: ProposedPlanting[],
  cadenceDays: number,
  harvestFrom: string,
  harvestTo: string,
): {
  gaps: Array<{ after: string; before: string; days: number }>;
  harvestsOutsideWindow: string[];
  windowStartCovered: boolean;
} {
  const harvests = plantings.map((p) => p.targetHarvestDate).sort();

  const gaps: Array<{ after: string; before: string; days: number }> = [];
  for (let i = 1; i < harvests.length; i++) {
    const days = Math.round(
      (toDate(harvests[i]).getTime() - toDate(harvests[i - 1]).getTime()) / DAY,
    );
    if (days > cadenceDays) {
      gaps.push({ after: harvests[i - 1], before: harvests[i], days });
    }
  }

  const outside = harvests.filter((h) => h < harvestFrom || h > harvestTo);

  // The window is covered from the start if something is ready within one cadence of the
  // date the grower asked for.
  const firstInside = harvests.find((h) => h >= harvestFrom);
  const windowStartCovered =
    firstInside !== undefined &&
    Math.round((toDate(firstInside).getTime() - toDate(harvestFrom).getTime()) / DAY) <=
      cadenceDays;

  return { gaps, harvestsOutsideWindow: outside, windowStartCovered };
}

// ============================================
// Occupancy
// ============================================

/**
 * Peak simultaneous tray occupancy across a plan.
 *
 * A tray is occupied from the day it is sown until the day it is harvested. Sweeping the
 * boundaries is enough - occupancy only changes when a tray starts or finishes.
 */
export function peakOccupancy(plantings: ProposedPlanting[]): number {
  const events: Array<{ at: number; delta: number }> = [];

  for (const p of plantings) {
    events.push({ at: toDate(p.plannedSowDate).getTime(), delta: p.quantity });
    events.push({ at: toDate(p.targetHarvestDate).getTime() + 1, delta: -p.quantity });
  }

  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  let current = 0;
  let peak = 0;
  for (const e of events) {
    current += e.delta;
    peak = Math.max(peak, current);
  }

  return peak;
}

// ============================================
// Schedule construction
// ============================================

function buildSchedule(
  req: SuccessionRequest,
  cadenceDays: number,
  extraLeadDays: number,
): ProposedPlanting[] {
  const from = toDate(req.harvestFrom);
  const to = toDate(req.harvestTo);
  const quantity = req.traysPerSowing ?? 1;
  const windows = req.unavailable ?? [];
  const lead = req.daysToHarvest + extraLeadDays;

  const plantings: ProposedPlanting[] = [];
  const seen = new Set<string>();

  for (let harvest = from; harvest <= to; harvest = addDays(harvest, cadenceDays)) {
    const ideal = addDays(harvest, -lead);
    const { date: sow, adjustment } = avoidUnavailable(ideal, windows, {
      daysToHarvest: req.daysToHarvest,
      harvestFrom: from,
      harvestTo: to,
    });

    // Shifting out of an unavailable window can collide with the previous sowing.
    const key = toISO(sow);
    if (seen.has(key)) continue;
    seen.add(key);

    plantings.push({
      variety: req.variety,
      plannedSowDate: key,
      // Harvest tracks the actual sow date, so an early sowing reports an early harvest
      // rather than silently claiming the ideal one.
      targetHarvestDate: toISO(addDays(sow, req.daysToHarvest)),
      quantity,
      adjustment,
    });
  }

  return plantings;
}

function summarise(
  req: SuccessionRequest,
  plantings: ProposedPlanting[],
  strategy: PlanOption['strategy'],
  label: string,
  rationale: string,
  cadenceDays: number,
): Omit<PlanOption, 'rank'> {
  const peak = peakOccupancy(plantings);
  const harvests = plantings.map((p) => p.targetHarvestDate).sort();
  const continuity = findCoverageGaps(
    plantings,
    cadenceDays,
    req.harvestFrom,
    req.harvestTo,
  );

  return {
    strategy,
    label,
    rationale,
    plantings,
    coverage: {
      harvestsPlanned: plantings.length,
      firstHarvest: harvests[0] ?? null,
      lastHarvest: harvests[harvests.length - 1] ?? null,
      effectiveCadenceDays: cadenceDays,
      ...continuity,
    },
    peakTrayUsage: peak,
    withinTrayBudget: req.trayBudget === undefined || peak <= req.trayBudget,
    totalTrays: plantings.reduce((sum, p) => sum + p.quantity, 0),
  };
}

// ============================================
// Strategies
// ============================================

/**
 * Build several genuinely different plans rather than one answer.
 *
 * This is not decoration. A single recommendation turns the grower into an approver; a
 * ranked set with stated trade-offs leaves the decision where it belongs. The person
 * knows things the data does not - which bench catches frost, which market wants volume
 * in December.
 */
export function buildPlanOptions(req: SuccessionRequest): PlanOption[] {
  const options: Array<Omit<PlanOption, 'rank'>> = [];

  // 1. Exactly what was asked for.
  const tight = buildSchedule(req, req.cadenceDays, 0);
  options.push(
    summarise(
      req,
      tight,
      'tight',
      `Every ${req.cadenceDays} days as asked`,
      `Sows every ${req.cadenceDays} days at ${req.daysToHarvest} days to harvest. ` +
        'Highest continuity, highest tray usage.',
      req.cadenceDays,
    ),
  );

  // 2. Stretch the cadence until peak occupancy fits the tray budget. Only offered when
  //    the tight plan actually exceeds it - otherwise it is the same plan twice.
  if (req.trayBudget !== undefined && peakOccupancy(tight) > req.trayBudget) {
    let cadence = req.cadenceDays;
    let lean = tight;

    // Bounded: cadence never usefully exceeds the growing period itself, since one tray
    // has finished before the next is sown.
    while (peakOccupancy(lean) > req.trayBudget && cadence < req.daysToHarvest * 2) {
      cadence += 1;
      lean = buildSchedule(req, cadence, 0);
    }

    options.push(
      summarise(
        req,
        lean,
        'lean',
        `Every ${cadence} days to stay within ${req.trayBudget} trays`,
        `Stretches the gap to ${cadence} days so no more than ${req.trayBudget} trays ` +
          'are ever occupied at once. Slightly less continuity.',
        cadence,
      ),
    );
  }

  // 3. Sow two days early throughout. Cheap insurance on a bench that has already shown
  //    it runs slower than the packet.
  const buffered = buildSchedule(req, req.cadenceDays, 2);
  options.push(
    summarise(
      req,
      buffered,
      'buffered',
      `Every ${req.cadenceDays} days, sown 2 days early`,
      'Adds two days of slack against a slow run. Harvest a little early rather than ' +
        'miss a week.',
      req.cadenceDays,
    ),
  );

  // Rank: fit the tray budget, then keep continuity unbroken, then cover the start of the
  // window, then more harvests, then fewer trays.
  //
  // Continuity outranks harvest count deliberately. A plan with more harvests and a
  // three-week hole in the middle is worse for someone supplying a weekly market than a
  // plan with fewer, evenly spaced ones.
  return options
    .sort((a, b) => {
      if (a.withinTrayBudget !== b.withinTrayBudget) return a.withinTrayBudget ? -1 : 1;
      if (a.coverage.gaps.length !== b.coverage.gaps.length) {
        return a.coverage.gaps.length - b.coverage.gaps.length;
      }
      if (a.coverage.windowStartCovered !== b.coverage.windowStartCovered) {
        return a.coverage.windowStartCovered ? -1 : 1;
      }
      if (a.coverage.harvestsPlanned !== b.coverage.harvestsPlanned) {
        return b.coverage.harvestsPlanned - a.coverage.harvestsPlanned;
      }
      return a.totalTrays - b.totalTrays;
    })
    .map((o, i) => ({ ...o, rank: i + 1 }));
}

/**
 * One sentence explaining what the plan was grounded in.
 *
 * Stated plainly because it is the whole argument: these dates come from this grower's
 * own trays, which exist only in this browser.
 */
export function groundingStatement(req: SuccessionRequest, sampleSize: number): string {
  const configured = req.configuredDaysToHarvest;

  if (configured === undefined || sampleSize === 0) {
    return (
      `Planned at ${req.daysToHarvest} days to harvest for ${req.variety}. ` +
      'No harvest history yet, so this uses the configured default.'
    );
  }

  const delta = Math.round((req.daysToHarvest - configured) * 10) / 10;

  if (Math.abs(delta) < 1) {
    return (
      `Planned at ${req.daysToHarvest} days, matching your configured ${configured} ` +
      `and confirmed across ${sampleSize} of your own ${req.variety} trays.`
    );
  }

  return (
    `Planned at ${req.daysToHarvest} days, not the configured ${configured} — that is ` +
    `what ${req.variety} actually did across ${sampleSize} trays on your bench ` +
    `(${delta > 0 ? '+' : ''}${delta} days).`
  );
}
