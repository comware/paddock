/**
 * TimeStats - Weekly time tracking summary
 *
 * Shows progress toward weekly target, category breakdown,
 * and daily totals for the past week.
 */

import { LoadingState } from '@/components/shared';
import { useEffect } from 'react';
import { useTimeEntries } from '../../stores';

export function TimeStats() {
  const {
    loadEntries,
    getThisWeeksTotal,
    getWeeklyTarget,
    getCategoryTotals,
    getDailyTotals,
    isLoading,
  } = useTimeEntries();

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const weeklyTotal = getThisWeeksTotal();
  const weeklyTarget = getWeeklyTarget();
  const categoryTotals = getCategoryTotals('week');
  const dailyTotals = getDailyTotals(7);

  const progressPercent = Math.min((weeklyTotal / weeklyTarget) * 100, 100);
  const onTrack = weeklyTotal >= (weeklyTarget * (new Date().getDay() || 7)) / 7;

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <LoadingState />
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Progress */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          This Week
        </h2>

        {/* Progress Ring Visual */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-200 dark:text-slate-700"
              />
              {/* Progress circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${progressPercent * 2.51} 251`}
                strokeLinecap="round"
                className={onTrack ? 'text-green-500' : 'text-amber-500'}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatTime(weeklyTotal)}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              of {formatTime(weeklyTarget)} target
            </div>
            <div className={`text-sm mt-1 ${onTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {onTrack ? '✓ On track' : '⚠ Behind pace'}
            </div>
          </div>
        </div>

        {/* Daily Breakdown Chart */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Daily Activity
          </h3>
          <div className="flex items-end gap-1 h-20">
            {dailyTotals.map((day, i) => {
              const maxMinutes = Math.max(...dailyTotals.map((d) => d.minutes), 120);
              const heightPercent = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        day.minutes > 0
                          ? 'bg-primary-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Time by Category
        </h3>

        {categoryTotals.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No time logged this week yet.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryTotals.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {cat.icon} {cat.label}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatTime(cat.minutes)}
                    <span className="text-slate-400 dark:text-slate-500 ml-1">
                      ({cat.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatTime(Math.round(weeklyTotal / Math.max(dailyTotals.filter((d) => d.minutes > 0).length, 1)))}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Avg per day worked
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {dailyTotals.filter((d) => d.minutes > 0).length}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Days active
          </div>
        </div>
      </div>
    </div>
  );
}
