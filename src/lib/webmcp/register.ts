/**
 * WebMCP Tool Registration
 *
 * Exposes Paddock's growing data and planning capability to an AI agent running in the
 * browser, without any of it leaving the device.
 *
 * Two constraints from measured runtime behaviour shape this file
 * (see webmcp-challenge/docs/FINDINGS.md):
 *
 *   F2 - `document.modelContext` is not an EventTarget in ChatGPT's implementation, so
 *        the spec's `toolchange` event never fires. Tools registered after the agent's
 *        initial discovery pass may never be seen. Therefore: register the complete set
 *        once, at startup. Tools that have nothing to say return an explicit empty
 *        result rather than being registered conditionally.
 *
 *   F4 - Each tool call costs ~25s of agent deliberation regardless of how trivial the
 *        tool is. Therefore: few tools, each doing one complete unit of user-meaningful
 *        work.
 */

import { buildGrowingContext } from './context';
import { buildPlanOptions, groundingStatement, type SuccessionRequest } from './planner';
import { stageProposal, getProposal } from './proposals';
import { growDb } from '@/lib/db';
import {
  isWebMCPAvailable,
  type ToolDefinition,
  type AnyToolDefinition,
} from './types';

let registered = false;

/**
 * Register Paddock's tools. Safe to call more than once - subsequent calls are ignored,
 * which matters under React StrictMode's double-invoked effects.
 *
 * Never throws: a runtime without WebMCP is the normal case, not an error.
 */
export async function registerPaddockTools(): Promise<{
  registered: boolean;
  reason?: string;
}> {
  if (registered) {
    return { registered: true, reason: 'already registered' };
  }

  if (!isWebMCPAvailable()) {
    return { registered: false, reason: 'WebMCP not available in this runtime' };
  }

  const modelContext = document.modelContext!;

  try {
    for (const tool of TOOLS) {
      await modelContext.registerTool(tool);
    }
    registered = true;
    return { registered: true };
  } catch (error) {
    // A failed registration must never prevent Paddock from running. The app is fully
    // usable by a human without any of this.
    return { registered: false, reason: (error as Error).message };
  }
}

// ============================================
// T1 - get-growing-context
// ============================================

const getGrowingContext: ToolDefinition = {
  name: 'get-growing-context',
  description:
    "Returns the grower's complete current context: their site, configured varieties, " +
    'trays currently growing, per-variety performance history from their own past trays ' +
    '(actual germination rates, harvest weights, and observed days-to-harvest), planned ' +
    'plantings, and tray capacity. Call this first before proposing any planting plan. ' +
    'The history reflects what actually happened on this particular grower\'s bench, ' +
    'which often differs from seed packet timings - prefer it when it is available.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async execute() {
    return await buildGrowingContext();
  },
};

// ============================================
// T2 - propose-succession-plan
// ============================================

interface ProposeInput {
  variety: string;
  harvestFrom: string;
  harvestTo: string;
  cadenceDays?: number;
  traysPerSowing?: number;
  trayBudget?: number;
  unavailable?: Array<{ from: string; to: string; reason?: string }>;
  notes?: string;
}

