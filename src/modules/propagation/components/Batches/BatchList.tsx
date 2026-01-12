/**
 * BatchList - Main propagation batch management view
 *
 * Features:
 * - Grid display of all batches via BatchCard
 * - Filter by stage, species, method, station via BatchFilters
 * - Sort by date, species, stage, days-in-stage
 * - Quick actions for advance stage / record failure
 * - Mobile-responsive card layout
 *
 * Follows the TrayList pattern from the grow module.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBatches } from '../../stores';
import type { PropBatchWithComputed, PropagationStage, BatchFilters as BatchFiltersType, BatchSort, FailureReason } from '../../types';
import { BatchCard } from './BatchCard';
import { BatchFilters } from './BatchFilters';
import { Modal } from '@/components/ui/Modal';
import { getStageDisplayName, getValidNextStages, isActiveStage } from '../../utils';

/**
 * Failure reason options for the failure modal.
 */
const FAILURE_REASONS: { value: FailureReason; label: string }[] = [
  { value: 'rot', label: 'Rot (fungal/bacterial)' },
  { value: 'dried_out', label: 'Dried Out' },
  { value: 'disease', label: 'Disease' },
  { value: 'pest', label: 'Pest Damage' },
  { value: 'no_roots', label: 'Failed to Root' },
  { value: 'transplant_shock', label: 'Transplant Shock' },
  { value: 'environmental', label: 'Environmental Issues' },
  { value: 'unknown', label: 'Unknown' },
];

