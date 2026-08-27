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
 * Always shifts *earlier*. A grower who will be away sows before they leave; sowing after
 * they return would leave a gap they have already decided to accept. Shifting earlier
 * costs a slightly older tray at harvest, which is recoverable - a missed sowing is not.
 */
function avoidUnavailable(
  sow: Date,
  windows: UnavailableWindow[],
): { date: Date; adjustment?: string } {
  const hit = windows.find((w) => inWindow(sow, w));
  if (!hit) return { date: sow };

  const movedTo = addDays(toDate(hit.from), -1);
  const shifted = Math.round((sow.getTime() - movedTo.getTime()) / DAY);

  return {
    date: movedTo,
    adjustment:
      `sown ${shifted} day${shifted === 1 ? '' : 's'} early to clear ` +
      (hit.reason ? `${hit.reason} ` : '') +
      `(${hit.from} to ${hit.to})`,
  };
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
    const { date: sow, adjustment } = avoidUnavailable(ideal, windows);

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

  // Rank: fitting the tray budget beats everything, then more harvests, then fewer trays.
  return options
    .sort((a, b) => {
      if (a.withinTrayBudget !== b.withinTrayBudget) return a.withinTrayBudget ? -1 : 1;
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
