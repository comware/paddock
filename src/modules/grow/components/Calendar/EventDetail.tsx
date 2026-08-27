/**
 * EventDetail - what a calendar entry actually is
 *
 * The calendar has room for a variety name and not much else. This is where the rest of
 * it lives: when it will be ready, how long that assumes, and - for anything an agent
 * proposed - where the plan came from and what was said at the time.
 *
 * Provenance matters here. Once an agent can put entries in a grower's calendar, "who put
 * this here and why" stops being obvious, and the answer should be one click away rather
 * than something to reconstruct.
 */

import { useEffect, useRef } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import type { GrowPlannedPlanting } from '@/lib/db';

interface EventDetailProps {
  planting: GrowPlannedPlanting | null;
  onClose: () => void;
}

export function EventDetail({ planting, onClose }: EventDetailProps) {
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

  const rows: Array<[string, string]> = [
    ['Sow', format(sow, 'EEEE d MMMM yyyy')],
    ['Ready', format(harvest, 'EEEE d MMMM yyyy')],
    ['Growing time', `${growingDays} days`],
    ['Trays', String(planting.quantity)],
  ];

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
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden"
      >
        <div
          className={`px-4 py-3 border-b ${
            isProposal
              ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
          }`}
        >
          <h2
            id="event-detail-heading"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            {planting.quantity}× {planting.variety}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isProposal
              ? 'Proposed — not scheduled yet'
              : planting.status === 'planned'
              ? 'Scheduled'
              : planting.status === 'converted'
              ? 'Sown'
              : 'Cancelled'}
          </p>
        </div>

        <dl className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-white text-right">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {(fromAgent || planting.notes) && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
            {fromAgent && (
              <p className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                <span aria-hidden="true">🤖</span>
                <span>
                  From a plan proposed by an assistant on{' '}
                  {format(new Date(planting.createdAt), 'd MMMM')}. The{' '}
                  {growingDays}-day growing time came from your own {planting.variety}{' '}
                  trays.
                </span>
              </p>
            )}
            {planting.notes && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Note:</span> {planting.notes}
              </p>
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
