/**
 * NeedingAttention - Dashboard widget for batches requiring action
 *
 * Displays:
 * - Overdue batches (past expected stage duration)
 * - Batches ready for stage advancement
 * - Low survival warnings
 */

import { useNavigate } from 'react-router-dom';
import type { PropBatchWithComputed } from '../../types';
import {
  STAGE_DISPLAY_NAMES,
  STAGE_COLORS,
  getValidNextStages,
  formatDaysInStage,
  TYPICAL_STAGE_DAYS,
} from '../../utils/stageHelpers';

interface NeedingAttentionProps {
  overdueBatches: PropBatchWithComputed[];
  /** Maximum items to display before showing "view all" */
  maxItems?: number;
}

export function NeedingAttention({
  overdueBatches,
  maxItems = 5,
}: NeedingAttentionProps) {
  const navigate = useNavigate();

  const totalIssues = overdueBatches.length;

  if (totalIssues === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Needing Attention
        </h2>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">✨</span>
          <p className="text-slate-500 dark:text-slate-400">
            All batches are on track! No immediate actions needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Needing Attention
          </h2>
          <span className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium animate-pulse">
            {totalIssues} item{totalIssues !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Alert banner for overdue */}
      {overdueBatches.length > 0 && (
        <div
          className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          onClick={() => navigate('/propagation/batches?filter=overdue')}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-medium text-orange-800 dark:text-orange-200">
                {overdueBatches.length} batch{overdueBatches.length !== 1 ? 'es' : ''} overdue
              </span>
              <span className="text-sm text-orange-600 dark:text-orange-300 ml-2">
                past expected stage duration
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Batch list */}
      <div className="space-y-2">
        {overdueBatches.slice(0, maxItems).map((batch) => {
          const stageColors = STAGE_COLORS[batch.stage];
          const validNextStages = getValidNextStages(batch.stage);
          const nextStage = validNextStages.find((s) => s !== 'failed');
          const typicalDays = TYPICAL_STAGE_DAYS[batch.stage];
          const daysOverdue = typicalDays ? batch.daysInStage - typicalDays : 0;

          return (
            <div
              key={batch.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                batch.isOverdue
                  ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                  : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
              }`}
              onClick={() => navigate(`/propagation/batches/${batch.id}`)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg shrink-0">🌱</span>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">
                    {batch.batchNumber} - {batch.species}
                    {batch.variety && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        '{batch.variety}'
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
                    >
                      {STAGE_DISPLAY_NAMES[batch.stage]}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatDaysInStage(batch.daysInStage)}
                      {daysOverdue > 0 && (
                        <span className="text-orange-600 dark:text-orange-400 ml-1">
                          (+{daysOverdue} overdue)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick info */}
              <div className="flex items-center gap-2 shrink-0">
                {batch.survivalRate < 50 && batch.survivalRate > 0 && (
                  <span
                    className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    title="Low survival rate"
                  >
                    {batch.survivalRate}% alive
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  {batch.quantitySurviving}/{batch.quantityStarted}
                </span>
                {nextStage && (
                  <span className="text-primary-500 text-xs hidden md:inline">
                    → {STAGE_DISPLAY_NAMES[nextStage]}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Show more link */}
        {overdueBatches.length > maxItems && (
          <button
            onClick={() => navigate('/propagation/batches?filter=overdue')}
            className="w-full py-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            View all {overdueBatches.length} items needing attention
          </button>
        )}
      </div>
    </div>
  );
}
