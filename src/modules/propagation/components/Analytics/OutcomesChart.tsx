/**
 * OutcomesChart - Visualize graduation outcomes
 *
 * Shows:
 * - Pie chart visualization of outcome distribution
 * - Legend with counts and percentages
 * - Total graduated summary
 *
 * Uses Tailwind CSS for styling (no external chart library).
 * Creates a visual pie chart using CSS conic gradients.
 */

import { useMemo } from 'react';
import type { OutcomeDistribution } from '../../utils/analyticsCalculations';
import type { GraduationOutcome } from '../../types';
import { getOutcomeDisplayName } from '../../utils/analyticsCalculations';

interface OutcomesChartProps {
  outcomes: OutcomeDistribution[];
  totalGraduated: { count: number; quantity: number };
}

// Color mapping for outcomes
const OUTCOME_COLORS: Record<GraduationOutcome, { bg: string; fill: string }> = {
  personal_use: { bg: 'bg-blue-500', fill: '#3b82f6' },
  planted_garden: { bg: 'bg-emerald-500', fill: '#10b981' },
  gifted: { bg: 'bg-pink-500', fill: '#ec4899' },
  sold: { bg: 'bg-amber-500', fill: '#f59e0b' },
  composted: { bg: 'bg-slate-400', fill: '#94a3b8' },
};

export function OutcomesChart({ outcomes, totalGraduated }: OutcomesChartProps) {
  // Generate conic gradient for pie chart
  const pieGradient = useMemo(() => {
    if (outcomes.length === 0) return 'none';

    let accumulated = 0;
    const segments: string[] = [];

    for (const outcome of outcomes) {
      const start = accumulated;
      const end = accumulated + outcome.percentage;
      const color = OUTCOME_COLORS[outcome.outcome]?.fill || '#94a3b8';
      segments.push(`${color} ${start}% ${end}%`);
      accumulated = end;
    }

    // Fill remaining with gray if percentages don't sum to 100
    if (accumulated < 100) {
      segments.push(`#e2e8f0 ${accumulated}% 100%`);
    }

    return `conic-gradient(${segments.join(', ')})`;
  }, [outcomes]);

  if (totalGraduated.count === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Graduation Outcomes
        </h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🌱</div>
          <p className="text-slate-600 dark:text-slate-400">
            No graduations recorded yet. Once propagules graduate, you&apos;ll see
            outcome distribution here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card p-6"
      role="img"
      aria-label={`Propagation outcomes chart showing ${totalGraduated.quantity} graduated propagules across ${outcomes.length} outcome categories`}
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Graduation Outcomes
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Pie Chart */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Pie chart circle */}
            <div
              className="w-48 h-48 rounded-full"
              style={{ background: pieGradient }}
              aria-hidden="true"
            />
            {/* Center hole for donut effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalGraduated.quantity}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  propagules
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {outcomes.map((outcome) => (
            <OutcomeLegendItem key={outcome.outcome} data={outcome} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalGraduated.count}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Graduation Events
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalGraduated.quantity}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Propagules
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface OutcomeLegendItemProps {
  data: OutcomeDistribution;
}

function OutcomeLegendItem({ data }: OutcomeLegendItemProps) {
  const { outcome, count, quantity, percentage } = data;
  const colors = OUTCOME_COLORS[outcome] || { bg: 'bg-slate-400', fill: '#94a3b8' };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded ${colors.bg} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {getOutcomeDisplayName(outcome)}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white ml-2">
            {percentage}%
          </span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {count} event{count !== 1 ? 's' : ''} ({quantity} propagule{quantity !== 1 ? 's' : ''})
        </div>
      </div>
    </div>
  );
}
