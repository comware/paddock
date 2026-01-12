/**
 * MotherPlantDetail - Comprehensive view of a single mother plant
 *
 * Displays:
 * - All mother plant metadata (species, acquisition, health)
 * - Productivity stats (batches taken, propagules started, success rate)
 * - Propagation history (list of batches from this mother)
 * - Health check history
 * - Status badge with quick status change
 * - "Take Cutting" quick action
 *
 * Route: /propagation/mother-plants/:id
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useMotherPlants, useBatches, type PropMotherPlantWithComputed } from '../../stores';
import type { MotherPlantStatus, PropMotherPlant } from '../../types';
import {
  getExtendedMotherPlantMetrics,
  type ExtendedMotherPlantMetrics,
  formatSuccessRate,
  getProductivityLevel,
  getProductivityColor,
  formatSeason,
} from '../../utils';
import { Modal } from '@/components/ui';
import { HealthCheckModal } from './HealthCheckModal';
import { MotherPlantForm } from './MotherPlantForm';
import { NewBatchForm } from '../Batches/NewBatchForm';
import { getStageDisplayName, getStageColors } from '../../utils';

// ============================================
// CONSTANTS
// ============================================

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
function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
      {icon && <span>{icon}</span>}
      {title}
    </h3>
  );
}

/**
 * Health indicator with score.
 */
function HealthIndicator({ score }: { score?: number }) {
  if (!score) {
    return <span className="text-slate-400">No data</span>;
  }

  const getColor = () => {
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score >= 3) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLabel = () => {
    if (score >= 4) return 'Excellent';
    if (score === 4) return 'Good';
    if (score === 3) return 'Fair';
    if (score === 2) return 'Poor';
    return 'Critical';
  };

  return (
    <span className={`font-medium ${getColor()}`}>
      {score}/5 ({getLabel()})
    </span>
  );
}

/**
 * Status change modal content.
 */
