/**
 * EventDetail - what to do on the day
 *
 * A calendar entry is only useful if it tells the grower what the day actually requires.
 * "1x Basil, 19 days" is a fact; "sow one tray, 26 g on coco coir, keep it dark until the
 * 21st" is an instruction.
 *
 * So this leads with the action and its steps, and puts the reference data underneath.
 * Seed weight and medium come from what this grower last used for the variety rather than
 * from a default - it is their bench, and they have already worked out what suits it.
 *
 * Anything an agent proposed says so, and says where its timing came from. Once an agent
 * can put entries in someone's calendar, "who put this here and why" stops being obvious.
 */

import { useEffect, useRef } from 'react';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import type { GrowPlannedPlanting, GrowTray, GrowVarietyConfig } from '@/lib/db';

interface EventDetailProps {
  planting: GrowPlannedPlanting | null;
  /** Configured defaults for the variety, if any. */
  variety?: GrowVarietyConfig;
  /** Past trays, used to recall what this grower actually sows. */
  trays: GrowTray[];
  onClose: () => void;
}

interface Step {
  date: Date;
  action: string;
  detail?: string;
}

/**
 * What this grower last used for the variety. Falls back to nothing rather than inventing
 * a figure - a wrong seed weight is worse than no seed weight.
 */
function lastUsed(trays: GrowTray[], variety: string) {
  const previous = trays
    .filter((t) => t.variety === variety)
    .sort((a, b) => new Date(b.dateSown).getTime() - new Date(a.dateSown).getTime())[0];

  return previous
    ? { seedWeight: previous.seedWeight, medium: previous.growingMedium }
    : null;
}

/** Turn a medium's stored value into something readable. */
const mediumLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function EventDetail({ planting, variety, trays, onClose }: EventDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog so a keyboard user is not left behind on the calendar,
  // and let Escape dismiss it.
  useEffect(() => {
    if (!planting) return;

    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [planting, onClose]);

  if (!planting) return null;

  const sow = new Date(planting.plannedSowDate);
  const harvest = new Date(planting.targetHarvestDate);
  const growingDays = differenceInCalendarDays(harvest, sow);
  const fromAgent = planting.proposedBy === 'agent';
  const isProposal = planting.status === 'proposed';
  const trayWord = planting.quantity === 1 ? 'tray' : 'trays';

  const previous = lastUsed(trays, planting.variety);
  const blackoutDays = variety?.defaultBlackoutDays;

  // The note carries the plan brief and any per-sowing adjustment, joined with an em
  // dash. Split them: the adjustment is specific to this day, the brief is context.
  // The adjustment is appended last, so take it from the end - a brief containing its own
  // dash must not be mistaken for one.
  const noteParts = (planting.notes ?? '')
    .split('—')
    .map((part) => part.trim())
    .filter(Boolean);
  const adjustment = noteParts.length > 1 ? noteParts[noteParts.length - 1] : undefined;
  const brief = noteParts.length > 1 ? noteParts.slice(0, -1).join(' — ') : noteParts[0];

  const steps: Step[] = [
    {
      date: sow,
      action: `Sow ${planting.quantity} ${trayWord} of ${planting.variety}`,
      detail: [
        previous ? `${previous.seedWeight} g seed` : null,
        previous ? `on ${mediumLabel(previous.medium)}` : null,
        variety?.preSoakRequired ? 'pre-soak first' : null,
      ]
        .filter(Boolean)
        .join(' · '),
    },
  ];

  if (blackoutDays) {
    steps.push({
      date: addDays(sow, blackoutDays),
      action: 'Move to light',
      detail: `after ${blackoutDays} days in blackout`,
    });
  }

  steps.push({
    date: harvest,
    action: 'Ready to harvest',
    detail: `${growingDays} days from sowing`,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-heading"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Lead with the action, not the record. */}
        <div
          className={`px-4 py-3 border-b ${
            isProposal
              ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800'
              : 'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {format(sow, 'EEEE d MMMM')}
          </p>
          <h2
            id="event-detail-heading"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            Sow {planting.quantity} {trayWord} of {planting.variety}
          </h2>
          {isProposal && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Proposed — not scheduled until you approve it
            </p>
          )}
        </div>

        {/* The sequence this sowing sets in motion. */}
        <ol className="px-4 py-3 space-y-3">
          {steps.map((step, i) => (
            <li key={step.action} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                    i === 0 ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="flex-1 w-px bg-slate-200 dark:bg-slate-600 my-1"
                  />
                )}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex justify-between gap-3 items-baseline">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {step.action}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {format(step.date, 'EEE d MMM')}
                  </span>
                </div>
                {step.detail && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {adjustment && (
          <p className="mx-4 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium">Adjusted:</span> {adjustment}
          </p>
        )}

        {(fromAgent || brief) && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            {fromAgent && (
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span aria-hidden="true">🤖</span>
                <span>
                  Proposed by an assistant on{' '}
                  {format(new Date(planting.createdAt), 'd MMMM')}. The {growingDays}-day
                  growing time came from your own {planting.variety} trays, not the
                  variety default.
                </span>
              </p>
            )}
            {brief && (
              <details className="text-xs text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
                  What was asked for
                </summary>
                <p className="mt-1 pl-1">{brief}</p>
              </details>
            )}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            ref={closeRef}
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
