/** MotherPlantDetail - Comprehensive view of a single mother plant. */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMotherPlants, useBatches } from '../../stores';
import type { MotherPlantStatus, PropMotherPlant } from '../../types';
import { getExtendedMotherPlantMetrics, type ExtendedMotherPlantMetrics } from '../../utils';
import { Modal } from '@/components/ui';
import { HealthCheckModal } from './HealthCheckModal';
import { MotherPlantForm } from './MotherPlantForm';
import { NewBatchForm } from '../Batches/NewBatchForm';
import { SectionHeader, MotherPlantInfoSection, MotherPlantHealthSection } from './MotherPlantInfo';
import { MotherPlantCuttings } from './MotherPlantCuttings';
import { StatusChangeModalContent, ProductivityStats, STATUS_COLORS } from './MotherPlantHealth';

export function MotherPlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTakeCuttingModal, setShowTakeCuttingModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
        if (import.meta.env.DEV) console.error('Failed to load metrics:', error);
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
      if (import.meta.env.DEV) console.error('Failed to update status:', error);
      setActionError((error as Error).message || 'Failed to update plant status');
    }
  };

  const handleHealthCheckSubmit = async (plantId: string, score: number, notes?: string) => {
    await recordHealthCheck(plantId, score, notes);
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

      {/* Action Error */}
      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          {actionError}
        </div>
      )}

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
          <MotherPlantInfoSection plant={plant} />
          <MotherPlantHealthSection plant={plant} />

          {/* Propagation Notes */}
          {plant.propagationNotes && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <SectionHeader title="Propagation Notes" />
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {plant.propagationNotes}
              </p>
            </div>
          )}

          <MotherPlantCuttings
            batches={batches}
            isActive={plant.status === 'active'}
            onTakeCutting={() => setShowTakeCuttingModal(true)}
          />
        </div>

        {/* Right Column - Stats and Links */}
        <div className="space-y-6">
          <ProductivityStats metrics={metrics} isLoadingMetrics={isLoadingMetrics} />

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
