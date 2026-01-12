/**
 * SuccessRateChart - Visualize success rates by dimension
 *
 * Horizontal bar chart showing success rates grouped by:
 * - Species
 * - Propagation method
 * - Station
 * - Season
 *
 * Uses Tailwind for styling (no external chart library).
 */

import { useMemo, useState } from 'react';
import type { SuccessRateResult } from '../../utils/analyticsCalculations';
import { getMethodDisplayName } from '../../utils/analyticsCalculations';

type ViewMode = 'species' | 'method' | 'station' | 'season';

interface SuccessRateChartProps {
  bySpecies: SuccessRateResult[];
  byMethod: SuccessRateResult[];
  byStation: SuccessRateResult[];
  bySeason: SuccessRateResult[];
  maxItems?: number;
}

export function SuccessRateChart({
  bySpecies,
  byMethod,
  byStation,
  bySeason,
  maxItems = 8,
}: SuccessRateChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('species');

  // Get data for current view mode
  const data = useMemo(() => {
    switch (viewMode) {
      case 'species':
        return bySpecies.slice(0, maxItems);
      case 'method':
        return byMethod.slice(0, maxItems).map((item) => ({
          ...item,
          dimension: getMethodDisplayName(item.dimension as Parameters<typeof getMethodDisplayName>[0]),
        }));
      case 'station':
        return byStation.slice(0, maxItems);
      case 'season':
        return bySeason;
      default:
        return [];
    }
  }, [viewMode, bySpecies, byMethod, byStation, bySeason, maxItems]);

  const viewModeLabels: Record<ViewMode, string> = {
    species: 'By Species',
    method: 'By Method',
    station: 'By Station',
    season: 'By Season',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      {/* Header with view mode selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Success Rates
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {viewModeLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p>No data available for this view</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <SuccessRateBar key={item.dimension} data={item} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Graduated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-slate-600 dark:text-slate-400">Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-600" />
            <span className="text-slate-600 dark:text-slate-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface SuccessRateBarProps {
  data: SuccessRateResult;
}

function SuccessRateBar({ data }: SuccessRateBarProps) {
  const { dimension, graduated, failed, active, total, successRate } = data;

  // Calculate percentages for stacked bar
  const graduatedPct = total > 0 ? (graduated / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;
  const activePct = total > 0 ? (active / total) * 100 : 0;

  // Determine success rate color
  const rateColor =
    successRate >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : successRate >= 60
      ? 'text-yellow-600 dark:text-yellow-400'
      : successRate >= 40
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
          {dimension}
        </span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            {total} batch{total !== 1 ? 'es' : ''}
          </span>
          <span className={`font-semibold ${rateColor}`}>
            {graduated + failed > 0 ? `${successRate}%` : '--'}
          </span>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
        {graduatedPct > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${graduatedPct}%` }}
            title={`Graduated: ${graduated}`}
          />
        )}
        {failedPct > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${failedPct}%` }}
            title={`Failed: ${failed}`}
          />
        )}
        {activePct > 0 && (
          <div
            className="h-full bg-slate-300 dark:bg-slate-500 transition-all duration-300"
            style={{ width: `${activePct}%` }}
            title={`Active: ${active}`}
          />
        )}
      </div>

      {/* Counts row */}
      <div className="flex gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Graduated: {graduated}</span>
        <span>Failed: {failed}</span>
        <span>Active: {active}</span>
      </div>
    </div>
  );
}