export function BatchList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Store state and actions
  const {
    batches,
    isLoading,
    loadBatches,
    filters,
    sort,
    setFilters,
    setSort,
    resetFilters,
    getFilteredBatches,
    getUniqueSpecies,
    getUniqueStations,
    getStageCounts,
    advanceStage,
    markFailed,
  } = useBatches();

  // Modal state
  const [advancingBatch, setAdvancingBatch] = useState<PropBatchWithComputed | null>(null);
  const [failingBatch, setFailingBatch] = useState<PropBatchWithComputed | null>(null);
  const [selectedNextStage, setSelectedNextStage] = useState<PropagationStage | ''>('');
  const [advanceQuantity, setAdvanceQuantity] = useState<number>(0);
  const [failureReason, setFailureReason] = useState<FailureReason>('unknown');
  const [failureNotes, setFailureNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    const speciesParam = searchParams.get('species');
    const methodParam = searchParams.get('method');
    const stationParam = searchParams.get('station');
    const sortFieldParam = searchParams.get('sortField');
    const sortDirParam = searchParams.get('sortDir');

    const urlFilters: Partial<BatchFiltersType> = {};
    if (stageParam) urlFilters.stage = stageParam as BatchFiltersType['stage'];
    if (speciesParam) urlFilters.species = speciesParam;
    if (methodParam) urlFilters.method = methodParam as BatchFiltersType['method'];
    if (stationParam) urlFilters.stationId = stationParam;

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }

    if (sortFieldParam || sortDirParam) {
      setSort({
        field: (sortFieldParam as BatchSort['field']) || sort.field,
        direction: (sortDirParam as BatchSort['direction']) || sort.direction,
      });
    }
  }, []);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Sync filters to URL params
  const updateSearchParams = useCallback(
    (newFilters: Partial<BatchFiltersType>, newSort?: BatchSort) => {
      const params = new URLSearchParams();

      const mergedFilters = { ...filters, ...newFilters };
      const mergedSort = newSort || sort;

      if (mergedFilters.stage !== 'all') params.set('stage', mergedFilters.stage as string);
      if (mergedFilters.species !== 'all') params.set('species', mergedFilters.species as string);
      if (mergedFilters.method !== 'all') params.set('method', mergedFilters.method as string);
      if (mergedFilters.stationId !== 'all') params.set('station', mergedFilters.stationId as string);
      if (mergedSort.field !== 'dateTaken') params.set('sortField', mergedSort.field);
      if (mergedSort.direction !== 'desc') params.set('sortDir', mergedSort.direction);

      setSearchParams(params, { replace: true });
    },
    [filters, sort, setSearchParams]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: Partial<BatchFiltersType>) => {
      setFilters(newFilters);
      updateSearchParams(newFilters);
    },
    [setFilters, updateSearchParams]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSort: BatchSort) => {
      setSort(newSort);
      updateSearchParams({}, newSort);
    },
    [setSort, updateSearchParams]
  );

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [resetFilters, setSearchParams]);

  // Handle advance stage modal open
  const handleAdvanceStageClick = useCallback(
    (batchId: string) => {
      const batch = batches.find((b) => b.id === batchId);
      if (batch) {
        setAdvancingBatch(batch);
        const nextStages = getValidNextStages(batch.stage);
        // Pre-select the first valid non-failed stage
        const defaultNext = nextStages.find((s) => s !== 'failed') || '';
        setSelectedNextStage(defaultNext);
        setAdvanceQuantity(batch.quantitySurviving);
      }
    },
    [batches]
  );

  // Handle record failure modal open
  const handleRecordFailureClick = useCallback(
    (batchId: string) => {
      const batch = batches.find((b) => b.id === batchId);
      if (batch) {
        setFailingBatch(batch);
        setFailureReason('unknown');
        setFailureNotes('');
      }
    },
    [batches]
  );

  // Handle view details
  const handleViewDetails = useCallback(
    (batchId: string) => {
      navigate(`/propagation/batches/${batchId}`);
    },
    [navigate]
  );

  // Handle batch card click
  const handleBatchClick = useCallback(
    (batchId: string) => {
      navigate(`/propagation/batches/${batchId}`);
    },
    [navigate]
  );

  // Submit advance stage
  const handleAdvanceStageSubmit = useCallback(async () => {
    if (!advancingBatch || !selectedNextStage) return;

    setIsSubmitting(true);
    try {
      await advanceStage(advancingBatch.id!, selectedNextStage as PropagationStage, advanceQuantity);
      setAdvancingBatch(null);
      setSelectedNextStage('');
    } catch (error) {
      console.error('Failed to advance stage:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [advancingBatch, selectedNextStage, advanceQuantity, advanceStage]);

  // Submit record failure
  const handleRecordFailureSubmit = useCallback(async () => {
    if (!failingBatch) return;

    setIsSubmitting(true);
    try {
      await markFailed(failingBatch.id!, failureReason, failureNotes || undefined);
      setFailingBatch(null);
      setFailureReason('unknown');
      setFailureNotes('');
    } catch (error) {
      console.error('Failed to record failure:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [failingBatch, failureReason, failureNotes, markFailed]);

  // Get filtered batches and stats
  const filteredBatches = getFilteredBatches();
  const uniqueSpecies = getUniqueSpecies();
  const uniqueStations = getUniqueStations();
  const stageCounts = getStageCounts();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading batches...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Propagation Batches</h1>
        <button
          onClick={() => navigate('/propagation/batches/new')}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          New Batch
        </button>
      </div>

      {/* Filters */}
      <BatchFilters
        filters={filters}
        sort={sort}
        stageCounts={stageCounts}
        uniqueSpecies={uniqueSpecies}
        uniqueStations={uniqueStations}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onResetFilters={handleResetFilters}
      />

      {/* Batch Grid */}
      {filteredBatches.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            {filters.stage !== 'all' ? '?' : ':seedling:'}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {batches.length === 0
              ? 'No batches yet'
              : `No ${filters.stage === 'all' ? '' : filters.stage + ' '}batches found`}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {batches.length === 0
              ? 'Start tracking your first propagation batch. Record cuttings, divisions, or other propagation methods.'
              : 'Try adjusting your filters to see more batches.'}
          </p>
          {batches.length === 0 && (
            <button
              onClick={() => navigate('/propagation/batches/new')}
              className="px-6 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              Create First Batch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onAdvanceStage={handleAdvanceStageClick}
              onRecordFailure={handleRecordFailureClick}
              onViewDetails={handleViewDetails}
              onClick={handleBatchClick}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {batches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stageCounts.active}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Active Batches</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stageCounts.graduated}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Graduated</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stageCounts.failed}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Failed</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {batches.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Batches</div>
          </div>
        </div>
      )}

      {/* Advance Stage Modal */}
      <Modal
        isOpen={!!advancingBatch}
        onClose={() => setAdvancingBatch(null)}
        title="Advance Stage"
        size="md"
      >
        {advancingBatch && (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Advance batch <strong>{advancingBatch.batchNumber}</strong> ({advancingBatch.species})
              from <strong>{getStageDisplayName(advancingBatch.stage)}</strong>.
            </p>

            {/* Next Stage Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Next Stage
              </label>
              <select
                value={selectedNextStage}
                onChange={(e) => setSelectedNextStage(e.target.value as PropagationStage)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select next stage...</option>
                {getValidNextStages(advancingBatch.stage)
                  .filter((s) => s !== 'failed')
                  .map((stage) => (
                    <option key={stage} value={stage}>
                      {getStageDisplayName(stage)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Quantity Update */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Surviving Quantity (currently {advancingBatch.quantitySurviving}/{advancingBatch.quantityStarted})
              </label>
              <input
                type="number"
                min={0}
                max={advancingBatch.quantityStarted}
                value={advanceQuantity}
                onChange={(e) => setAdvanceQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setAdvancingBatch(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdvanceStageSubmit}
                disabled={!selectedNextStage || isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Advancing...' : 'Advance Stage'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Failure Modal */}
      <Modal
        isOpen={!!failingBatch}
        onClose={() => setFailingBatch(null)}
        title="Record Failure"
        size="md"
      >
        {failingBatch && (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Record failure for batch <strong>{failingBatch.batchNumber}</strong> ({failingBatch.species}).
              This will mark all {failingBatch.quantitySurviving} remaining propagules as failed.
            </p>

            {/* Failure Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Reason for Failure
              </label>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value as FailureReason)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {FAILURE_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={failureNotes}
                onChange={(e) => setFailureNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Any additional details about what happened..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setFailingBatch(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordFailureSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Recording...' : 'Record Failure'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
