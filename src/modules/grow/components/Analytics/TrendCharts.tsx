/**
 * TrendCharts - Time-based trend visualizations
 *
 * Shows yield ratio over time, mood trends, and weekly summaries.
 * Uses simple CSS-based charts (no Recharts dependency yet).
 */

import { useEffect, useMemo } from 'react';
import { format, startOfWeek } from 'date-fns';
import { useTrays, useObservations, useTimeEntries, useExperiment } from '../../stores';

export function TrendCharts() {
  const { trays, loadTrays } = useTrays();
  const { loadObservations, getMoodTrend } = useObservations();
  const { loadEntries, getDailyTotals } = useTimeEntries();
  const { loadExperiment, getExperimentMetrics } = useExperiment();

  useEffect(() => {
    loadTrays();
    loadObservations();
    loadEntries();
    loadExperiment();
  }, [loadTrays, loadObservations, loadEntries, loadExperiment]);

  const experimentMetrics = useMemo(() => getExperimentMetrics(trays), [trays, getExperimentMetrics]);
  const moodTrend = useMemo(() => getMoodTrend(), [getMoodTrend]);
  const timeByDay = useMemo(() => getDailyTotals(14), [getDailyTotals]);

  // Group harvests by week for yield trend
  const yieldByWeek = useMemo(() => {
    const harvested = trays.filter((t) => t.dateHarvested && t.harvestWeight);
    const weekMap = new Map<string, { yields: number[]; count: number }>();

    for (const tray of harvested) {
      const week = format(startOfWeek(new Date(tray.dateHarvested!), { weekStartsOn: 1 }), 'MMM d');
      if (!weekMap.has(week)) {
        weekMap.set(week, { yields: [], count: 0 });
      }
      const entry = weekMap.get(week)!;
      const yieldRatio = tray.seedWeight > 0 ? (tray.harvestWeight || 0) / tray.seedWeight : 0;
      entry.yields.push(yieldRatio);
      entry.count++;
    }

    return Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        avgYield: data.yields.length > 0
          ? Math.round((data.yields.reduce((a, b) => a + b, 0) / data.yields.length) * 100) / 100
          : 0,
        count: data.count,
      }))
      .slice(-6); // Last 6 weeks
  }, [trays]);

  return (
    <div className="space-y-6">
      {/* Experiment Progress */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Experiment Progress
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Days Elapsed"
            value={experimentMetrics.daysElapsed}
            suffix="days"
            subtext={`Week ${Math.min(experimentMetrics.weeksElapsed + 1, 6)} of 6`}
          />
          <StatCard
            label="Trays Completed"
            value={experimentMetrics.harvestedTrays}
            suffix={`/ ${experimentMetrics.totalTrays}`}
            subtext={`${experimentMetrics.failedTrays} failed`}
          />
          <StatCard
            label="Success Rate"
            value={experimentMetrics.overallSuccessRate}
            suffix="%"
            color={experimentMetrics.overallSuccessRate >= 80 ? 'green' : experimentMetrics.overallSuccessRate >= 60 ? 'amber' : 'red'}
          />
          <StatCard
            label="Avg Yield"
            value={experimentMetrics.avgYieldRatio}
            suffix="x"
            color={experimentMetrics.avgYieldRatio >= 6 ? 'green' : 'amber'}
          />
        </div>

        {/* Progress bar to Week 6 */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Progress to Week 6</span>
            <span>{Math.round((experimentMetrics.daysElapsed / 42) * 100)}%</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${Math.min((experimentMetrics.daysElapsed / 42) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Start</span>
            <span>Week 6</span>
          </div>
        </div>
      </div>

      {/* Yield Trend */}
      {yieldByWeek.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Yield Ratio by Week
          </h3>
          <div className="flex items-end gap-2 h-32">
            {yieldByWeek.map((week, i) => {
              const maxYield = Math.max(...yieldByWeek.map((w) => w.avgYield), 10);
              const heightPercent = (week.avgYield / maxYield) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {week.avgYield}x
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        week.avgYield >= 6 ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ height: `${Math.max(heightPercent, 10)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {week.week}
                  </div>
                  <div className="text-xs text-slate-400">
                    ({week.count})
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>≥6x target</span>
            <div className="w-3 h-3 bg-amber-500 rounded ml-4" />
            <span>&lt;6x below target</span>
          </div>
        </div>
      )}

      {/* Mood Trend */}
      {moodTrend.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Mood & Energy Trend
          </h3>
          <div className="flex items-end gap-1 h-24">
            {moodTrend.slice(-14).map((day, i) => {
              const heightPercent = (day.mood / 10) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        day.mood >= 7
                          ? 'bg-green-500'
                          : day.mood >= 5
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.date}: ${day.mood}/10`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>{moodTrend[0]?.date}</span>
            <span>{moodTrend[moodTrend.length - 1]?.date}</span>
          </div>
          <div className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400">
            Average: {(moodTrend.reduce((sum, d) => sum + d.mood, 0) / moodTrend.length).toFixed(1)}/10
          </div>
        </div>
      )}

      {/* Time Spent Trend */}
      {timeByDay.some((d) => d.minutes > 0) && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Time Spent (Last 2 Weeks)
          </h3>
          <div className="flex items-end gap-1 h-24">
            {timeByDay.map((day, i) => {
              const maxMinutes = Math.max(...timeByDay.map((d) => d.minutes), 120);
              const heightPercent = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        day.minutes > 0 ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      title={`${day.date}: ${day.minutes}min`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUBCOMPONENTS
// ============================================

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  subtext?: string;
  color?: 'green' | 'amber' | 'red';
}

function StatCard({ label, value, suffix, subtext, color }: StatCardProps) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-slate-900 dark:text-white'}`}>
        {value}
        {suffix && <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </div>
      {subtext && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}
