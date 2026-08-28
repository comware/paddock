/**
 * ProposalReview - review and decide on an agent-staged planting plan
 *
 * An AI agent can stage a succession plan through WebMCP, but it cannot commit one. This
 * is where a person looks at what was proposed, compares the alternatives, and decides.
 *
 * The whole plan is shown at once as a timeline rather than through the week-by-week
 * calendar, because the decision is about shape - where the sowings cluster, how many
 * trays are tied up, where the gaps fall. That is not visible seven days at a time.
 */

import { useMemo, useState } from 'react';
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { GrowPlannedPlanting } from '@/lib/db';
import { useToastStore } from '@/stores/useToastStore';
import { usePlannedPlantings, useVarieties } from '../../stores';

interface ProposalReviewProps {
  /**
   * Called with the first scheduled sow date after an option is approved, so the calendar
   * can move to where the work actually lands. Approving a plan that starts weeks out
   * otherwise leaves the grower staring at an unchanged, empty week.
   */
  onApproved?: (firstSowDate: Date) => void;
}

interface OptionSummary {
  option: number;
  plantings: GrowPlannedPlanting[];
  sowings: number;
  totalTrays: number;
  peakTrays: number;
  cadenceDays: number | null;
  firstHarvest: Date;
  lastHarvest: Date;
  adjustments: string[];
}

/** Peak simultaneous tray occupancy - mirrors the planner's sweep. */
function peakTrays(plantings: GrowPlannedPlanting[]): number {
  const events = plantings.flatMap((p) => [
    { at: new Date(p.plannedSowDate).getTime(), delta: p.quantity },
    { at: new Date(p.targetHarvestDate).getTime() + 1, delta: -p.quantity },
  ]);
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  let current = 0;
  let peak = 0;
  for (const e of events) {
    current += e.delta;
    peak = Math.max(peak, current);
  }
  return peak;
}

/** Median gap between harvests. Median rather than mean so one shifted sowing does not
 *  misrepresent the cadence the grower would actually experience. */
function cadenceOf(plantings: GrowPlannedPlanting[]): number | null {
  if (plantings.length < 2) return null;

  const harvests = plantings
    .map((p) => new Date(p.targetHarvestDate).getTime())
    .sort((a, b) => a - b);

  const gaps = harvests
    .slice(1)
    .map((h, i) => Math.round((h - harvests[i]) / 86_400_000))
    .sort((a, b) => a - b);

  return gaps[Math.floor(gaps.length / 2)];
}

