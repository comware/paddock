/**
 * FailureAnalysis - Visualize failure patterns
 *
 * Shows:
 * - Which stages have the most failures (funnel/bar chart)
 * - Failure reason distribution (horizontal bars)
 * - Highlights the most problematic stage
 *
 * Uses Tailwind for styling (no external chart library).
 */

import { useMemo } from 'react';
import type { FailureByStage, FailureReason } from '../../utils/analyticsCalculations';
import { getFailureReasonDisplayName } from '../../utils/analyticsCalculations';
import { STAGE_DISPLAY_NAMES, STAGE_COLORS } from '../../utils/stageHelpers';
import type { PropagationStage } from '../../types';

interface FailureAnalysisProps {
  failuresByStage: FailureByStage[];
  failureReasons: { reason: FailureReason; count: number; percentage: number }[];
  mostProblematicStage: PropagationStage | null;
  totalFailures: number;
}

export function FailureAnalysis({
  failuresByStage,
  failureReasons,
  mostProblematicStage,
  totalFailures,
}: FailureAnalysisProps) {
  // Sort reasons by count
  const sortedReasons = useMemo(
    () => [...failureReasons].sort((a, b) => b.count - a.count),
    [failureReasons]
  );

  if (totalFailures === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Failure Analysis
        </h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-slate-600 dark:text-slate-400">
            No failures recorded yet. Keep up the great work!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Failure Analysis
        </h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {totalFailures} total failure{totalFailures !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Most Problematic Stage Alert */}
      {mostProblematicStage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-medium text-red-800 dark:text-red-200">
                Watch Out: {STAGE_DISPLAY_NAMES[mostProblematicStage]} Stage
              </div>
              <div className="text-sm text-red-600 dark:text-red-300">
                Most failures occur during this stage. Consider reviewing your process.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failures by Stage */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            By Stage
          </h3>
          <div className="space-y-3">
            {failuresByStage.map((item) => (
              <StageFailureBar
                key={item.stage}
                stage={item.stage}
                count={item.count}
                percentage={item.percentage}
                isProblematic={item.stage === mostProblematicStage}
              />
            ))}
          </div>
          {failuresByStage.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No stage data available
            </p>
          )}
        </div>

        {/* Failure Reasons */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            By Reason
          </h3>
          <div className="space-y-3">
            {sortedReasons.map((item) => (
              <ReasonBar
                key={item.reason}
                reason={item.reason}
                count={item.count}
                percentage={item.percentage}
              />
            ))}
          </div>
          {sortedReasons.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No reason data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface StageFailureBarProps {
  stage: PropagationStage;
  count: number;
  percentage: number;
  isProblematic: boolean;
}

function StageFailureBar({ stage, count, percentage, isProblematic }: StageFailureBarProps) {
  const stageColors = STAGE_COLORS[stage];

  return (
    <div className={isProblematic ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-800 rounded-lg p-2 -m-2' : ''}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {STAGE_DISPLAY_NAMES[stage]}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${stageColors.bg} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ReasonBarProps {
  reason: FailureReason;
  count: number;
  percentage: number;
}

function ReasonBar({ reason, count, percentage }: ReasonBarProps) {
  // Color mapping for failure reasons
  const reasonColors: Record<FailureReason, string> = {
    rot: 'bg-amber-500',
    dried_out: 'bg-yellow-500',
    disease: 'bg-purple-500',
    pest: 'bg-pink-500',
    no_roots: 'bg-blue-500',
    transplant_shock: 'bg-orange-500',
    environmental: 'bg-cyan-500',
    unknown: 'bg-slate-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {getFailureReasonDisplayName(reason)}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${reasonColors[reason]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
