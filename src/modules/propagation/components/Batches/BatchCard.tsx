/**
 * BatchCard - Individual batch display component
 *
 * Shows batch info with stage badge, survival count, and quick actions.
 * Follows the TrayCard pattern from the grow module.
 */

import type { PropBatchWithComputed } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
  getValidNextStages,
  isActiveStage,
} from '../../utils';
import { format } from 'date-fns';

interface BatchCardProps {
  batch: PropBatchWithComputed;
  onAdvanceStage?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onRecordFailure?: (id: string) => void;
  onClick?: (id: string) => void;
}

/**
 * Display names for propagation methods.
 */
const METHOD_DISPLAY_NAMES: Record<string, string> = {
  cutting_softwood: 'Softwood Cutting',
  cutting_semi_hardwood: 'Semi-Hardwood Cutting',
  cutting_hardwood: 'Hardwood Cutting',
  cutting_leaf: 'Leaf Cutting',
  cutting_root: 'Root Cutting',
  division: 'Division',
  layering_simple: 'Simple Layering',
  layering_air: 'Air Layering',
  grafting_whip: 'Whip Graft',
  grafting_cleft: 'Cleft Graft',
  grafting_bud: 'Bud Graft',
  seed: 'Seed',
};

/**
 * Get a short display name for the method.
 */
function getMethodDisplay(method: string): string {
  return METHOD_DISPLAY_NAMES[method] || method;
}

export function BatchCard({
  batch,
  onAdvanceStage,
  onViewDetails,
  onRecordFailure,
  onClick,
}: BatchCardProps) {
  const stageColors = getStageColors(batch.stage);
  const validNextStages = getValidNextStages(batch.stage);
  const canAdvance = validNextStages.length > 0 && batch.stage !== 'failed';
  const canRecordFailure = isActiveStage(batch.stage);

  // Determine card background based on stage/status
  const getCardBackground = (): string => {
    if (batch.isOverdue) {
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
    }
    if (batch.stage === 'failed') {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    if (batch.stage === 'graduated') {
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${getCardBackground()}`}
      onClick={() => onClick?.(batch.id!)}
    >
      {/* Header: Batch Number and Stage Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">
            {batch.batchNumber}
          </span>
          {batch.isOverdue && (
            <span className="text-orange-500" title="Overdue for stage transition">
              !
            </span>
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
        >
          {getStageDisplayName(batch.stage)}
        </span>
      </div>

      {/* Overdue Alert */}
      {batch.isOverdue && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium flex items-center gap-2">
          <span>!</span>
          <span>Overdue - {formatDaysInStage(batch.daysInStage)} in {getStageDisplayName(batch.stage)}</span>
        </div>
      )}

      {/* Species and Variety */}
      <div className="mb-2">
        <div className="text-lg font-semibold text-slate-900 dark:text-white">
          {batch.species}
        </div>
        {batch.variety && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {batch.variety}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Taken:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {format(new Date(batch.dateTaken), 'MMM d')}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Day:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {batch.daysSinceTaken}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Surviving:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {batch.quantitySurviving}/{batch.quantityStarted}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Rate:</span>{' '}
          <span
            className={`font-medium ${
              batch.survivalRate >= 80
                ? 'text-green-600 dark:text-green-400'
                : batch.survivalRate >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {batch.survivalRate}%
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Method:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {getMethodDisplay(batch.method)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">In Stage:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {formatDaysInStage(batch.daysInStage)}
          </span>
        </div>
      </div>

      {/* Station Name */}
      {batch.stationName && (
        <div className="mb-3">
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
            {batch.stationName}
          </span>
        </div>
      )}

      {/* Quick Actions */}
      {(canAdvance || canRecordFailure) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          {canAdvance && onAdvanceStage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvanceStage(batch.id!);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Advance Stage
            </button>
          )}
          {canRecordFailure && onRecordFailure && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecordFailure(batch.id!);
              }}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Record Failure
            </button>
          )}
        </div>
      )}

      {/* View Details Link (for terminal stages) */}
      {!canAdvance && !canRecordFailure && onViewDetails && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(batch.id!);
            }}
            className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}