const proposeSuccessionPlan: ToolDefinition<ProposeInput> = {
  name: 'propose-succession-plan',
  description:
    'Works out a staged succession sowing plan so the grower has a harvest ready on a ' +
    'regular cadence across a date range, and shows it in their planting calendar for ' +
    'approval. Returns several ranked options with different trade-offs. Dates are ' +
    'calculated from how long the variety actually takes on this grower\'s bench, not ' +
    'the configured default. IMPORTANT: this only proposes - nothing is committed until ' +
    'the grower approves an option in the app. Present the options and their trade-offs ' +
    'rather than telling them which to pick.',
  inputSchema: {
    type: 'object',
    properties: {
      variety: {
        type: 'string',
        description: 'Variety name, exactly as it appears in get-growing-context.',
      },
      harvestFrom: {
        type: 'string',
        description: 'First date a harvest is wanted, as YYYY-MM-DD.',
      },
      harvestTo: {
        type: 'string',
        description: 'Last date a harvest is wanted, as YYYY-MM-DD.',
      },
      cadenceDays: {
        type: 'number',
        description: 'Days between harvests. Defaults to 7 (weekly).',
      },
      traysPerSowing: {
        type: 'number',
        description: 'Trays sown per sowing event. Defaults to 1.',
      },
      trayBudget: {
        type: 'number',
        description:
          'Maximum trays that may be growing at once. If the requested cadence needs ' +
          'more than this, a leaner alternative is offered.',
      },
      unavailable: {
        type: 'array',
        description: 'Date ranges when the grower cannot sow (travel, closures).',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'YYYY-MM-DD' },
            to: { type: 'string', description: 'YYYY-MM-DD' },
            reason: { type: 'string' },
          },
          required: ['from', 'to'],
        },
      },
      notes: {
        type: 'string',
        description:
          'ONE short line naming any constraint the data would not know - "north bench ' +
          'catches frost in early October", "market wants volume in December". This is ' +
          'shown against every sowing in the plan, so keep it brief and do not restate ' +
          'the request or repeat parameters already passed above.',
      },
    },
    required: ['variety', 'harvestFrom', 'harvestTo'],
  },

  async execute(input) {
    const context = await buildGrowingContext();

    const configured = context.varieties.find((v) => v.name === input.variety);
    const observed = context.history.find((h) => h.variety === input.variety);

    if (!configured && !observed) {
      return {
        error: `Unknown variety "${input.variety}".`,
        knownVarieties: context.varieties.map((v) => v.name),
      };
    }

    // Prefer what actually happened on this bench. Fall back to the configured value
    // only when there is no harvest history to stand on.
    const daysToHarvest =
      observed?.avgDaysToHarvest ?? configured?.packetDaysToHarvest ?? 14;

    const request: SuccessionRequest = {
      variety: input.variety,
      harvestFrom: input.harvestFrom,
      harvestTo: input.harvestTo,
      cadenceDays: input.cadenceDays ?? 7,
      traysPerSowing: input.traysPerSowing,
      trayBudget: input.trayBudget,
      unavailable: input.unavailable,
      daysToHarvest: Math.round(daysToHarvest),
      configuredDaysToHarvest: configured?.packetDaysToHarvest,
    };

    const options = buildPlanOptions(request);

    if (options.every((o) => o.plantings.length === 0)) {
      return {
        error: 'That harvest window is too short to plan a sowing into.',
        harvestFrom: input.harvestFrom,
        harvestTo: input.harvestTo,
      };
    }

    const sites = await growDb.sites.toArray();
    const siteId = (sites.find((s) => s.isDefault) ?? sites[0])?.id;

    const grounding = groundingStatement(request, observed?.plantings ?? 0);
    const proposalId = await stageProposal(
      options,
      siteId ? String(siteId) : undefined,
      input.notes?.trim() || 'Proposed succession plan',
    );

    return {
      proposalId,
      groundedIn: grounding,
      status:
        'Staged in the planting calendar as PROPOSED. Nothing is committed until the ' +
        'grower approves an option in the app.',
      varietyHistory: observed
        ? {
            plantings: observed.plantings,
            observedDaysToHarvest: observed.avgDaysToHarvest,
            avgHarvestWeight: observed.avgHarvestWeight,
            failureRate: observed.failureRate,
            knownProblems: observed.commonProblems,
          }
        : null,
      options: options.map((o) => ({
        rank: o.rank,
        label: o.label,
        rationale: o.rationale,
        harvestsPlanned: o.coverage.harvestsPlanned,
        firstHarvest: o.coverage.firstHarvest,
        lastHarvest: o.coverage.lastHarvest,
        effectiveCadenceDays: o.coverage.effectiveCadenceDays,
        totalTrays: o.totalTrays,
        peakTrayUsage: o.peakTrayUsage,
        withinTrayBudget: o.withinTrayBudget,
        sowDates: o.plantings.map((p) => p.plannedSowDate),
        adjustments: o.plantings.map((p) => p.adjustment).filter(Boolean),
        // Reported explicitly so a plan cannot quietly stop meeting the cadence it was
        // asked for. Tell the grower about these rather than glossing them.
        continuity: {
          unbroken: o.coverage.gaps.length === 0,
          gaps: o.coverage.gaps,
          windowStartCovered: o.coverage.windowStartCovered,
          harvestsOutsideWindow: o.coverage.harvestsOutsideWindow,
        },
      })),
      // Explain the edges rather than leaving them to be discovered. A first harvest a
      // few days after the requested date is usually the earliest the constraints allow,
      // not a failure - but silence invites the agent to report it as a mismatch.
      windowEdges: options.map((o) => {
        const first = o.coverage.firstHarvest;
        const last = o.coverage.lastHarvest;
        const offset = (a: string | null, b: string) =>
          a ? Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000) : null;

        const startOffset = offset(first, input.harvestFrom);
        const endOffset = offset(last, input.harvestTo);
        const blocked = (input.unavailable ?? [])
          .map((w) => `${w.from} to ${w.to}${w.reason ? ` (${w.reason})` : ''}`)
          .join(', ');

        return {
          option: o.rank,
          firstHarvest: first,
          daysAfterWindowOpens: startOffset,
          lastHarvest: last,
          daysBeforeWindowCloses: endOffset === null ? null : -endOffset,
          explanation:
            startOffset && startOffset > 0
              ? `Earliest possible first harvest is ${first}, ${startOffset} days after ` +
                `${input.harvestFrom}` +
                (blocked ? `, because sowing was blocked ${blocked}.` : '.') +
                ' Not a shortfall - the constraints do not allow earlier.'
              : `First harvest lands on ${first}, as requested.`,
        };
      }),
      caveats: options
        .flatMap((o) => {
          const notes: string[] = [];
          if (o.coverage.gaps.length) {
            notes.push(
              `Option ${o.rank}: ${o.coverage.gaps
                .map((g) => `${g.days}-day gap between ${g.after} and ${g.before}`)
                .join(', ')}.`,
            );
          }
          if (!o.coverage.windowStartCovered) {
            notes.push(
              `Option ${o.rank}: nothing ready within ${o.coverage.effectiveCadenceDays} ` +
                `days of ${input.harvestFrom}.`,
            );
          }
          if (o.coverage.harvestsOutsideWindow.length) {
            notes.push(
              `Option ${o.rank}: harvests outside the requested window on ` +
                `${o.coverage.harvestsOutsideWindow.join(', ')}.`,
            );
          }
          return notes;
        })
        .slice(0, 10),
    };
  },
};

