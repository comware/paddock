/**
 * CostSummary - Summary metrics card for batch costs
 *
 * Features:
 * - Total batch cost
 * - Cost per propagule started
 * - Cost per propagule surviving
 * - Visual comparison (started vs surviving cost)
 * - Breakdown by category (optional)
 *
 * Designed as a compact card for BatchDetail page sidebar.
 */

import { useMemo, useEffect } from 'react';
import { useBatchCosts } from '../../stores/useBatchCosts';
import { useBatches } from '../../stores/useBatches';
import { formatCurrency, formatCostPerUnit, getCategoryDisplay, CATEGORY_COLORS } from './utils';
import type { BatchCostSummary as CostSummaryType } from '../../types';

// ============================================
// PROPS
// ============================================

interface CostSummaryProps {
  batchId: string;
  showBreakdown?: boolean;
  compact?: boolean;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Individual metric display.
 */
function MetricBox({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg ${
        highlight
          ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
          : 'bg-slate-100 dark:bg-slate-700'
      }`}
    >
      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
        {label}
      </span>
      <span
        className={`font-bold ${
          highlight
            ? 'text-primary-900 dark:text-primary-100'
            : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
          {subtext}
        </span>
      )}
    </div>
  );
}

/**
 * Category breakdown bar.
 */
function CategoryBreakdownBar({
  breakdown,
}: {
  breakdown: CostSummaryType['breakdown'];
}) {
  if (breakdown.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-600">
        {breakdown.map((item) => (
          <div
            key={item.category}
            className={`${CATEGORY_COLORS[item.category].bar} transition-all`}
            style={{ width: `${item.percentage}%` }}
            title={`${getCategoryDisplay(item.category)}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {breakdown.map((item) => (
          <div key={item.category} className="flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[item.category].bar}`}
            />
            <span className="text-slate-600 dark:text-slate-400">
              {getCategoryDisplay(item.category)}
            </span>
            <span className="text-slate-900 dark:text-white font-medium">
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CostSummary({
  batchId,
  showBreakdown = false,
  compact = false,
}: CostSummaryProps) {
  const {
    getBatchCostBreakdown,
    getTotalBatchCost,
    getCostPerPropaguleStarted,
    getCostPerPropaguleSurviving,
    loadCostsForBatch,
    isLoading,
  } = useBatchCosts();

  const { getBatchById } = useBatches();

  // Load costs for this batch
  useEffect(() => {
    loadCostsForBatch(batchId);
  }, [batchId, loadCostsForBatch]);

  // Get batch and cost data
  const batch = getBatchById(batchId);
  const costBreakdown = useMemo(
    () => getBatchCostBreakdown(batchId),
    [batchId, getBatchCostBreakdown]
  );
  const totalCost = getTotalBatchCost(batchId);
  const costPerStarted = getCostPerPropaguleStarted(batchId);
  const costPerSurviving = getCostPerPropaguleSurviving(batchId);

  // Calculate the "cost increase" from started to surviving
  const costIncrease = useMemo(() => {
    if (costPerStarted === 0 || costPerSurviving === 0) return 0;
    return ((costPerSurviving - costPerStarted) / costPerStarted) * 100;
  }, [costPerStarted, costPerSurviving]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-1/2 mb-2" />
        <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded w-3/4" />
      </div>
    );
  }

  // No costs state - compact version
  if (totalCost === 0 && compact) {
    return (
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Cost Summary
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          No costs recorded
        </div>
      </div>
    );
  }

  // No costs state - full version
  if (totalCost === 0) {
    return (
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-center">
        <div className="text-3xl mb-2">$</div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          No Costs Recorded
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Add supply or manual costs to see summary
        </div>
      </div>
    );
  }

  // Compact version - just total
  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-primary-800 dark:text-primary-200">
              Cost Summary
            </div>
            <div className="text-xs text-primary-600 dark:text-primary-400">
              {formatCostPerUnit(costPerSurviving)}/propagule
            </div>
          </div>
          <div className="text-lg font-bold text-primary-900 dark:text-primary-100">
            {formatCurrency(totalCost)}
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="space-y-4">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Total Cost"
          value={formatCurrency(totalCost)}
          highlight
        />
        <MetricBox
          label="Cost/Started"
          value={formatCostPerUnit(costPerStarted)}
          subtext={batch ? `${batch.quantityStarted} propagules` : undefined}
        />
      </div>

      {/* Per Surviving Metric - Full Width */}
      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-green-800 dark:text-green-200 block">
              Cost per Surviving
            </span>
            <span className="text-xs text-green-600 dark:text-green-400">
              {batch ? `${batch.quantitySurviving} alive` : ''}
            </span>
          </div>
          <span className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatCostPerUnit(costPerSurviving)}
          </span>
        </div>

        {/* Cost Increase Indicator */}
        {costIncrease > 0 && batch && batch.quantitySurviving < batch.quantityStarted && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
            <span>
              +{costIncrease.toFixed(0)}% from losses (
              {batch.quantityStarted - batch.quantitySurviving} lost)
            </span>
          </div>
        )}
      </div>

      {/* Survival Rate Impact */}
      {batch && batch.quantitySurviving > 0 && batch.quantityStarted > 0 && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>
              {batch.survivalRate}% survival rate
            </span>
            <span className="text-slate-400">|</span>
            <span>
              {batch.quantitySurviving} of {batch.quantityStarted}
            </span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {showBreakdown && costBreakdown && costBreakdown.breakdown.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Cost Breakdown
          </h4>
          <CategoryBreakdownBar breakdown={costBreakdown.breakdown} />
        </div>
      )}
    </div>
  );
}

/**
 * Inline cost badge for batch cards.
 * Shows total cost in a compact format.
 */
export function CostBadge({ batchId }: { batchId: string }) {
  const { getTotalBatchCost } = useBatchCosts();
  const totalCost = getTotalBatchCost(batchId);

  if (totalCost === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {formatCurrency(totalCost)}
    </span>
  );
}
