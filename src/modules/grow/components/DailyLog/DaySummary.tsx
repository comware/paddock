/**
 * DaySummary - the part of the daily log the app can fill in itself
 *
 * Replaces three fields the grower used to type: trays in blackout, trays in light, trays
 * harvested today. The old form displayed the correct answer directly beneath each input,
 * which made the transcription hard to justify.
 *
 * Two things are shown that the old form never asked about, because they are what a log
 * is actually read for later: what changed today, and what is overdue.
 */

import type { DaySummary as DaySummaryData } from '../../utils';

interface DaySummaryProps {
  summary: DaySummaryData;
  /** Offered when there is something worth copying into "actions taken". */
  onUseAsActions?: () => void;
  actionsAlreadyFilled?: boolean;
}

export function DaySummary({
  summary,
  onUseAsActions,
  actionsAlreadyFilled,
}: DaySummaryProps) {
  const { counts, happened, due } = summary;

  const countRows = [
    { label: 'In blackout', value: counts.blackout },
    { label: 'In light', value: counts.light },
    { label: 'Harvested today', value: counts.harvestedToday },
  ];

  return (
    <section
      aria-labelledby="day-summary-heading"
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2
          id="day-summary-heading"
          className="text-base font-bold text-slate-900 dark:text-white"
        >
          Today on the bench
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Taken from your tray records — nothing to fill in.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-700">
        {countRows.map((row) => (
          <div key={row.label} className="bg-white dark:bg-slate-800 px-3 py-2.5">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{row.label}</dt>
            <dd className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {happened.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              What changed
            </h3>
            {onUseAsActions && !actionsAlreadyFilled && (
              <button
                type="button"
                onClick={onUseAsActions}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Copy into actions taken
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {happened.map((event) => (
              <li
                key={`${event.kind}-${event.trayId ?? event.text}`}
                className="text-sm text-slate-700 dark:text-slate-200 flex gap-2"
              >
                <span aria-hidden="true">
                  {event.kind === 'sown' ? '🌱' : event.kind === 'harvested' ? '🌿' : '💡'}
                </span>
                <span>{event.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {due.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-amber-50/60 dark:bg-amber-950/20">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Needs attention
          </h3>
          <ul className="space-y-1">
            {due.map((item) => (
              <li
                key={`${item.kind}-${item.trayId ?? item.plantingId ?? item.text}`}
                className="text-sm text-amber-900 dark:text-amber-100 flex justify-between gap-3"
              >
                <span>{item.text}</span>
                <span className="text-xs whitespace-nowrap text-amber-700 dark:text-amber-300">
                  {item.overdueDays === 0
                    ? 'today'
                    : `${item.overdueDays} ${item.overdueDays === 1 ? 'day' : 'days'} ago`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {happened.length === 0 && due.length === 0 && (
        <p className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
          Nothing due and nothing changed today.
        </p>
      )}
    </section>
  );
}
