/**
 * WeatherOutcome - does the weather explain the growing times?
 *
 * Paddock has been recording daily temperature and humidity, and separately recording how
 * long each tray took, without ever putting the two together. "The greenhouse is cold and
 * basil runs slow here" stayed an intuition while the data to test it sat on disk.
 *
 * Deliberately understated. This is a handful of trays from one bench over one season, so
 * it is presented as something to look at rather than a result - and where the numbers do
 * not support a claim, none is made.
 */

import { useEffect, useState } from 'react';
import { platformDb } from '@/lib/db';
import type { GrowWeatherHistory } from '@/lib/db';
import { correlateAllVarieties, type WeatherCorrelation } from '../../utils';
import { useTrays } from '../../stores';

export function WeatherOutcome() {
  const { trays } = useTrays();
  const [weather, setWeather] = useState<GrowWeatherHistory[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    platformDb.weatherHistory
      .toArray()
      .then((rows) => {
        if (!cancelled) setWeather(rows);
      })
      .catch(() => {
        if (!cancelled) setWeather([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (weather === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const correlations: WeatherCorrelation[] = correlateAllVarieties(trays, weather);

  if (weather.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">🌤️</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
          No weather history yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Turn weather on for this site and Paddock will record conditions daily. After a
          season it can tell you whether they explain your growing times.
        </p>
      </div>
    );
  }

  if (correlations.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">🌤️</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
          Not enough harvests to compare yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This needs at least five harvested trays of one variety, grown across a range of
          temperatures. {weather.length} days of weather recorded so far.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {correlations.map((correlation) => {
        const slowest = Math.max(...correlation.buckets.map((b) => b.avgDaysToHarvest));

        return (
          <section key={correlation.variety} className="card p-6">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
              {correlation.variety} against temperature
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {correlation.trayCount} harvested trays, grouped by the average temperature
              across each one&rsquo;s growing period.
            </p>

            {correlation.finding ? (
              <p className="mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-100">
                {correlation.finding}
              </p>
            ) : (
              <p className="mb-4 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 text-sm text-slate-600 dark:text-slate-300">
                No clear relationship between temperature and how long {correlation.variety}{' '}
                takes here.
              </p>
            )}

            <ul className="space-y-2">
              {correlation.buckets.map((bucket) => (
                <li key={bucket.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm text-slate-600 dark:text-slate-300">
                    {bucket.label}
                  </span>
                  <span className="w-16 shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                    {bucket.avgTemperature}°C
                  </span>
                  <div className="flex-1 h-6 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded bg-primary-400 dark:bg-primary-600 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max((bucket.avgDaysToHarvest / slowest) * 100, 12)}%`,
                      }}
                    >
                      <span className="text-xs font-semibold text-white whitespace-nowrap">
                        {bucket.avgDaysToHarvest} days
                      </span>
                    </div>
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                    {bucket.trays} {bucket.trays === 1 ? 'tray' : 'trays'}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              One bench, one season. Worth a look, not a conclusion.
            </p>
          </section>
        );
      })}
    </div>
  );
}
