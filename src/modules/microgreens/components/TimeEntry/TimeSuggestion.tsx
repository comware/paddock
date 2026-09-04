/**
 * TimeSuggestion - offer the day's time rather than asking for it
 *
 * Logging time by hand means recalling a whole day, in minutes, across seven categories.
 * A dashboard reading "0h this week" is what that produces.
 *
 * The app knows what happened. What it has to work out is how long those things take this
 * grower, which it derives from days where they logged both - the same approach as
 * days-to-harvest, and for the same reason: their bench, their pace, not a generic rate.
 *
 * Offered, never applied. The estimate is a starting point for a record the grower owns.
 */

import { useMemo, useState } from 'react';
import {
  countActivity,
  deriveRates,
  estimateTime,
  type TimeEstimate,
} from '../../utils';
import { useTimeEntries, useTrays, TIME_CATEGORIES, type TimeCategory } from '../../stores';

interface TimeSuggestionProps {
  siteId?: string;
  /** True when time has already been logged today - the offer is then unwanted. */
  alreadyLogged: boolean;
}

const formatTime = (minutes: number): string =>
  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`.replace(' 0m', '');

export function TimeSuggestion({ siteId, alreadyLogged }: TimeSuggestionProps) {
  const { trays } = useTrays();
  const { entries, addTimeToCategory } = useTimeEntries();
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const estimate: TimeEstimate | null = useMemo(() => {
    const siteTrays = siteId ? trays.filter((t) => !t.siteId || t.siteId === siteId) : trays;
    const rates = deriveRates(entries, siteTrays);
    return estimateTime(countActivity(siteTrays, new Date()), rates);
  }, [trays, entries, siteId]);

  if (!estimate || alreadyLogged || dismissed || !siteId) return null;

  const handleApply = async () => {
    setApplying(true);
    try {
      for (const [category, minutes] of Object.entries(estimate.minutes)) {
        if (minutes) await addTimeToCategory(category as TimeCategory, minutes, siteId);
      }
      setDismissed(true);
    } finally {
      setApplying(false);
    }
  };

  const labelFor = (category: string) =>
    TIME_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  return (
    <section
      aria-labelledby="time-suggestion-heading"
      className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 overflow-hidden"
    >
      <div className="px-4 py-3">
        <h3
          id="time-suggestion-heading"
          className="text-sm font-bold text-slate-900 dark:text-white"
        >
          Looks like about {formatTime(estimate.totalMinutes)} today
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          From {estimate.basis.join(', ')}.{' '}
          {estimate.personalised
            ? 'Rates are from your own logged days.'
            : 'Rough rates for now — these get more accurate as you log time.'}
        </p>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(estimate.minutes).map(([category, minutes]) => (
            <li key={category} className="text-xs text-slate-700 dark:text-slate-200">
              <span className="font-medium">{labelFor(category)}</span>{' '}
              {formatTime(minutes ?? 0)}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/40 border-t border-primary-100 dark:border-primary-800 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={handleApply}
          disabled={applying}
          className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          Log this
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
        >
          I'll do it myself
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You can adjust any category afterwards.
        </p>
      </div>
    </section>
  );
}
