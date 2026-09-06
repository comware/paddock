/**
 * PropaguleCard - Individual propagule display component
 *
 * Shows propagule info with health indicator, stage badge, and quick actions.
 * Designed for use in PropaguleList grid view.
 *
 * Features:
 * - Propagule number prominent display
 * - Health score indicator (1-5 stars)
 * - Current stage badge
 * - Days in stage
 * - Thumbnail photo if available
 */

import type { PropPropaguleWithComputed } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
  getValidNextStages,
  isActiveStage,
} from '../../utils';

interface PropaguleCardProps {
  propagule: PropPropaguleWithComputed;
  onAdvanceStage?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onRecordFailure?: (id: string) => void;
  onClick?: (id: string) => void;
}

/**
 * Render health score as stars.
 */
function HealthStars({ score }: { score?: number }) {
  const filledStars = score ?? 0;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={`text-sm ${
          i <= filledStars
            ? 'text-yellow-400'
            : 'text-slate-300 dark:text-slate-600'
        }`}
      >
        *
      </span>
    );
  }

  return <div className="flex gap-0.5">{stars}</div>;
}

/**
 * Health color indicator based on score.
 */
function getHealthColor(score?: number): string {
  if (!score) return 'bg-slate-200 dark:bg-slate-600';
  if (score >= 4) return 'bg-green-500';
  if (score >= 3) return 'bg-yellow-500';
  if (score >= 2) return 'bg-orange-500';
  return 'bg-red-500';
}

export function PropaguleCard({
  propagule,
  onAdvanceStage,
  onViewDetails,
  onRecordFailure,
  onClick,
}: PropaguleCardProps) {
  const stageColors = getStageColors(propagule.stage);
  const validNextStages = getValidNextStages(propagule.stage);
  const canAdvance = validNextStages.length > 0 && propagule.stage !== 'failed';
  const canRecordFailure = isActiveStage(propagule.stage);

  // Determine card background based on stage/status
  const getCardBackground = (): string => {
    if (propagule.stage === 'failed') {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    if (propagule.stage === 'graduated') {
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    }
    if (propagule.healthScore !== undefined && propagule.healthScore <= 2) {
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  // Get thumbnail if available
  const thumbnailUrl = propagule.photoUrls?.[0];

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${getCardBackground()}`}
      onClick={() => onClick?.(propagule.id!)}
    >
      {/* Header: Propagule Number and Stage Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">
            {propagule.propaguleNumber}
          </span>
          {/* Health indicator dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${getHealthColor(propagule.healthScore)}`}
            title={`Health: ${propagule.healthScore ?? 'N/A'}/5`}
          />
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
        >
          {getStageDisplayName(propagule.stage)}
        </span>
      </div>

      {/* Photo Thumbnail (if available) */}
      {thumbnailUrl && (
        <div className="mb-3 rounded-lg overflow-hidden aspect-video bg-slate-100 dark:bg-slate-700">
          <img
            src={thumbnailUrl}
            alt={`Propagule ${propagule.propaguleNumber}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Species and Variety */}
      <div className="mb-2">
        <div className="text-lg font-semibold text-slate-900 dark:text-white">
          {propagule.species}
        </div>
        {propagule.variety && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {propagule.variety}
          </div>
        )}
        {propagule.label && (
          <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
            {propagule.label}
          </div>
        )}
      </div>

      {/* Health Score Stars */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">Health:</span>
        <HealthStars score={propagule.healthScore} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-slate-500 dark:text-slate-400">In Stage:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {formatDaysInStage(propagule.daysInStage)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {propagule.daysSinceTaken}d
          </span>
        </div>
        {propagule.heightCm !== undefined && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Height:</span>{' '}
            <span className="text-slate-700 dark:text-slate-300">
              {propagule.heightCm}cm
            </span>
          </div>
        )}
        {propagule.leafCount !== undefined && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Leaves:</span>{' '}
            <span className="text-slate-700 dark:text-slate-300">
              {propagule.leafCount}
            </span>
          </div>
        )}
        {propagule.rootScore !== undefined && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Roots:</span>{' '}
            <span className="text-slate-700 dark:text-slate-300">
              {propagule.rootScore}/5
            </span>
          </div>
        )}
      </div>

      {/* Station Badge */}
      {propagule.stationName && (
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
            {propagule.stationName}
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
                onAdvanceStage(propagule.id!);
              }}
              className="flex-1 min-h-[44px] btn btn-primary btn-sm"
            >
              Advance
            </button>
          )}
          {canRecordFailure && onRecordFailure && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecordFailure(propagule.id!);
              }}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 transition-colors"
            >
              Fail
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
              onViewDetails(propagule.id!);
            }}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 transition-colors"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}
