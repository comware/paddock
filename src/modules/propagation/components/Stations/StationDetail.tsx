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
import { propDb } from '@/lib/db';
import type { PropStation, PropStationLog, PropBatchWithComputed } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils';
import { StationForm } from './StationForm';
import { EnvironmentLogModal } from './EnvironmentLogModal';

// ============================================
// TYPE DISPLAY NAMES
// ============================================

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

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Metadata row component for consistent styling.
 */
function MetadataRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      {children || (
        <span className="text-slate-900 dark:text-white font-medium">
          {value ?? '-'}
        </span>
      )}
    </div>
  );
}

/**
 * Section header component.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
      {title}
    </h3>
  );
}

/**
 * Batch list item for station detail.
 */
function BatchListItem({ batch }: { batch: PropBatchWithComputed }) {
  const stageColors = getStageColors(batch.stage);

  return (
    <Link
      to={`/propagation/batches/${batch.id}`}
      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white">
            {batch.batchNumber}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
          >
            {getStageDisplayName(batch.stage)}
          </span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {batch.species}
          {batch.variety && ` - ${batch.variety}`}
        </div>
      </div>
      <div className="text-right text-sm">
        <div className="text-slate-700 dark:text-slate-300">
          {batch.quantitySurviving} propagules
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-xs">
          Day {batch.daysSinceTaken}
        </div>
      </div>
    </Link>
  );
}

/**
 * Environment log entry display.
 */
function EnvironmentLogEntry({ log }: { log: PropStationLog }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-4">
        {log.temperature !== undefined && (
          <span className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Temp:</span>{' '}
            <span className="text-slate-900 dark:text-white font-medium">{log.temperature}C</span>
          </span>
        )}
        {log.humidity !== undefined && (
          <span className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Humidity:</span>{' '}
            <span className="text-slate-900 dark:text-white font-medium">{log.humidity}%</span>
          </span>
        )}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {format(new Date(log.date), 'MMM d, h:mm a')}
      </span>
    </div>
  );
}

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
          .equals(id)
          .reverse()
          .sortBy('date');
        setEnvironmentLogs(logs.slice(0, 20)); // Last 20 logs
      } catch (error) {
        console.error('Failed to load environment logs:', error);
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

  // Get occupancy color
  const getOccupancyColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Handle toggle active
  const handleToggleActive = useCallback(async () => {
    if (!id) return;
    try {
      await toggleStationActive(id);
    } catch (error) {
      console.error('Failed to toggle station active:', error);
    }
  }, [id, toggleStationActive]);

  // Handle log success - refresh logs
  const handleLogSuccess = useCallback(async () => {
    if (!id) return;
    const logs = await propDb.stationLogs
      .where('stationId')
      .equals(id)
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
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">?</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Station Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This station doesn't exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/propagation/stations')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to Stations
        </button>
      </div>
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

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
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
        {/* Left Column - Metadata and Batches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Station Metadata */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
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

            {/* Environmental Targets */}
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

            {/* Description */}
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

          {/* Current Batches */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
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

        {/* Right Column - Environment Logs */}
        <div className="space-y-6">
          {/* Occupancy Visual */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
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

          {/* Environment Logs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
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

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
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

      {/* Edit Station Modal */}
      <StationForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editStation={station}
        onSuccess={() => setShowEditModal(false)}
      />

      {/* Environment Log Modal */}
      <EnvironmentLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        station={station}
        onSuccess={handleLogSuccess}
      />
    </div>
  );
}
