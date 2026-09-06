/**
 * StationCard - Individual station display component
 *
 * Shows station info with type badge, occupancy bar, and quick actions.
 * Follows the BatchCard pattern from the propagation module.
 */

import type { StationWithOccupancy } from '../../stores/useStations';

interface StationCardProps {
  station: StationWithOccupancy;
  onEdit?: (id: string) => void;
  onLogEnvironment?: (id: string) => void;
  onToggleActive?: (id: string) => void;
  onClick?: (id: string) => void;
}

/**
 * Display names for station types.
 */
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  heated_propagator: 'Heated Propagator',
  unheated_propagator: 'Unheated Propagator',
  water_propagation: 'Water Propagation',
  outdoor_bed: 'Outdoor Bed',
  cold_frame: 'Cold Frame',
  greenhouse_bench: 'Greenhouse Bench',
  mist_system: 'Mist System',
  other: 'Other',
};

/**
 * Get display name for station type.
 */
function getTypeDisplay(type: string): string {
  return TYPE_DISPLAY_NAMES[type] || type;
}

/**
 * Get occupancy color class based on percentage.
 */
function getOccupancyColor(percentage: number): {
  bar: string;
  text: string;
  bg: string;
} {
  if (percentage >= 90) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    };
  }
  if (percentage >= 70) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    };
  }
  return {
    bar: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  };
}

export function StationCard({
  station,
  onEdit,
  onLogEnvironment,
  onToggleActive,
  onClick,
}: StationCardProps) {
  const occupancyColors = getOccupancyColor(station.occupancyPercentage);

  // Determine card background based on status
  const getCardBackground = (): string => {
    if (!station.isActive) {
      return 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 opacity-75';
    }
    if (station.isAtCapacity) {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${getCardBackground()}`}
      onClick={() => onClick?.(station.id!)}
    >
      {/* Header: Name and Type Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white truncate">
            {station.name}
          </span>
          {!station.isActive && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
              Inactive
            </span>
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            station.isIndoor
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
          }`}
        >
          {station.isIndoor ? 'Indoor' : 'Outdoor'}
        </span>
      </div>

      {/* Station Type */}
      <div className="mb-3">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {getTypeDisplay(station.type)}
        </span>
      </div>

      {/* Occupancy Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Occupancy
          </span>
          <span className={`text-xs font-medium ${occupancyColors.text}`}>
            {station.currentOccupancy}/{station.capacity} ({station.occupancyPercentage}%)
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${occupancyColors.bar} transition-all duration-300`}
            style={{ width: `${Math.min(station.occupancyPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
          <span>{station.batchCount} batch{station.batchCount !== 1 ? 'es' : ''}</span>
          <span>{station.availableCapacity} available</span>
        </div>
      </div>

      {/* Environmental Targets (if set) */}
      {(station.targetTempMin !== undefined || station.targetHumidityMin !== undefined) && (
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          {station.targetTempMin !== undefined && station.targetTempMax !== undefined && (
            <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Temp:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">
                {station.targetTempMin}-{station.targetTempMax}C
              </span>
            </div>
          )}
          {station.targetHumidityMin !== undefined && station.targetHumidityMax !== undefined && (
            <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Humidity:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">
                {station.targetHumidityMin}-{station.targetHumidityMax}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        {onLogEnvironment && station.isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogEnvironment(station.id!);
            }}
            className="flex-1 btn btn-primary btn-sm"
          >
            Log Env
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(station.id!);
            }}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Edit
          </button>
        )}
        {onToggleActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(station.id!);
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              station.isActive
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
            }`}
          >
            {station.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </div>
    </div>
  );
}
