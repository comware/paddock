/**
 * TimingAccuracy - how long things actually take here
 *
 * Every variety carries a configured days-to-harvest, taken from the packet. What matters
 * is how long it takes on *this* bench, which is a different number and the only one
 * worth planning against.
 *
 * This aggregation was written for the WebMCP tools first: an agent asking about the
 * grower's operation got observed timings, divergence from the defaults, failure rates
 * and recorded problems. The grower's own analytics page did not show any of it - the
 * assistant had a better view of the operation than the person running it.
 *
 * Same computation, now on screen for the person whose trays produced it.
 */

import { useMemo } from 'react';
import { aggregateHistory } from '@/lib/webmcp';
import { useTrays, useVarieties } from '../../stores';

/** Below this many harvests, a difference is anecdote rather than a characteristic. */
const MIN_SAMPLE = 3;

/** Days of divergence worth acting on when planning a weekly succession. */
const MEANINGFUL_DAYS = 2;

export function TimingAccuracy() {
  const { trays } = useTrays();
  const { varieties } = useVarieties();

  const rows = useMemo(() => {
    return aggregateHistory(trays)
      .map((history) => {
        const config = varieties.find((v) => v.name === history.variety);
        const configured = config?.typicalDaysToHarvest;
        const observed = history.avgDaysToHarvest;

        return {
          ...history,
          configured,
          observed,
          delta:
            observed !== null && configured !== undefined
              ? Math.round((observed - configured) * 10) / 10
              : null,
        };
      })
      .filter((row) => row.observed !== null)
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  }, [trays, varieties]);

  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">⏱️</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
          Nothing harvested yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Once you have harvested a few trays, this will show how long each variety
          actually takes on your bench.
        </p>
      </div>
    );
  }

  const notable = rows.filter(
    (r) => r.plantings >= MIN_SAMPLE && Math.abs(r.delta ?? 0) >= MEANINGFUL_DAYS,
  );

  return (
    <section className="card p-6">
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
        How long things actually take
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Your own harvests against the days-to-harvest configured for each variety.
      </p>

      {notable.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            {notable.map((r, i) => (
              <span key={r.variety}>
                {i > 0 && ' '}
                <strong>{r.variety}</strong> runs{' '}
                {Math.abs(r.delta!)} {Math.abs(r.delta!) === 1 ? 'day' : 'days'}{' '}
                {r.delta! > 0 ? 'slower' : 'faster'} here than its configured{' '}
                {r.configured} days.
              </span>
            ))}{' '}
            Worth planning against the observed figure.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th scope="col" className="py-2 pr-3 font-medium">Variety</th>
              <th scope="col" className="py-2 px-3 font-medium text-right">Trays</th>
              <th scope="col" className="py-2 px-3 font-medium text-right">Configured</th>
              <th scope="col" className="py-2 px-3 font-medium text-right">Observed</th>
              <th scope="col" className="py-2 px-3 font-medium text-right">Difference</th>
              <th scope="col" className="py-2 pl-3 font-medium text-right">Failures</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row) => {
              const thin = row.plantings < MIN_SAMPLE;

              return (
                <tr key={row.variety}>
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {row.variety}
                    </span>
                    {thin && (
                      // Say so rather than presenting a two-tray average as a finding.
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        too few to draw on yet
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.plantings}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.configured ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                    {row.observed}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                      row.delta === null || thin
                        ? 'text-slate-400 dark:text-slate-500'
                        : Math.abs(row.delta) >= MEANINGFUL_DAYS
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {row.delta === null
                      ? '—'
                      : `${row.delta > 0 ? '+' : ''}${row.delta}`}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.failureRate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.some((r) => r.commonProblems.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            What you recorded going wrong
          </h4>
          <ul className="space-y-1.5">
            {rows
              .filter((r) => r.commonProblems.length > 0)
              .map((r) => (
                <li key={r.variety} className="text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {r.variety}:
                  </span>{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    {r.commonProblems.join('; ')}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
