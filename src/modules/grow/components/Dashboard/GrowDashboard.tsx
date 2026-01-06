/**
 * GrowDashboard - Main dashboard for the Grow module
 *
 * Shows experiment status at a glance:
 * - Current week/day of experiment
 * - Key metrics (trays, success rate, yield)
 * - Active trays summary
 * - Quick actions
 * - Ready to harvest alerts
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrays, useVarieties } from '../../stores';
import { NewTrayForm } from '../Trays/NewTrayForm';
import { HarvestForm } from '../Trays/HarvestForm';
import { differenceInDays, addDays, isAfter, startOfDay } from 'date-fns';

export function GrowDashboard() {
  const navigate = useNavigate();
  const { trays, isLoading, loadTrays, getSuccessRate, getAverageYieldRatio, getReadyToHarvest } = useTrays();
  const { loadVarieties, getVariety } = useVarieties();

  const [isNewTrayOpen, setIsNewTrayOpen] = useState(false);
  const [harvestingTray, setHarvestingTray] = useState<ReturnType<typeof getReadyToHarvest>[0] | null>(null);

  // Load data on mount
  useEffect(() => {
    loadTrays();
    loadVarieties();
  }, [loadTrays, loadVarieties]);

  // Calculate experiment day (from first tray)
  const experimentStart = trays.length > 0
    ? trays.reduce((earliest, t) => {
        const date = new Date(t.dateSown);
        return date < earliest ? date : earliest;
      }, new Date(trays[0].dateSown))
    : new Date();

  const experimentDay = differenceInDays(new Date(), experimentStart) + 1;
  const experimentWeek = Math.ceil(experimentDay / 7);

  // Calculate metrics
  const activeTrays = trays.filter(t => t.status === 'blackout' || t.status === 'light');
  const blackoutCount = trays.filter(t => t.status === 'blackout').length;
  const lightCount = trays.filter(t => t.status === 'light').length;
  const harvestedCount = trays.filter(t => t.status === 'harvested').length;
  const successRate = getSuccessRate();
  const avgYieldRatio = getAverageYieldRatio();
  const readyToHarvest = getReadyToHarvest();

  // Calculate overdue trays
  const overdueTrays = useMemo(() => {
    const today = startOfDay(new Date());

    const overdueForLight = trays.filter((tray) => {
      if (tray.status !== 'blackout') return false;
      const estimatedLightDate = addDays(tray.dateSown, tray.blackoutDays);
      return isAfter(today, estimatedLightDate);
    });

    const overdueForHarvest = trays.filter((tray) => {
      if (tray.status !== 'light') return false;
      const variety = getVariety(tray.variety);
      if (!variety?.typicalDaysToHarvest) return false;
      const estimatedHarvestDate = addDays(tray.dateSown, variety.typicalDaysToHarvest);
      return isAfter(today, estimatedHarvestDate);
    });

    return {
      forLight: overdueForLight,
      forHarvest: overdueForHarvest,
      total: overdueForLight.length + overdueForHarvest.length,
    };
  }, [trays, getVariety]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Grow Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {trays.length > 0
              ? `Week ${experimentWeek}, Day ${experimentDay} of experiment`
              : 'Start your experiment by planting your first tray'}
          </p>
        </div>
      </div>

      {/* Action Needed Alert */}
      {overdueTrays.total > 0 && (
        <div
          className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          onClick={() => navigate('/grow/trays')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-orange-800 dark:text-orange-200">
                  Action Needed
                </h2>
                <p className="text-orange-700 dark:text-orange-300">
                  {overdueTrays.total} tray{overdueTrays.total !== 1 ? 's' : ''} need attention
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {overdueTrays.forLight.length > 0 && (
                <div className="text-center px-4 py-2 rounded-lg bg-orange-200 dark:bg-orange-800">
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {overdueTrays.forLight.length}
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">Ready for light</div>
                </div>
              )}
              {overdueTrays.forHarvest.length > 0 && (
                <div className="text-center px-4 py-2 rounded-lg bg-green-200 dark:bg-green-800">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {overdueTrays.forHarvest.length}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">Ready to harvest</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Trays Planted"
          value={String(trays.length)}
          target="20"
          icon="🌱"
        />
        <MetricCard
          label="Success Rate"
          value={successRate > 0 ? `${successRate}%` : '--'}
          target="80%"
          icon="✅"
        />
        <MetricCard
          label="Yield Ratio"
          value={avgYieldRatio ? `${avgYieldRatio}x` : '--'}
          subtitle="harvest/seed"
          icon="⚖️"
        />
        <MetricCard
          label="Harvested"
          value={String(harvestedCount)}
          icon="🌿"
        />
        <MetricCard
          label="Active"
          value={String(activeTrays.length)}
          icon="📋"
        />
      </div>

      {/* Active Trays */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Active Trays
          </h2>
          <button
            onClick={() => navigate('/grow/trays')}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            View All →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 text-white cursor-pointer hover:bg-slate-700 transition-colors"
            onClick={() => navigate('/grow/trays?filter=blackout')}
          >
            <span className="text-2xl">🌑</span>
            <div>
              <div className="text-2xl font-bold">{blackoutCount}</div>
              <div className="text-sm text-slate-300">Blackout</div>
            </div>
          </div>
          <div
            className="flex items-center gap-3 p-4 rounded-lg bg-yellow-100 text-yellow-900 cursor-pointer hover:bg-yellow-200 transition-colors"
            onClick={() => navigate('/grow/trays?filter=light')}
          >
            <span className="text-2xl">💡</span>
            <div>
              <div className="text-2xl font-bold">{lightCount}</div>
              <div className="text-sm text-yellow-700">Light</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton
            icon="🌱"
            label="New Tray"
            onClick={() => setIsNewTrayOpen(true)}
          />
          <QuickActionButton
            icon="📝"
            label="Log Day"
            onClick={() => navigate('/grow/daily')}
          />
          <QuickActionButton
            icon="⏱️"
            label="Log Time"
            onClick={() => navigate('/grow/time')}
          />
          <QuickActionButton
            icon="🌿"
            label="Harvest"
            onClick={() => navigate('/grow/trays?filter=light')}
            disabled={lightCount === 0}
          />
        </div>
      </div>

      {/* Ready to Harvest */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Ready to Harvest
          </h2>
          {readyToHarvest.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
              {readyToHarvest.length} ready
            </span>
          )}
        </div>
        {readyToHarvest.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            {trays.length === 0
              ? 'No trays yet. Plant your first tray to get started!'
              : 'No trays ready for harvest yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {readyToHarvest.slice(0, 5).map((tray) => (
              <div
                key={tray.id}
                className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌿</span>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      #{tray.trayNumber} - {tray.variety}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {tray.daysInPhase} days in light • {tray.seedWeight}g seed
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setHarvestingTray(tray)}
                  className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  Harvest
                </button>
              </div>
            ))}
            {readyToHarvest.length > 5 && (
              <button
                onClick={() => navigate('/grow/trays?filter=light')}
                className="w-full py-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                View all {readyToHarvest.length} trays →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewTrayForm isOpen={isNewTrayOpen} onClose={() => setIsNewTrayOpen(false)} />
      {harvestingTray && (
        <HarvestForm
          isOpen={!!harvestingTray}
          onClose={() => setHarvestingTray(null)}
          tray={harvestingTray}
        />
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface MetricCardProps {
  label: string;
  value: string;
  target?: string;
  subtitle?: string;
  icon: string;
}

function MetricCard({ label, value, target, subtitle, icon }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </div>
      {target && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Target: {target}
        </div>
      )}
      {subtitle && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

function QuickActionButton({ icon, label, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 p-4 rounded-lg font-medium transition-colors ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );
}
