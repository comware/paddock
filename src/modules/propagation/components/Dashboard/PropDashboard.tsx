/**
 * PropDashboard - Main dashboard for the Propagation module
 *
 * Landing page showing at-a-glance propagation status:
 * - Summary metrics (active batches, propagules, success rate)
 * - Stage distribution breakdown
 * - Items needing attention (overdue, ready for advancement)
 * - Quick actions
 * - Recent activity feed
 */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ClipboardList,
  LayoutGrid,
  Package,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { useBatches } from '../../stores';
import { MetricsCards } from './MetricsCards';
import { StageDistribution } from './StageDistribution';
import { NeedingAttention } from './NeedingAttention';
import { ReadyToGraduate } from './ReadyToGraduate';
import { RecentActivity } from './RecentActivity';
import { StationOverview } from './StationOverview';

export function PropDashboard() {
  const navigate = useNavigate();
  const {
    batches,
    isLoading,
    loadBatches,
    getActiveBatches,
    getOverdueBatches,
    getBatchesByStage,
    getStageCounts,
    getSuccessRate,
    getAverageSurvivalRate,
  } = useBatches();

  // Load data on mount
  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Calculate metrics
  const activeBatches = useMemo(() => getActiveBatches(), [batches]);
  const overdueBatches = useMemo(() => getOverdueBatches(), [batches]);
  const readyBatches = useMemo(() => getBatchesByStage('ready'), [batches]);
  const stageCounts = useMemo(() => getStageCounts(), [batches]);
  const successRate = getSuccessRate();
  const avgSurvivalRate = getAverageSurvivalRate();

  // Calculate total propagules in active batches
  const totalPropagules = useMemo(
    () => activeBatches.reduce((sum, b) => sum + b.quantitySurviving, 0),
    [activeBatches]
  );

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Propagation Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {batches.length > 0
              ? `Track and manage your ${activeBatches.length} active batch${activeBatches.length !== 1 ? 'es' : ''}`
              : 'Start propagating by creating your first batch'}
          </p>
        </div>
      </div>

      {/* Action Needed Alert */}
      {overdueBatches.length > 0 && (
        <div
          className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          onClick={() => navigate('/propagation/batches?filter=overdue')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-orange-800 dark:text-orange-200">
                  Action Needed
                </h2>
                <p className="text-orange-700 dark:text-orange-300">
                  {overdueBatches.length} batch{overdueBatches.length !== 1 ? 'es' : ''} past expected stage duration
                </p>
              </div>
            </div>
            <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
              View details →
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <MetricsCards
        activeBatches={activeBatches.length}
        totalPropagules={totalPropagules}
        successRate={successRate}
        averageSurvivalRate={avgSurvivalRate}
      />

      {/* Quick Actions */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          <QuickActionButton
            Icon={Plus}
            label="New Batch"
            onClick={() => navigate('/propagation/batches/new')}
            primary
          />
          <QuickActionButton
            Icon={ClipboardList}
            label="View Batches"
            onClick={() => navigate('/propagation/batches')}
          />
          <QuickActionButton
            Icon={LayoutGrid}
            label="Stations"
            onClick={() => navigate('/propagation/stations')}
          />
          <QuickActionButton
            Icon={Package}
            label="Supplies"
            onClick={() => navigate('/propagation/supplies')}
          />
          <QuickActionButton
            Icon={Sprout}
            label="Mother Plants"
            onClick={() => navigate('/propagation/mother-plants')}
          />
        </div>
      </div>

      {/* Two-column layout for Stage Distribution and Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StageDistribution stageCounts={stageCounts} />
        <NeedingAttention overdueBatches={overdueBatches} maxItems={5} />
      </div>

      {/* Ready to Graduate Section */}
      <ReadyToGraduate readyBatches={readyBatches} maxItems={5} />

      {/* Station Overview */}
      <StationOverview maxItems={6} />

      {/* Recent Activity */}
      <RecentActivity maxItems={10} />

      {/* Empty state for new users */}
      {batches.length === 0 && (
        <div className="card p-8 text-center">
          <span className="text-6xl mb-4 block">🌱</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to Propagation
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Track your plant propagation from cutting to graduation. Start by creating
            your first batch to record cuttings, divisions, or seeds.
          </p>
          <button
            onClick={() => navigate('/propagation/batches/new')}
            className="px-6 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            Create First Batch
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface QuickActionButtonProps {
  /**
   * These were single ASCII characters - `*` for View Batches, `#` for Stations, `$` for
   * Supplies, `@` for Mother Plants. They read as leftover placeholders rather than icons,
   * and a dollar sign beside "Supplies" actively suggested the button was about cost.
   */
  Icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}

function QuickActionButton({
  Icon,
  label,
  onClick,
  disabled,
  primary,
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px] p-3 sm:p-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          : primary
          ? 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700'
          : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 active:bg-primary-200 dark:active:bg-primary-900/40'
      }`}
    >
      <Icon aria-hidden="true" className="w-5 h-5 shrink-0" strokeWidth={1.75} />
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
