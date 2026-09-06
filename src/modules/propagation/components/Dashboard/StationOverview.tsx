/**
 * StationOverview - Dashboard widget for propagation station occupancy
 *
 * Displays:
 * - All active stations with visual capacity bars
 * - Color coding by occupancy level (green <70%, yellow 70-90%, red >90%)
 * - Click navigation to station detail
 * - Warning badges for stations at capacity
 * - Link to manage all stations
 */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStations } from '../../stores';
import type { StationWithOccupancy } from '../../stores/useStations';
import type { StationType } from '../../types';

/**
 * Display names for station types.
 */
const STATION_TYPE_DISPLAY_NAMES: Record<StationType, string> = {
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
 * Get occupancy color classes based on percentage.
 * <70% = green, 70-90% = yellow, >90% = red
 */
function getOccupancyColors(percentage: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (percentage >= 90) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
  }
  if (percentage >= 70) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
  }
  return {
    bar: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };
}

interface StationCardProps {
  station: StationWithOccupancy;
  onClick: () => void;
}

function StationCard({ station, onClick }: StationCardProps) {
  const colors = getOccupancyColors(station.occupancyPercentage);

  return (
    <div
      className="flex flex-col p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"
      onClick={onClick}
    >
      {/* Header with name and warning badge */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 dark:text-white truncate">
            {station.name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {STATION_TYPE_DISPLAY_NAMES[station.type]}
          </div>
        </div>
        {station.isAtCapacity && (
          <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Full
          </span>
        )}
      </div>

      {/* Capacity bar */}
      <div className="mb-2">
        <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all duration-300`}
            style={{ width: `${Math.min(station.occupancyPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className={colors.text}>
          {station.occupancyPercentage}% full
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {station.currentOccupancy}/{station.capacity}
        </span>
      </div>

      {/* Batch count */}
      {station.batchCount > 0 && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {station.batchCount} batch{station.batchCount !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}

interface StationOverviewProps {
  /** Maximum stations to display before showing "view all" link */
  maxItems?: number;
}

export function StationOverview({ maxItems = 6 }: StationOverviewProps) {
  const navigate = useNavigate();
  const { stations, isLoading, loadStations, getActiveStations } = useStations();

  // Load stations on mount
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // Get active stations sorted by occupancy (highest first)
  const activeStations = useMemo(() => {
    return getActiveStations().sort(
      (a, b) => b.occupancyPercentage - a.occupancyPercentage
    );
  }, [stations]);

  // Stations at or near capacity (>90%)
  const stationsAtCapacity = useMemo(
    () => activeStations.filter((s) => s.occupancyPercentage >= 90),
    [activeStations]
  );

  // Display stations (limited)
  const displayStations = useMemo(
    () => activeStations.slice(0, maxItems),
    [activeStations, maxItems]
  );

  const hasMoreStations = activeStations.length > maxItems;

  // Loading state
  if (isLoading) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Station Overview
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-500 dark:text-slate-400">Loading stations...</div>
        </div>
      </div>
    );
  }

  // Empty state - no stations configured
  if (activeStations.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Station Overview
          </h2>
          <button
            onClick={() => navigate('/propagation/stations')}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            Manage Stations
          </button>
        </div>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">🏠</span>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            No propagation stations configured yet.
          </p>
          <button
            onClick={() => navigate('/propagation/stations/new')}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            Add First Station
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Station Overview
          </h2>
          {stationsAtCapacity.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
              {stationsAtCapacity.length} at capacity
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/propagation/stations')}
          className="text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          Manage Stations
        </button>
      </div>

      {/* Capacity warning banner */}
      {stationsAtCapacity.length > 0 && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          onClick={() => navigate('/propagation/stations?filter=at-capacity')}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-medium text-red-800 dark:text-red-200">
                {stationsAtCapacity.length} station{stationsAtCapacity.length !== 1 ? 's' : ''} at capacity
              </span>
              <span className="text-sm text-red-600 dark:text-red-300 ml-2">
                Consider moving batches or expanding
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Station grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayStations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            onClick={() => navigate(`/propagation/stations/${station.id}`)}
          />
        ))}
      </div>

      {/* View all link */}
      {hasMoreStations && (
        <button
          onClick={() => navigate('/propagation/stations')}
          className="w-full mt-4 py-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          View all {activeStations.length} stations
        </button>
      )}

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>{activeStations.length} active stations</span>
          <span>
            {activeStations.reduce((sum, s) => sum + s.currentOccupancy, 0)} /{' '}
            {activeStations.reduce((sum, s) => sum + s.capacity, 0)} total capacity
          </span>
        </div>
      </div>
    </div>
  );
}
