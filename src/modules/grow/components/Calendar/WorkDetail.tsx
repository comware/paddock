/**
 * WorkDetail - what a piece of work involves, whatever kind it is
 *
 * A scheduled sowing and a tray waiting to be harvested are different records, but from
 * the grower's side they are the same question: what is this, when does it need doing,
 * and what does it lead to. So they get the same dialog rather than one opening a modal
 * and the other navigating away.
 *
 * Both are shown as a sequence - sow, out of blackout, ready - with the steps already
 * behind you marked. A tray is just a plan that has started.
 *
 * Anything an agent proposed says so, and says where its timing came from. Once an agent
 * can put work in someone's calendar, "who put this here and why" stops being obvious.
 */

import { useEffect, useRef, useState } from 'react';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import type { GrowPlannedPlanting, GrowTray, GrowVarietyConfig } from '@/lib/db';
import type { TrayWithComputed } from '../../stores';

/** What the dialog is describing. */
export type WorkSubject =
  | { kind: 'planting'; planting: GrowPlannedPlanting }
  | { kind: 'tray'; tray: TrayWithComputed; focus: 'light' | 'harvest' };

interface WorkDetailProps {
  subject: WorkSubject | null;
  /** Configured defaults for the variety, if any. */
  variety?: GrowVarietyConfig;
  /** Past trays, used to recall what this grower actually sows. */
  trays: GrowTray[];
  /**
   * Do the work from here rather than sending the grower somewhere else to do it. The
   * dialog already knows which tray or which planned sowing it is describing; making them
   * find it again on another screen is the step worth removing.
   */
  onSowNow?: (planting: GrowPlannedPlanting) => void | Promise<void>;
  onMoveToLight?: (trayId: string) => void | Promise<void>;
  onHarvest?: (trayId: string) => void;
  /** Kept for the full record - the dialog is a summary, not a replacement. */
  onOpenTray?: (trayId: string) => void;
  onClose: () => void;
}

interface Step {
  date: Date;
  action: string;
  detail?: string;
  /** Already happened. */
  done?: boolean;
  /** The step this dialog was opened about. */
  focus?: boolean;
}

/**
 * What this grower last used for the variety. Returns nothing rather than inventing a
 * figure - a wrong seed weight is worse than no seed weight.
 */
function lastUsed(trays: GrowTray[], variety: string, before?: Date) {
  const previous = trays
    .filter((t) => t.variety === variety)
    .filter((t) => (before ? new Date(t.dateSown) < before : true))
    .sort((a, b) => new Date(b.dateSown).getTime() - new Date(a.dateSown).getTime())[0];

  return previous
    ? { seedWeight: previous.seedWeight, medium: previous.growingMedium }
    : null;
}

const mediumLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const sowingDetail = (
  seed: { seedWeight: number; medium: string } | null,
  preSoak?: boolean,
) =>
  [
    seed ? `${seed.seedWeight} g seed` : null,
    seed ? `on ${mediumLabel(seed.medium)}` : null,
    preSoak ? 'pre-soak first' : null,
  ]
    .filter(Boolean)
    .join(' · ') || undefined;

