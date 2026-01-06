/**
 * VarietyComparison - Per-variety performance analytics
 *
 * Shows stats table, grade distribution, and bar chart comparison.
 * Highlights best performing variety.
 */

import { useEffect, useMemo } from 'react';
import { useTrays, useExperiment, type VarietyStats } from '../../stores';

// Grade colors for distribution bars
const GRADE_COLORS = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-amber-500',
  F: 'bg-red-500',
};

export function VarietyComparison() {
  const { trays, loadTrays, isLoading: traysLoading } = useTrays();
  const { loadExperiment, getVarietyStats } = useExperiment();

  useEffect(() => {
    loadTrays();
    loadExperiment();
  }, [loadTrays, loadExperiment]);

  const varietyStats = useMemo(() => {
    return getVarietyStats(trays);
  }, [trays, getVarietyStats]);

  // Find best performer (highest success rate with at least 2 harvested trays)
  const bestVariety = useMemo(() => {
    const qualified = varietyStats.filter((v) => v.traysHarvested >= 2);
    if (qualified.length === 0) return null;
    return qualified.reduce((best, v) =>
      v.successRate > best.successRate ? v : best
    );
  }, [varietyStats]);

  if (traysLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (varietyStats.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
          No variety data yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Harvest some trays to see variety comparisons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Performer Highlight */}
      {bestVariety && (
        <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏆</div>
            <div>
              <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                Best Performer
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {bestVariety.variety}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {bestVariety.successRate}% success rate •{' '}
                {bestVariety.avgYieldRatio}x yield ratio •{' '}
                {bestVariety.traysHarvested} trays harvested
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            Variety Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Variety
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Grown
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Harvested
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Success
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Yield
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Avg Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Grades
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {varietyStats.map((stats) => (
                <VarietyRow key={stats.variety} stats={stats} isBest={stats.variety === bestVariety?.variety} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart Comparison */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Success Rate Comparison
        </h3>
        <div className="space-y-3">
          {varietyStats.map((stats) => (
            <div key={stats.variety} className="flex items-center gap-3">
              <div className="w-28 text-sm text-slate-600 dark:text-slate-400 truncate">
                {stats.variety}
              </div>
              <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stats.successRate >= 80
                      ? 'bg-green-500'
                      : stats.successRate >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
              <div className="w-12 text-right text-sm font-medium text-slate-900 dark:text-white">
                {stats.successRate}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Yield Ratio Comparison */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Yield Ratio Comparison
        </h3>
        <div className="space-y-3">
          {varietyStats.filter((s) => s.avgYieldRatio > 0).map((stats) => (
            <div key={stats.variety} className="flex items-center gap-3">
              <div className="w-28 text-sm text-slate-600 dark:text-slate-400 truncate">
                {stats.variety}
              </div>
              <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stats.avgYieldRatio >= 8
                      ? 'bg-green-500'
                      : stats.avgYieldRatio >= 6
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min((stats.avgYieldRatio / 12) * 100, 100)}%` }}
                />
              </div>
              <div className="w-12 text-right text-sm font-medium text-slate-900 dark:text-white">
                {stats.avgYieldRatio}x
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Target: 6x yield ratio (harvest weight ÷ seed weight)
        </p>
      </div>
    </div>
  );
}

// ============================================
// SUBCOMPONENTS
// ============================================

interface VarietyRowProps {
  stats: VarietyStats;
  isBest: boolean;
}

function VarietyRow({ stats, isBest }: VarietyRowProps) {
  const totalGrades = Object.values(stats.gradeDistribution).reduce((a, b) => a + b, 0);

  return (
    <tr className={isBest ? 'bg-green-50/50 dark:bg-green-900/10' : ''}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isBest && <span className="text-green-500">🏆</span>}
          <span className="font-medium text-slate-900 dark:text-white">
            {stats.variety}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
        {stats.traysGrown}
      </td>
      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
        {stats.traysHarvested}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`font-medium ${
            stats.successRate >= 80
              ? 'text-green-600 dark:text-green-400'
              : stats.successRate >= 60
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {stats.successRate}%
        </span>
      </td>
      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
        {stats.avgYieldRatio > 0 ? `${stats.avgYieldRatio}x` : '—'}
      </td>
      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
        {stats.avgDaysToHarvest > 0 ? `${stats.avgDaysToHarvest}d` : '—'}
      </td>
      <td className="px-4 py-3">
        {totalGrades > 0 ? (
          <div className="flex h-4 rounded overflow-hidden w-24">
            {(['A', 'B', 'C', 'F'] as const).map((grade) => {
              const count = stats.gradeDistribution[grade] || 0;
              const percent = (count / totalGrades) * 100;
              if (percent === 0) return null;
              return (
                <div
                  key={grade}
                  className={`${GRADE_COLORS[grade]} transition-all`}
                  style={{ width: `${percent}%` }}
                  title={`${grade}: ${count}`}
                />
              );
            })}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}