export function ProposalReview({ onApproved }: ProposalReviewProps = {}) {
  const { plantings, approveProposal, declineProposal, reopenProposal } =
    usePlannedPlantings();
  const { getVariety } = useVarieties();
  const addToast = useToastStore((state) => state.add);
  const addToastWithUndo = useToastStore((state) => state.addWithUndo);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // The most recently staged proposal still awaiting a decision.
  const proposal = useMemo(() => {
    const staged = plantings.filter((p) => p.status === 'proposed' && p.proposalId);
    if (staged.length === 0) return null;

    const newest = staged.reduce((a, b) =>
      new Date(a.createdAt) >= new Date(b.createdAt) ? a : b,
    );
    const rows = staged.filter((p) => p.proposalId === newest.proposalId);

    const byOption = new Map<number, GrowPlannedPlanting[]>();
    for (const row of rows) {
      const key = row.proposalOption ?? 1;
      byOption.set(key, [...(byOption.get(key) ?? []), row]);
    }

    const options: OptionSummary[] = [...byOption.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([option, rows]) => {
        const sorted = [...rows].sort(
          (a, b) =>
            new Date(a.plannedSowDate).getTime() - new Date(b.plannedSowDate).getTime(),
        );
        const harvests = sorted
          .map((p) => new Date(p.targetHarvestDate))
          .sort((a, b) => a.getTime() - b.getTime());

        return {
          option,
          plantings: sorted,
          sowings: sorted.length,
          totalTrays: sorted.reduce((sum, p) => sum + p.quantity, 0),
          peakTrays: peakTrays(sorted),
          cadenceDays: cadenceOf(sorted),
          firstHarvest: harvests[0],
          lastHarvest: harvests[harvests.length - 1],
          adjustments: sorted
            .map((p) => p.notes)
            .filter((n): n is string => Boolean(n && n.includes('sown')))
            .map((n) => n.split('—').pop()!.trim()),
        };
      });

    return { id: newest.proposalId!, variety: rows[0].variety, options };
  }, [plantings]);

  if (!proposal) return null;

  const active =
    proposal.options.find((o) => o.option === selected) ?? proposal.options[0];

  // Derive what the plan was grounded in from the plan itself: the gap between sowing and
  // harvest is the timing the agent actually used. Comparing it to the configured value
  // shows whether history or the default was in play.
  const usedDays = differenceInCalendarDays(
    new Date(active.plantings[0].targetHarvestDate),
    new Date(active.plantings[0].plannedSowDate),
  );
  const configuredDays = getVariety(proposal.variety)?.typicalDaysToHarvest;
  const divergence =
    configuredDays !== undefined ? usedDays - configuredDays : null;

  // Timeline bounds, padded a little so end bars are not flush against the edge.
  const start = startOfDay(
    new Date(
      Math.min(...active.plantings.map((p) => new Date(p.plannedSowDate).getTime())),
    ),
  );
  const end = startOfDay(active.lastHarvest);
  const span = Math.max(differenceInCalendarDays(end, start), 1);

  const handleApprove = async () => {
    setBusy(true);
    // Held before the write, because the panel unmounts as soon as it succeeds and the
    // undo closure would otherwise capture a proposal that no longer resolves.
    const proposalId = proposal.id;
    const firstSow = new Date(active.plantings[0].plannedSowDate);
    const count = active.sowings;

    try {
      await approveProposal(proposal.id, active.option);

      // The panel disappears on success, so without these the only feedback is an empty
      // week and a calendar that did not move. The undo matters more here than anywhere
      // else: this is the most consequential single click in the app.
      addToastWithUndo(
        `Scheduled ${count} ${count === 1 ? 'sowing' : 'sowings'} — first on ${format(firstSow, 'd MMMM')}`,
        () => reopenProposal(proposalId),
      );
      onApproved?.(firstSow);
    } catch {
      addToast('Could not schedule that plan. Nothing was changed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    const proposalId = proposal.id;
    const count = proposal.options.length;

    try {
      await declineProposal(proposal.id);
      addToastWithUndo(
        `Discarded ${count} proposed ${count === 1 ? 'option' : 'options'}`,
        () => reopenProposal(proposalId),
      );
    } catch {
      addToast('Could not discard that proposal.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="proposal-heading"
      className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="proposal-heading"
              className="text-base font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2"
            >
              <span aria-hidden="true">🤖</span>
              Proposed plan — {proposal.variety}
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Staged by an assistant. Nothing is scheduled until you approve an option.
            </p>
          </div>
          <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
            Awaiting your decision
          </span>
        </div>

        {divergence !== null && (
          <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
            {Math.abs(divergence) >= 1 ? (
              <>
                Planned at <strong>{usedDays} days</strong> to harvest, not the configured{' '}
                <strong>{configuredDays}</strong> — that is what your own {proposal.variety}{' '}
                trays actually did.
              </>
            ) : (
              <>
                Planned at <strong>{usedDays} days</strong> to harvest, matching your own
                tray history.
              </>
            )}
          </p>
        )}
      </div>

      {/* Option selector */}
      <div
        role="tablist"
        aria-label="Plan options"
        className="flex flex-wrap gap-2 p-3 border-b border-amber-200 dark:border-amber-800"
      >
        {proposal.options.map((o) => {
          const isActive = o.option === active.option;
          return (
            <button
              key={o.option}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(o.option)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                isActive
                  ? 'bg-white dark:bg-slate-800 border-amber-500 dark:border-amber-400 shadow-sm'
                  : 'bg-amber-50/60 dark:bg-slate-800/40 border-amber-200 dark:border-amber-800 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Option {o.option}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {o.cadenceDays ? `every ${o.cadenceDays} days` : 'single sowing'} ·{' '}
                {o.peakTrays} {o.peakTrays === 1 ? 'tray' : 'trays'} at a time
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-amber-200 dark:bg-amber-800">
        {[
          { label: 'Sowings', value: String(active.sowings) },
          { label: 'Trays total', value: String(active.totalTrays) },
          { label: 'At once (peak)', value: String(active.peakTrays) },
          {
            label: 'Harvests',
            value: `${format(active.firstHarvest, 'd MMM')} – ${format(active.lastHarvest, 'd MMM')}`,
          },
        ].map((s) => (
          <div key={s.label} className="bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
            <dt className="text-xs text-amber-700 dark:text-amber-300">{s.label}</dt>
            <dd className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Timeline. Each row is one sowing, drawn from sow date to harvest date, so
          overlapping bars show directly how many trays are tied up at once. */}
      <div className="p-4">
        <ul className="space-y-1.5">
          {active.plantings.map((p) => {
            const sow = new Date(p.plannedSowDate);
            const harvest = new Date(p.targetHarvestDate);
            const offset = (differenceInCalendarDays(sow, start) / span) * 100;
            const width = Math.max(
              (differenceInCalendarDays(harvest, sow) / span) * 100,
              2,
            );

            return (
              <li key={p.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {format(sow, 'd MMM')}
                </span>
                <div className="relative flex-1 h-6 rounded bg-amber-100/70 dark:bg-slate-800/70">
                  <div
                    className="absolute inset-y-0 rounded bg-amber-400/80 dark:bg-amber-500/70 border border-amber-500 dark:border-amber-400 flex items-center justify-end pr-1.5"
                    style={{ left: `${offset}%`, width: `${width}%` }}
                    title={`${p.quantity}x ${p.variety}: sow ${format(sow, 'd MMM')}, harvest ${format(harvest, 'd MMM')}`}
                  >
                    <span className="text-[10px] font-semibold text-amber-950 whitespace-nowrap">
                      {format(harvest, 'd MMM')}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {active.adjustments.length > 0 && (
          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
            <strong>Adjusted:</strong> {active.adjustments.join('; ')}
          </p>
        )}

        {/* A plain-language equivalent of the timeline, for anyone not reading it
            visually. The bars above are decorative once this exists. */}
        <p className="sr-only">
          Option {active.option}: {active.sowings} sowings of {proposal.variety},{' '}
          {active.totalTrays} trays in total, at most {active.peakTrays} growing at once.
          {active.plantings.map(
            (p) =>
              ` Sow ${p.quantity} on ${format(new Date(p.plannedSowDate), 'd MMMM')}, harvest ${format(new Date(p.targetHarvestDate), 'd MMMM')}.`,
          )}
        </p>
      </div>

      {/* Decision */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-100/60 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800">
        <button
          onClick={handleApprove}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          Approve option {active.option}
        </button>
        <button
          onClick={handleDecline}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
        >
          Discard all options
        </button>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Approving schedules option {active.option} and discards the others.
        </p>
      </div>
    </section>
  );
}
