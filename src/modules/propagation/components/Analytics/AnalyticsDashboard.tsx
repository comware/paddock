/**
 * AnalyticsDashboard - Main analytics page for propagation module
 *
 * Provides visual insights into propagation performance:
 * - Overall performance metrics
 * - Success rates by species/method/station/season
 * - Failure analysis (stage and reason distribution)
 * - Graduation outcome distribution
 *
 * Uses the useAnalytics store for all data.
 * Route: /propagation/analytics
 */

import { useEffect, useMemo, useState } from 'react';
import { useAnalytics, useBatches, useStageTransitions, useSupplies, useStations, useMotherPlants, useBatchCosts } from '../../stores';
import type { TimePeriod } from '../../utils/analyticsCalculations';
import { getTimePeriodDisplayName } from '../../utils/analyticsCalculations';
import { SuccessRateChart } from './SuccessRateChart';
import { FailureAnalysis } from './FailureAnalysis';
import { OutcomesChart } from './OutcomesChart';

// Filter option types
type SpeciesFilter = string | 'all';
type MethodFilter = string | 'all';

export function AnalyticsDashboard() {
  // Load stores
  const analytics = useAnalytics();
  const { loadBatches, rawBatches } = useBatches();
  const { loadTransitions } = useStageTransitions();
  const { loadSupplies } = useSupplies();
  const { loadStations } = useStations();
  const { loadMotherPlants } = useMotherPlants();
  const { loadCosts } = useBatchCosts();

  // Local filter state
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadBatches(),
        loadTransitions(),
        loadSupplies(),
        loadStations(),
        loadMotherPlants(),
        loadCosts(),
        analytics.loadGraduations(),
      ]);
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- analytics.loadGraduations is stable
  }, [loadBatches, loadTransitions, loadSupplies, loadStations, loadMotherPlants, loadCosts]);

  // Extract unique species and methods for filters
  const filterOptions = useMemo(() => {
    const species = new Set<string>();
    const methods = new Set<string>();

    for (const batch of rawBatches) {
      species.add(batch.species);
      methods.add(batch.method);
    }

    return {
      species: Array.from(species).sort(),
      methods: Array.from(methods).sort(),
    };
  }, [rawBatches]);

  // Get analytics data
  const summaryStats = analytics.getSummaryStats();
  const successBySpecies = analytics.getSuccessRateBySpecies();
  const successByMethod = analytics.getSuccessRateByMethod();
  const successByStation = analytics.getSuccessRateByStation();
  const successBySeason = analytics.getSuccessRateBySeason();
  const failuresByStage = analytics.getFailuresByStage();
  const failureReasons = analytics.getFailureReasonDistribution();
  const mostProblematicStage = analytics.getMostProblematicStage();
  const totalFailures = analytics.getTotalFailures();
  const outcomes = analytics.getOutcomeDistribution();
  const totalGraduated = analytics.getTotalGraduated();

  // Time period options
  const timePeriods: TimePeriod[] = ['30d', '90d', '1y', 'all'];

  if (analytics.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-live="polite">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Performance insights for your propagation activities
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-center">
          {/* Time Period Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Period:
            </label>
            <div className="flex flex-wrap gap-1">
              {timePeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => analytics.setTimePeriod(period)}
                  className={`min-h-[44px] px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    analytics.timePeriod === period
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {getTimePeriodDisplayName(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Species Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label
              htmlFor="species-filter"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Species:
            </label>
            <select
              id="species-filter"
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Species</option>
              {filterOptions.species.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          {/* Method Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label
              htmlFor="method-filter"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Method:
            </label>
            <select
              id="method-filter"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Methods</option>
              {filterOptions.methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Batches"
          value={String(summaryStats.totalBatches)}
          icon="📦"
          subtitle={`${summaryStats.activeBatches} active`}
        />
        <MetricCard
          label="Success Rate"
          value={summaryStats.successRate > 0 ? `${summaryStats.successRate}%` : '--'}
          icon="🎯"
          subtitle="graduated vs failed"
          highlight={summaryStats.successRate >= 80 ? 'success' : summaryStats.successRate >= 60 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Survival Rate"
          value={summaryStats.averageSurvivalRate > 0 ? `${summaryStats.averageSurvivalRate}%` : '--'}
          icon="💪"
          subtitle="surviving / started"
          highlight={summaryStats.averageSurvivalRate >= 80 ? 'success' : summaryStats.averageSurvivalRate >= 60 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Graduated"
          value={String(summaryStats.graduatedBatches)}
          icon="🎓"
          subtitle={`${summaryStats.totalPropagulesSurviving} propagules`}
        />
      </div>

      {/* Success Rates Chart */}
      <SuccessRateChart
        bySpecies={successBySpecies}
        byMethod={successByMethod}
        byStation={successByStation}
        bySeason={successBySeason}
      />

      {/* Two Column Layout: Failures and Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FailureAnalysis
          failuresByStage={failuresByStage}
          failureReasons={failureReasons}
          mostProblematicStage={mostProblematicStage}
          totalFailures={totalFailures}
        />
        <OutcomesChart
          outcomes={outcomes}
          totalGraduated={totalGraduated}
        />
      </div>

      {/* Empty State */}
      {summaryStats.totalBatches === 0 && (
        <div className="card p-8 text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Analytics Data Yet
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Start tracking propagation batches to see performance analytics here.
            The more data you collect, the better insights you&apos;ll get.
          </p>
        </div>
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
  icon: string;
  subtitle?: string;
  highlight?: 'success' | 'warning' | 'danger' | 'neutral';
}

function MetricCard({ label, value, icon, subtitle, highlight = 'neutral' }: MetricCardProps) {
  const highlightColors = {
    success: 'border-emerald-500 dark:border-emerald-400',
    warning: 'border-yellow-500 dark:border-yellow-400',
    danger: 'border-red-500 dark:border-red-400',
    neutral: 'border-transparent',
  };

  const valueColors = {
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-900 dark:text-white',
  };

  return (
    <div
      className={`card p-4 border-l-4 ${highlightColors[highlight]}`}
    >
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColors[highlight]}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>
      )}
    </div>
  );
}