// ============================================
// T3 - explain-plan-choice
// ============================================

interface ExplainInput {
  proposalId?: string;
  option?: number;
}

const explainPlanChoice: ToolDefinition<ExplainInput> = {
  name: 'explain-plan-choice',
  description:
    'Explains a staged planting proposal in words: what is scheduled, when, why those ' +
    'dates, and what past trays the timing is based on. Use when the grower asks why a ' +
    'plan looks the way it does, or when they need the calendar described rather than ' +
    'looked at.',
  inputSchema: {
    type: 'object',
    properties: {
      proposalId: {
        type: 'string',
        description:
          'Proposal to explain. Omit to explain the most recent staged proposal.',
      },
      option: {
        type: 'number',
        description: 'Which ranked option to describe. Omit for all options.',
      },
    },
  },

  async execute(input) {
    const staged = await growDb.plannedPlantings.where('status').equals('proposed').toArray();

    if (staged.length === 0) {
      return {
        proposals: [],
        message: 'There are no staged proposals awaiting a decision.',
      };
    }

    const proposalId =
      input.proposalId ??
      [...staged].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0].proposalId;

    if (!proposalId) {
      return { proposals: [], message: 'No proposal id available.' };
    }

    const rows = await getProposal(proposalId);
    const context = await buildGrowingContext();

    const variety = rows[0]?.variety;
    const history = context.history.find((h) => h.variety === variety);

    const byOption = new Map<number, typeof rows>();
    for (const row of rows) {
      const key = row.proposalOption ?? 1;
      byOption.set(key, [...(byOption.get(key) ?? []), row]);
    }

    const wanted =
      input.option !== undefined ? [input.option] : [...byOption.keys()].sort();

    return {
      proposalId,
      variety,
      basedOn: history
        ? `${history.plantings} past ${variety} trays on this bench, averaging ` +
          `${history.avgDaysToHarvest} days to harvest` +
          (history.commonProblems.length
            ? `. Recorded problems: ${history.commonProblems.join('; ')}`
            : '')
        : `No past ${variety} trays - timing uses the configured default.`,
      options: wanted.map((rank) => {
        const plantings = (byOption.get(rank) ?? []).sort(
          (a, b) =>
            new Date(a.plannedSowDate).getTime() - new Date(b.plannedSowDate).getTime(),
        );

        return {
          option: rank,
          sowings: plantings.length,
          schedule: plantings.map((p) => ({
            sow: new Date(p.plannedSowDate).toISOString().slice(0, 10),
            harvest: new Date(p.targetHarvestDate).toISOString().slice(0, 10),
            trays: p.quantity,
            note: p.notes,
          })),
        };
      }),
      awaitingDecision:
        'These are staged, not committed. The grower approves an option in the ' +
        'planting calendar.',
    };
  },
};

// ============================================
// Registry
// ============================================

const TOOLS: AnyToolDefinition[] = [
  getGrowingContext,
  proposeSuccessionPlan,
  explainPlanChoice,
];

/** Exported for tests and for the dev-only inspector panel. */
export const PADDOCK_TOOL_NAMES = TOOLS.map((t) => t.name);