function StatusChangeModalContent({
  plant,
  onStatusChange,
  onClose,
}: {
  plant: PropMotherPlantWithComputed;
  onStatusChange: (status: MotherPlantStatus, notes?: string) => void;
  onClose: () => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState<MotherPlantStatus>(plant.status);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStatusChange(selectedStatus, notes || undefined);
  };

  const allStatuses: Array<{ value: MotherPlantStatus; label: string; description: string }> = [
    { value: 'active', label: 'Active', description: 'Currently used for propagation' },
    { value: 'retired', label: 'Retired', description: 'No longer used but preserved' },
    { value: 'deceased', label: 'Deceased', description: 'Plant has died' },
  ];

  // Can't resurrect deceased plants
  const availableStatuses = plant.status === 'deceased'
    ? allStatuses.filter((s) => s.value === 'deceased')
    : allStatuses;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Status
        </label>
        <div className="space-y-2">
          {availableStatuses.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedStatus(option.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                selectedStatus === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[option.value].bg}`} />
              <div className="text-left flex-1">
                <div className={`font-medium ${selectedStatus === option.value ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedStatus !== plant.status && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            placeholder="Reason for status change..."
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={selectedStatus === plant.status}
          className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          Update Status
        </button>
      </div>
    </form>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MotherPlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stores
  const {
    getMotherPlantById,
    loadMotherPlants,
    recordHealthCheck,
    retireMotherPlant,
    markDeceased,
    reactivateMotherPlant,
    isLoading,
  } = useMotherPlants();
  const { getFilteredBatches, loadBatches } = useBatches();

  // Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTakeCuttingModal, setShowTakeCuttingModal] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState<ExtendedMotherPlantMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Load data
  useEffect(() => {
    loadMotherPlants();
    loadBatches();
  }, [loadMotherPlants, loadBatches]);

  // Get plant data
  const plant = useMemo(() => {
    if (!id) return null;
    return getMotherPlantById(id);
  }, [id, getMotherPlantById]);

  // Load metrics
  useEffect(() => {
    async function loadMetrics() {
      if (!id) return;
      setIsLoadingMetrics(true);
      try {
        const metricsData = await getExtendedMotherPlantMetrics(id);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    }
    loadMetrics();
  }, [id]);

  // Get batches for this mother plant
  const batches = useMemo(() => {
    if (!id) return [];
    return getFilteredBatches().filter((b) => b.motherPlantId === id);
  }, [id, getFilteredBatches]);

  // Handlers
  const handleStatusChange = async (status: MotherPlantStatus, notes?: string) => {
    if (!id) return;

    try {
      if (status === 'retired') {
        await retireMotherPlant(id, notes);
      } else if (status === 'deceased') {
        await markDeceased(id, notes);
      } else if (status === 'active') {
        await reactivateMotherPlant(id);
      }
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleHealthCheckSubmit = async (plantId: string, score: number, notes?: string) => {
    await recordHealthCheck(plantId, score, notes);
    // Reload to refresh the UI
    await loadMotherPlants();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading mother plant...</div>
      </div>
    );
  }

  // Plant not found (404 state)
  if (!plant) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">?</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Mother Plant Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This mother plant doesn't exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/propagation/mother-plants')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to Mother Plants
        </button>
      </div>
    );
  }

  const statusColors = STATUS_COLORS[plant.status];
  const productivityLevel = metrics ? getProductivityLevel(metrics.successRate, metrics.totalBatches) : 'insufficient_data';
  const productivityColor = getProductivityColor(productivityLevel);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/propagation/mother-plants"
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span>&larr;</span>
        <span>Back to Mother Plants</span>
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {plant.label}
              </h1>
              <button
                onClick={() => setShowStatusModal(true)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors.bg} ${statusColors.text} hover:opacity-80 transition-opacity`}
              >
                {plant.status.charAt(0).toUpperCase() + plant.status.slice(1)}
              </button>
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-300">
              {plant.species}
              {plant.variety && <span className="text-slate-400"> - {plant.variety}</span>}
            </div>
            {plant.scientificName && (
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                {plant.scientificName}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {plant.status === 'active' && (
              <>
                <button
                  onClick={() => setShowTakeCuttingModal(true)}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                >
                  Take Cutting
                </button>
                <button
                  onClick={() => setShowHealthModal(true)}
                  className="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                >
                  Health Check
                </button>
              </>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plant Metadata */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Plant Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Label" value={plant.label} />
                <MetadataRow label="Species" value={plant.species} />
                <MetadataRow label="Variety" value={plant.variety} />
                <MetadataRow label="Scientific Name" value={plant.scientificName} />
                <MetadataRow label="Location" value={plant.location} />
              </div>
              <div>
                <MetadataRow
                  label="Acquisition Date"
                  value={format(new Date(plant.acquisitionDate), 'MMM d, yyyy')}
                />
                <MetadataRow
                  label="Acquisition Method"
                  value={ACQUISITION_METHOD_NAMES[plant.acquisitionMethod] || plant.acquisitionMethod}
                />
                <MetadataRow label="Source" value={plant.acquisitionSource} />
                <MetadataRow
                  label="Cost"
                  value={plant.acquisitionCost ? `$${plant.acquisitionCost.toFixed(2)}` : undefined}
                />
                <MetadataRow
                  label="Age"
                  value={
                    plant.ageInMonths < 12
                      ? `${plant.ageInMonths} months`
                      : `${Math.floor(plant.ageInMonths / 12)} years, ${plant.ageInMonths % 12} months`
                  }
                />
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Health Status" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Current Health">
                  <HealthIndicator score={plant.healthScore} />
                </MetadataRow>
                <MetadataRow
                  label="Last Check"
                  value={
                    plant.lastHealthCheck
                      ? format(new Date(plant.lastHealthCheck), 'MMM d, yyyy')
                      : 'Never'
                  }
                />
                {plant.daysSinceLastHealthCheck !== null && (
                  <MetadataRow label="Days Since Check" value={plant.daysSinceLastHealthCheck} />
                )}
              </div>
              <div>
                {plant.healthNotes && (
                  <div className="py-2">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Notes</span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm">
                      {plant.healthNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Propagation Notes */}
          {plant.propagationNotes && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <SectionHeader title="Propagation Notes" />
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {plant.propagationNotes}
              </p>
            </div>
          )}

          {/* Propagation History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Propagation History" />
            {batches.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No batches have been taken from this mother plant yet.
                {plant.status === 'active' && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowTakeCuttingModal(true)}
                      className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                    >
                      Take First Cutting
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {batches.slice(0, 10).map((batch) => {
                  const stageColors = getStageColors(batch.stage);
                  return (
                    <Link
                      key={batch.id}
                      to={`/propagation/batches/${batch.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {batch.batchNumber}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {format(new Date(batch.dateTaken), 'MMM d, yyyy')} - {batch.quantityStarted} started
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
                        >
                          {getStageDisplayName(batch.stage)}
                        </span>
                        <span className="text-slate-400">&rarr;</span>
                      </div>
                    </Link>
                  );
                })}
                {batches.length > 10 && (
                  <div className="text-center py-2 text-sm text-slate-500 dark:text-slate-400">
                    ... and {batches.length - 10} more batches
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Stats and Links */}
        <div className="space-y-6">
          {/* Productivity Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Productivity" />
            {isLoadingMetrics ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                Loading metrics...
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                {/* Overall Rating */}
                <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className={`text-2xl font-bold ${productivityColor}`}>
                    {productivityLevel === 'insufficient_data'
                      ? 'Insufficient Data'
                      : productivityLevel.charAt(0).toUpperCase() + productivityLevel.slice(1)}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Productivity Rating
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {metrics.totalBatches}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Batches Taken
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {metrics.totalPropagules}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Propagules Started
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {metrics.totalGraduated}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Graduated
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatSuccessRate(metrics.successRate)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Success Rate
                    </div>
                  </div>
                </div>

                {/* Best Method/Season */}
                {(metrics.bestMethod || metrics.bestSeason) && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    {metrics.bestMethod && (
                      <MetadataRow
                        label="Best Method"
                        value={metrics.bestMethod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      />
                    )}
                    {metrics.bestSeason && (
                      <MetadataRow label="Best Season" value={formatSeason(metrics.bestSeason)} />
                    )}
                  </div>
                )}

                {/* Active Batches */}
                {metrics.totalActive > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <MetadataRow label="Active Batches" value={metrics.totalActive} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                No productivity data available.
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {plant.status === 'active' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <SectionHeader title="Quick Actions" />
              <div className="space-y-2">
                <button
                  onClick={() => setShowTakeCuttingModal(true)}
                  className="w-full px-4 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                >
                  Take Cutting
                </button>
                <button
                  onClick={() => setShowHealthModal(true)}
                  className="w-full px-4 py-3 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                >
                  Record Health Check
                </button>
              </div>
            </div>
          )}

          {/* Photo Placeholder */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Photos" />
            {plant.photoUrl ? (
              <img
                src={plant.photoUrl}
                alt={plant.label}
                className="w-full h-48 object-cover rounded-lg"
              />
            ) : (
              <div className="p-8 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
                <div className="text-slate-400 dark:text-slate-500 text-sm">
                  No photo yet
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change Status"
        size="md"
      >
        <StatusChangeModalContent
          plant={plant}
          onStatusChange={handleStatusChange}
          onClose={() => setShowStatusModal(false)}
        />
      </Modal>

      <HealthCheckModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        plant={plant}
        onSubmit={handleHealthCheckSubmit}
      />

      <MotherPlantForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingPlant={plant as PropMotherPlant}
      />

      <NewBatchForm
        isOpen={showTakeCuttingModal}
        onClose={() => setShowTakeCuttingModal(false)}
        prefillMotherPlantId={plant.id}
        prefillSpecies={plant.species}
        prefillVariety={plant.variety}
      />
    </div>
  );
}
