/**
 * MotherPlantCard - Individual mother plant display component
 *
 * Shows mother plant info with health indicator, status badge, and quick actions.
 * Follows the BatchCard pattern from the propagation module.
 */

import type { PropMotherPlantWithComputed } from '../../stores/useMotherPlants';
import type { MotherPlantStatus } from '../../types';
import { format } from 'date-fns';

interface MotherPlantCardProps {
  plant: PropMotherPlantWithComputed;
  onHealthCheck?: (id: string) => void;
  onTakeCutting?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onClick?: (id: string) => void;
}

/**
 * Display names for acquisition methods.
 */
const ACQUISITION_METHOD_NAMES: Record<string, string> = {
  purchased: 'Purchased',
  propagated: 'Propagated',
  gifted: 'Gifted',
  wild_collected: 'Wild Collected',
};

/**
 * Status colors for display.
 */
const STATUS_COLORS: Record<MotherPlantStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200' },
  retired: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
  deceased: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200' },
};

/**
 * Get health indicator color based on score.
 */
function getHealthColor(score?: number): { bg: string; text: string; indicator: string } {
  if (!score) {
    return { bg: 'bg-slate-100', text: 'text-slate-500', indicator: 'bg-slate-300' };
  }
  if (score >= 4) {
    return { bg: 'bg-green-50', text: 'text-green-700', indicator: 'bg-green-500' };
  }
  if (score >= 3) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-700', indicator: 'bg-yellow-500' };
  }
  if (score >= 2) {
    return { bg: 'bg-orange-50', text: 'text-orange-700', indicator: 'bg-orange-500' };
  }
  return { bg: 'bg-red-50', text: 'text-red-700', indicator: 'bg-red-500' };
}

/**
 * Format health score display.
 */
function formatHealthScore(score?: number): string {
  if (!score) return 'No data';
  return `${score}/5`;
}

export function MotherPlantCard({
  plant,
  onHealthCheck,
  onTakeCutting,
  onViewDetails,
  onClick,
}: MotherPlantCardProps) {
  const statusColors = STATUS_COLORS[plant.status];
  const healthColors = getHealthColor(plant.healthScore);
  const isActive = plant.status === 'active';

  // Determine card background based on status
  const getCardBackground = (): string => {
    if (plant.status === 'deceased') {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    if (plant.status === 'retired') {
      return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${getCardBackground()}`}
      onClick={() => onClick?.(plant.id!)}
    >
      {/* Header: Label and Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">
            {plant.label}
          </span>
          {/* Health Indicator Dot */}
          {plant.healthScore && (
            <span
              className={`w-2.5 h-2.5 rounded-full ${healthColors.indicator}`}
              title={`Health: ${formatHealthScore(plant.healthScore)}`}
            />
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
        >
          {plant.status.charAt(0).toUpperCase() + plant.status.slice(1)}
        </span>
      </div>

      {/* Species and Variety */}
      <div className="mb-2">
        <div className="text-lg font-semibold text-slate-900 dark:text-white">
          {plant.species}
        </div>
        {plant.variety && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {plant.variety}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Acquired:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {format(new Date(plant.acquisitionDate), 'MMM d, yyyy')}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Age:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {plant.ageInMonths < 12
              ? `${plant.ageInMonths} months`
              : `${Math.floor(plant.ageInMonths / 12)} years`}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Source:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">
            {ACQUISITION_METHOD_NAMES[plant.acquisitionMethod] || plant.acquisitionMethod}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Health:</span>{' '}
          <span className={`font-medium ${healthColors.text}`}>
            {formatHealthScore(plant.healthScore)}
          </span>
        </div>
      </div>

      {/* Last Health Check */}
      {plant.lastHealthCheck && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Last checked: {format(new Date(plant.lastHealthCheck), 'MMM d, yyyy')}
          {plant.daysSinceLastHealthCheck !== null && plant.daysSinceLastHealthCheck > 14 && (
            <span className="ml-2 text-orange-500">
              ({plant.daysSinceLastHealthCheck} days ago)
            </span>
          )}
        </div>
      )}

      {/* Location */}
      {plant.location && (
        <div className="mb-3">
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
            {plant.location}
          </span>
        </div>
      )}

      {/* Quick Actions */}
      {isActive && (onHealthCheck || onTakeCutting) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          {onTakeCutting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTakeCutting(plant.id!);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Take Cutting
            </button>
          )}
          {onHealthCheck && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHealthCheck(plant.id!);
              }}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Health Check
            </button>
          )}
        </div>
      )}

      {/* View Details Link (for inactive plants) */}
      {!isActive && onViewDetails && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(plant.id!);
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
