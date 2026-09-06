/**
 * StationDetail - Comprehensive view of a single propagation station
 *
 * Displays:
 * - Station metadata (name, type, capacity, environmental targets)
 * - Current batches at this station
 * - Environmental log history
 * - Action buttons (Edit, Deactivate, Log Environment)
 *
 * Route: /propagation/stations/:id
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useStations } from '../../stores/useStations';
import { useBatches } from '../../stores/useBatches';
import { propDb, fkMatch } from '@/lib/db';
import type { PropStationLog } from '../../types';
import { StationForm } from './StationForm';
import { EnvironmentLogModal } from './EnvironmentLogModal';
import { NotFound } from '@/components/shared';
import {
  TYPE_DISPLAY_NAMES,
  MetadataRow,
  SectionHeader,
  BatchListItem,
  EnvironmentLogEntry,
  getOccupancyColor,
} from './StationDetailParts';

// ============================================
// MAIN COMPONENT
// ============================================

export function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stores
  const {
    getStationById,
    loadStations,
    toggleStationActive,
    isLoading: stationsLoading,
  } = useStations();
  const { batches, loadBatches, isLoading: batchesLoading } = useBatches();

  // Local state
  const [environmentLogs, setEnvironmentLogs] = useState<PropStationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadStations();
    loadBatches();
  }, [loadStations, loadBatches]);

  // Load environment logs for this station
  useEffect(() => {
    async function loadLogs() {
      if (!id) return;

      setLogsLoading(true);
      try {
        const logs = await propDb.stationLogs
          .where('stationId')
          .anyOf(fkMatch(id))
          .reverse()
          .sortBy('date');
        setEnvironmentLogs(logs.slice(0, 20));
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load environment logs:', error);
        setActionError('Failed to load environment logs');
      } finally {
        setLogsLoading(false);
      }
    }

    loadLogs();
  }, [id]);

  // Get station data
  const station = useMemo(() => {
    if (!id) return null;
    return getStationById(id);
  }, [id, getStationById]);

  // Get batches at this station
  const stationBatches = useMemo(() => {
    if (!id) return [];
    return batches.filter(
      (b) => b.stationId === id && b.stage !== 'failed' && b.stage !== 'graduated'
    );
  }, [id, batches]);

  // Handle toggle active
  const handleToggleActive = useCallback(async () => {
    if (!id) return;
    setActionError(null);
    try {
      await toggleStationActive(id);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to toggle station active:', error);
      setActionError((error as Error).message || 'Failed to update station status');
    }
  }, [id, toggleStationActive]);

  // Handle log success - refresh logs
  const handleLogSuccess = useCallback(async () => {
    if (!id) return;
    const logs = await propDb.stationLogs
      .where('stationId')
      .anyOf(fkMatch(id))
      .reverse()
      .sortBy('date');
    setEnvironmentLogs(logs.slice(0, 20));
  }, [id]);

  // Loading state
  if (stationsLoading || batchesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading station...</div>
      </div>
    );
  }

  // Station not found
  if (!station) {
    return (
      <NotFound
        thing="Station"
        backTo={{ label: 'Back to stations', onClick: () => navigate('/propagation/stations') }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/propagation/stations"
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span>&larr;</span>
        <span>Back to Stations</span>
      </Link>

      {/* Action Error */}
      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          {actionError}
        </div>
      )}

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {station.name}
              </h1>
              {!station.isActive && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                  Inactive
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  station.isIndoor
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                }`}
              >
                {station.isIndoor ? 'Indoor' : 'Outdoor'}
              </span>
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-300">
              {TYPE_DISPLAY_NAMES[station.type] || station.type}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {station.isActive && (
              <button
                onClick={() => setShowLogModal(true)}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                Log Environment
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleToggleActive}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                station.isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
              }`}
            >
              {station.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <SectionHeader title="Station Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Name" value={station.name} />
                <MetadataRow label="Type" value={TYPE_DISPLAY_NAMES[station.type] || station.type} />
                <MetadataRow label="Capacity" value={station.capacity} />
                <MetadataRow label="Location" value={station.isIndoor ? 'Indoor' : 'Outdoor'} />
              </div>
              <div>
                <MetadataRow label="Current Occupancy">
                  <span className={`font-medium ${getOccupancyColor(station.occupancyPercentage)}`}>
                    {station.currentOccupancy}/{station.capacity} ({station.occupancyPercentage}%)
                  </span>
                </MetadataRow>
                <MetadataRow label="Available" value={station.availableCapacity} />
                <MetadataRow label="Active Batches" value={station.batchCount} />
                <MetadataRow label="Status" value={station.isActive ? 'Active' : 'Inactive'} />
              </div>
            </div>

            {(station.targetTempMin !== undefined || station.targetHumidityMin !== undefined) && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Environmental Targets
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {station.targetTempMin !== undefined && station.targetTempMax !== undefined && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Temperature</span>
                      <div className="text-lg font-medium text-slate-900 dark:text-white">
                        {station.targetTempMin}-{station.targetTempMax}C
                      </div>
                    </div>
                  )}
                  {station.targetHumidityMin !== undefined && station.targetHumidityMax !== undefined && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Humidity</span>
                      <div className="text-lg font-medium text-slate-900 dark:text-white">
                        {station.targetHumidityMin}-{station.targetHumidityMax}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {station.description && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Description
                </h4>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {station.description}
                </p>
              </div>
            )}
          </div>

          <div className="card p-6">
            <SectionHeader title={`Current Batches (${stationBatches.length})`} />
            {stationBatches.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No active batches at this station.
              </div>
            ) : (
              <div className="space-y-2">
                {stationBatches.map((batch) => (
                  <BatchListItem key={batch.id} batch={batch} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="card p-6">
            <SectionHeader title="Occupancy" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    station.occupancyPercentage >= 90
                      ? 'bg-red-500'
                      : station.occupancyPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(station.occupancyPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  {station.currentOccupancy} occupied
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {station.availableCapacity} available
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Environment Logs" />
              {station.isActive && (
                <button
                  onClick={() => setShowLogModal(true)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  + Add Log
                </button>
              )}
            </div>
            {logsLoading ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                Loading logs...
              </div>
            ) : environmentLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No environment logs recorded.
                {station.isActive && (
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="block mx-auto mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    Log first reading
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {environmentLogs.map((log) => (
                  <EnvironmentLogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <SectionHeader title="Quick Stats" />
            <div className="space-y-3 text-sm">
              <MetadataRow
                label="Created"
                value={format(new Date(station.createdAt), 'MMM d, yyyy')}
              />
              <MetadataRow
                label="Last Updated"
                value={format(new Date(station.updatedAt), 'MMM d, yyyy')}
              />
              {environmentLogs.length > 0 && (
                <MetadataRow
                  label="Last Log"
                  value={format(new Date(environmentLogs[0].date), 'MMM d, h:mm a')}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <StationForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editStation={station}
        onSuccess={() => setShowEditModal(false)}
      />
      <EnvironmentLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        station={station}
        onSuccess={handleLogSuccess}
      />
    </div>
  );
}
