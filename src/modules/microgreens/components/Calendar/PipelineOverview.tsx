/**
 * PipelineOverview - Visual representation of the growing pipeline
 *
 * Shows:
 * - Stage counts (planned, blackout, light, ready)
 * - Daily harvest forecast for next 7 days
 * - Gap indicators for days with no expected harvests
 */

import { useMemo, useEffect } from 'react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { useTrays, useVarieties, usePlannedPlantings } from '../../stores';
import { getUpcomingHarvests, type UpcomingHarvest } from '../../utils';

interface PipelineOverviewProps {
  daysAhead?: number;
}

export function PipelineOverview({ daysAhead = 7 }: PipelineOverviewProps) {
  const { trays, loadTrays } = useTrays();
  const { getVariety, loadVarieties } = useVarieties();
  const { plantings, loadPlantings } = usePlannedPlantings();

  // Load data on mount
  useEffect(() => {
    loadTrays();
    loadVarieties();
    loadPlantings();
  }, [loadTrays, loadVarieties, loadPlantings]);

  // Calculate stage counts
  const stageCounts = useMemo(() => {
    const plannedCount = plantings.filter((p) => p.status === 'planned').length;
    const blackoutCount = trays.filter((t) => t.status === 'blackout').length;
    const lightCount = trays.filter((t) => t.status === 'light').length;

    // Ready to harvest - trays in light that are at or past expected harvest date
    const activeTrays = trays.filter((t) => t.status === 'blackout' || t.status === 'light');
    const upcoming = getUpcomingHarvests(activeTrays, getVariety, 0);
    const readyCount = upcoming.filter((h) => h.daysRemaining <= 0).length;

    return { plannedCount, blackoutCount, lightCount, readyCount };
  }, [trays, plantings, getVariety]);

  // Calculate daily harvest forecast
  const harvestForecast = useMemo(() => {
    const today = startOfDay(new Date());
    const activeTrays = trays.filter((t) => t.status === 'blackout' || t.status === 'light');
    const upcoming = getUpcomingHarvests(activeTrays, getVariety, daysAhead);

    // Group by day
    const forecast: { date: Date; count: number; harvests: UpcomingHarvest[] }[] = [];

    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(today, i);
      const dayHarvests = upcoming.filter((h) => isSameDay(h.expectedDate, date));
      forecast.push({
        date,
        count: dayHarvests.length,
        harvests: dayHarvests,
      });
    }

    return forecast;
  }, [trays, getVariety, daysAhead]);

  // Identify gaps (days with no harvests when pipeline is active)
  const gaps = useMemo(() => {
    const totalActive = stageCounts.blackoutCount + stageCounts.lightCount;
    if (totalActive === 0) return [];

    return harvestForecast
      .filter((day) => day.count === 0)
      .map((day) => day.date);
  }, [harvestForecast, stageCounts]);

  // Calculate max harvests for bar scaling
  const maxHarvests = Math.max(...harvestForecast.map((d) => d.count), 1);

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Growing Pipeline
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your microgreens at a glance
        </p>
      </div>

      {/* Stage Counts */}
      <div className="grid grid-cols-4 gap-3">
        <StageCard
          icon="📝"
          label="Planned"
          count={stageCounts.plannedCount}
          color="blue"
        />
        <StageCard
          icon="🌑"
          label="Blackout"
          count={stageCounts.blackoutCount}
          color="slate"
        />
        <StageCard
          icon="💡"
          label="Light"
          count={stageCounts.lightCount}
          color="yellow"
        />
        <StageCard
          icon="✅"
          label="Ready"
          count={stageCounts.readyCount}
          color="green"
          highlight={stageCounts.readyCount > 0}
        />
      </div>

      {/* Harvest Forecast */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Harvest Forecast
          </h3>
          {gaps.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              {gaps.length} gap{gaps.length !== 1 ? 's' : ''} this week
            </span>
          )}
        </div>

        <div className="flex items-end gap-1 h-24">
          {harvestForecast.map((day, i) => {
            const isGap = day.count === 0 && (stageCounts.blackoutCount + stageCounts.lightCount) > 0;
            const barHeight = day.count > 0 ? (day.count / maxHarvests) * 100 : 8;
            const isToday = i === 0;

            return (
              <div
                key={day.date.toISOString()}
                className="flex-1 flex flex-col items-center gap-1"
              >
                {/* Bar */}
                <div className="w-full flex flex-col items-center justify-end h-16">
                  {day.count > 0 && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {day.count}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t transition-all ${
                      isGap
                        ? 'bg-orange-200 dark:bg-orange-900/40 border-2 border-dashed border-orange-400 dark:border-orange-600'
                        : day.count > 0
                        ? 'bg-green-500 dark:bg-green-600'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    style={{ height: `${barHeight}%`, minHeight: '4px' }}
                  />
                </div>

                {/* Day label */}
                <span
                  className={`text-xs ${
                    isToday
                      ? 'font-bold text-primary-600 dark:text-primary-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isToday ? 'Today' : format(day.date, 'EEE')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap Warning */}
      {gaps.length > 0 && (
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Harvest gaps detected
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                No harvests expected on:{' '}
                {gaps.map((d) => format(d, 'EEE d')).join(', ')}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Consider planning additional sowings to fill the gaps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Flow Visualization */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Pipeline Flow
        </h3>
        <div className="flex items-center justify-between">
          <FlowStage icon="📝" label="Plan" count={stageCounts.plannedCount} />
          <FlowArrow />
          <FlowStage icon="🌱" label="Sow" count={null} />
          <FlowArrow />
          <FlowStage icon="🌑" label="Blackout" count={stageCounts.blackoutCount} />
          <FlowArrow />
          <FlowStage icon="💡" label="Light" count={stageCounts.lightCount} />
          <FlowArrow />
          <FlowStage icon="🌿" label="Harvest" count={stageCounts.readyCount} highlight />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface StageCardProps {
  icon: string;
  label: string;
  count: number;
  color: 'blue' | 'slate' | 'yellow' | 'green';
  highlight?: boolean;
}

function StageCard({ icon, label, count, color, highlight }: StageCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  };

  return (
    <div
      className={`p-3 rounded-lg text-center ${colorClasses[color]} ${
        highlight ? 'ring-2 ring-green-400 dark:ring-green-500' : ''
      }`}
    >
      <div className="text-lg">{icon}</div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}

interface FlowStageProps {
  icon: string;
  label: string;
  count: number | null;
  highlight?: boolean;
}

function FlowStage({ icon, label, count, highlight }: FlowStageProps) {
  return (
    <div
      className={`flex flex-col items-center ${
        highlight ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      {count !== null && (
        <span className="text-xs opacity-75">({count})</span>
      )}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="text-slate-400 dark:text-slate-500 px-1">
      →
    </div>
  );
}
