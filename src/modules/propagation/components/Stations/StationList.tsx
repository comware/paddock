/**
 * StationList - Main propagation station management view
 *
 * Features:
 * - Grid display of all stations via StationCard
 * - Filter by type and active status
 * - Occupancy summary stats
 * - Quick actions for edit, deactivate, log environment
 * - Mobile-responsive card layout
 *
 * Follows the BatchList pattern from the propagation module.
 */

import { LayoutGrid, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStations } from '../../stores/useStations';
import type { StationType, PropStation } from '../../types';
import type { StationFilters } from '../../stores/useStations';
import { StationCard } from './StationCard';
import { StationForm } from './StationForm';
import { EnvironmentLogModal } from './EnvironmentLogModal';

// ============================================
// FILTER OPTIONS
// ============================================

const TYPE_OPTIONS: Array<{ value: StationType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'heated_propagator', label: 'Heated Propagator' },
  { value: 'unheated_propagator', label: 'Unheated Propagator' },
  { value: 'water_propagation', label: 'Water Propagation' },
  { value: 'outdoor_bed', label: 'Outdoor Bed' },
  { value: 'cold_frame', label: 'Cold Frame' },
  { value: 'greenhouse_bench', label: 'Greenhouse Bench' },
  { value: 'mist_system', label: 'Mist System' },
  { value: 'other', label: 'Other' },
];

const ACTIVE_OPTIONS: Array<{ value: boolean | 'all'; label: string }> = [
  { value: 'all', label: 'All Stations' },
  { value: true, label: 'Active Only' },
  { value: false, label: 'Inactive Only' },
];

// ============================================
// COMPONENT
// ============================================

export function StationList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Store state and actions
  const {
    stations,
    isLoading,
    loadStations,
    filters,
    setFilters,
    resetFilters,
    getFilteredStations,
    toggleStationActive,
    getStationById,
  } = useStations();

  // Modal state
  const [isNewStationOpen, setIsNewStationOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<PropStation | null>(null);
  const [loggingStation, setLoggingStation] = useState<PropStation | null>(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const activeParam = searchParams.get('active');

    const urlFilters: Partial<StationFilters> = {};
    if (typeParam) urlFilters.type = typeParam as StationType | 'all';
    if (activeParam !== null) {
      if (activeParam === 'true') urlFilters.isActive = true;
      else if (activeParam === 'false') urlFilters.isActive = false;
      else urlFilters.isActive = 'all';
    }

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load stations on mount
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // Sync filters to URL params
  const updateSearchParams = useCallback(
    (newFilters: Partial<StationFilters>) => {
      const params = new URLSearchParams();
      const mergedFilters = { ...filters, ...newFilters };

      if (mergedFilters.type !== 'all') params.set('type', mergedFilters.type as string);
      if (mergedFilters.isActive !== 'all') params.set('active', String(mergedFilters.isActive));

      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams]
  );

  // Handle filter changes
  const handleTypeChange = useCallback(
    (type: StationType | 'all') => {
      setFilters({ type });
      updateSearchParams({ type });
    },
    [setFilters, updateSearchParams]
  );

  const handleActiveChange = useCallback(
    (isActive: boolean | 'all') => {
      setFilters({ isActive });
      updateSearchParams({ isActive });
    },
    [setFilters, updateSearchParams]
  );

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [resetFilters, setSearchParams]);

  // Handle station actions
  const handleEditClick = useCallback(
    (stationId: string) => {
      const station = getStationById(stationId);
      if (station) {
        setEditingStation(station);
      }
    },
    [getStationById]
  );

  const handleLogEnvironmentClick = useCallback(
    (stationId: string) => {
      const station = getStationById(stationId);
      if (station) {
        setLoggingStation(station);
      }
    },
    [getStationById]
  );

  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleActiveClick = useCallback(
    async (stationId: string) => {
      setActionError(null);
      try {
        await toggleStationActive(stationId);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to toggle station active:', error);
        setActionError((error as Error).message || 'Failed to update station status');
      }
    },
    [toggleStationActive]
  );

  const handleStationClick = useCallback(
    (stationId: string) => {
      navigate(`/propagation/stations/${stationId}`);
    },
    [navigate]
  );

  // Get filtered stations and stats
  const filteredStations = getFilteredStations();

  const stats = useMemo(() => {
    const activeStations = stations.filter((s) => s.isActive);
    const totalCapacity = activeStations.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = activeStations.reduce((sum, s) => sum + s.currentOccupancy, 0);
    const atCapacityCount = activeStations.filter((s) => s.isAtCapacity).length;

    return {
      total: stations.length,
      active: activeStations.length,
      inactive: stations.length - activeStations.length,
      totalCapacity,
      totalOccupancy,
      overallOccupancy: totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0,
      atCapacity: atCapacityCount,
    };
  }, [stations]);

  // Check if filters are applied
  const hasFilters = filters.type !== 'all' || filters.isActive !== 'all';

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading stations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Error */}
      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          {actionError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Propagation Stations</h1>
        <button
          onClick={() => setIsNewStationOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          New Station
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 card">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Type:</label>
          <select
            value={filters.type}
            onChange={(e) => handleTypeChange(e.target.value as StationType | 'all')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Status:</label>
          <select
            value={String(filters.isActive)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') handleActiveChange('all');
              else handleActiveChange(val === 'true');
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {ACTIVE_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters */}
        {hasFilters && (
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        )}

        {/* Results Count */}
        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          {filteredStations.length} of {stations.length} stations
        </div>
      </div>

      {/* Station Grid */}
      {filteredStations.length === 0 ? (
        <EmptyState
          Icon={hasFilters ? SearchX : LayoutGrid}
          title={stations.length === 0 ? 'No stations yet' : 'No stations match filters'}
          description={
            stations.length === 0
              ? 'Create your first propagation station to start tracking where your batches grow.'
              : 'Try adjusting your filters to see more stations.'
          }
          action={
            stations.length === 0 ? { label: 'Create first station', onClick: () => setIsNewStationOpen(true) } : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              onEdit={handleEditClick}
              onLogEnvironment={handleLogEnvironmentClick}
              onToggleActive={handleToggleActiveClick}
              onClick={handleStationClick}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {stations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.active}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Active</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-400 dark:text-slate-500">
              {stats.inactive}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Inactive</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalCapacity}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Capacity</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.totalOccupancy}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Occupied</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${
              stats.overallOccupancy >= 90
                ? 'text-red-600 dark:text-red-400'
                : stats.overallOccupancy >= 70
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
            }`}>
              {stats.overallOccupancy}%
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Occupancy</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${
              stats.atCapacity > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
            }`}>
              {stats.atCapacity}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">At Capacity</div>
          </div>
        </div>
      )}

      {/* New Station Form Modal */}
      <StationForm
        isOpen={isNewStationOpen}
        onClose={() => setIsNewStationOpen(false)}
      />

      {/* Edit Station Form Modal */}
      <StationForm
        isOpen={!!editingStation}
        onClose={() => setEditingStation(null)}
        editStation={editingStation || undefined}
      />

      {/* Environment Log Modal */}
      <EnvironmentLogModal
        isOpen={!!loggingStation}
        onClose={() => setLoggingStation(null)}
        station={loggingStation}
      />
    </div>
  );
}