export function WorkDetail({
  subject,
  variety,
  trays,
  onSowNow,
  onMoveToLight,
  onHarvest,
  onOpenTray,
  onClose,
}: WorkDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  // Move focus into the dialog so a keyboard user is not left behind, and let Escape
  // dismiss it.
  useEffect(() => {
    if (!subject) return;

    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [subject, onClose]);

  if (!subject) return null;

  const today = new Date();
  const blackoutDays = variety?.defaultBlackoutDays;

  let heading: string;
  let headingDate: Date;
  let statusLine: string | undefined;
  let isProposal = false;
  let fromAgent = false;
  let steps: Step[] = [];
  let adjustment: string | undefined;
  let brief: string | undefined;
  let growingDays: number;
  let varietyName: string;
  let trayId: string | undefined;
  let createdAt: Date | undefined;
  /** The scheduled sowing this dialog describes, when it describes one. */
  const planting = subject.kind === 'planting' ? subject.planting : null;
  const trayFocus = subject.kind === 'tray' ? subject.focus : null;

  if (subject.kind === 'planting') {
    const p = subject.planting;
    const sow = new Date(p.plannedSowDate);
    const harvest = new Date(p.targetHarvestDate);

    varietyName = p.variety;
    growingDays = differenceInCalendarDays(harvest, sow);
    isProposal = p.status === 'proposed';
    fromAgent = p.proposedBy === 'agent';
    createdAt = new Date(p.createdAt);

    const trayWord = p.quantity === 1 ? 'tray' : 'trays';
    heading = `Sow ${p.quantity} ${trayWord} of ${p.variety}`;
    headingDate = sow;
    statusLine = isProposal ? 'Proposed — not scheduled until you approve it' : undefined;

    // The note carries the plan brief and any per-sowing adjustment, joined with an em
    // dash. The adjustment is appended last, so take it from the end - a brief containing
    // its own dash must not be mistaken for one.
    const parts = (p.notes ?? '')
      .split('—')
      .map((part) => part.trim())
      .filter(Boolean);
    adjustment = parts.length > 1 ? parts[parts.length - 1] : undefined;
    brief = parts.length > 1 ? parts.slice(0, -1).join(' — ') : parts[0];

    steps = [
      {
        date: sow,
        action: `Sow ${p.quantity} ${trayWord} of ${p.variety}`,
        detail: sowingDetail(lastUsed(trays, p.variety), variety?.preSoakRequired),
        focus: true,
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
  } else {
    const t = subject.tray;
    const sown = new Date(t.dateSown);
    const trayBlackout = t.blackoutDays || blackoutDays || 0;
    const toLight = addDays(sown, trayBlackout);
    const days = variety?.typicalDaysToHarvest ?? 0;
    const harvest = addDays(sown, days);

    varietyName = t.variety;
    growingDays = days;
    trayId = t.id;

    heading =
      subject.focus === 'harvest'
        ? `Harvest tray #${t.trayNumber}`
        : `Move tray #${t.trayNumber} to light`;
    headingDate = subject.focus === 'harvest' ? harvest : toLight;
    statusLine = `${t.variety} · sown ${format(sown, 'd MMM')} · ${differenceInCalendarDays(today, sown)} days ago`;

    steps = [
      {
        date: sown,
        action: 'Sown',
        detail: sowingDetail(
          { seedWeight: t.seedWeight, medium: t.growingMedium },
          t.preSoaked,
        ),
        done: true,
      },
    ];
    if (trayBlackout) {
      steps.push({
        date: toLight,
        action: 'Move to light',
        detail: `after ${trayBlackout} days in blackout`,
        done: toLight <= today,
        focus: subject.focus === 'light',
      });
    }
    if (days) {
      steps.push({
        date: harvest,
        action: 'Ready to harvest',
        detail: `${days} days from sowing`,
        done: harvest <= today && Boolean(t.dateHarvested),
        focus: subject.focus === 'harvest',
      });
    }

    if (t.problemsObserved) adjustment = t.problemsObserved;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-detail-heading"
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
            {format(headingDate, 'EEEE d MMMM')}
          </p>
          <h2
            id="work-detail-heading"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            {heading}
          </h2>
          {statusLine && (
            <p
              className={`text-sm ${
                isProposal
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {statusLine}
            </p>
          )}
        </div>

        {/* The sequence this work sits in. */}
        <ol className="px-4 py-3 space-y-3">
          {steps.map((step, i) => (
            <li key={step.action} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                    step.focus
                      ? 'bg-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/40'
                      : step.done
                      ? 'bg-slate-400 dark:bg-slate-500'
                      : 'bg-slate-300 dark:bg-slate-600'
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
                  <span
                    className={`text-sm font-semibold ${
                      step.done
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {step.action}
                    {step.done && (
                      <span className="ml-1.5 text-xs font-normal">{' '}done</span>
                    )}
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
            <span className="font-medium">
              {subject.kind === 'tray' ? 'Noted:' : 'Adjusted:'}
            </span>{' '}
            {adjustment}
          </p>
        )}

        {(fromAgent || brief) && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            {fromAgent && createdAt && (
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span aria-hidden="true">🤖</span>
                <span>
                  Proposed by an assistant on {format(createdAt, 'd MMMM')}. The{' '}
                  {growingDays}-day growing time came from your own {varietyName} trays,
                  not the variety default.
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

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-end gap-2">
          {/* A scheduled sowing had no way to become a tray anywhere in the app, so a
              plan could be made and never acted on. */}
          {planting?.status === 'planned' && onSowNow && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSowNow(planting);
                } finally {
                  setBusy(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              Sow this now
            </button>
          )}

          {/* Moving a tray to light is a single state change and never needed a form. */}
          {trayFocus === 'light' && trayId && onMoveToLight && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onMoveToLight(trayId!);
                } finally {
                  setBusy(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              Move to light
            </button>
          )}

          {trayFocus === 'harvest' && trayId && onHarvest && (
            <button
              onClick={() => onHarvest(trayId!)}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              Harvest now
            </button>
          )}

          {trayId && onOpenTray && (
            <button
              onClick={() => onOpenTray(trayId!)}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
            >
              Open tray
            </button>
          )}
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
