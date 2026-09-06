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

import { Sprout, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBatches } from '../../stores';
import type { BatchFilters as BatchFiltersType, BatchSort } from '../../types';
import { BatchCard } from './BatchCard';
import { BatchFilters } from './BatchFilters';
import { NewBatchForm } from './NewBatchForm';
import { StageTransitionModal, type TransitionMode } from './StageTransitionModal';

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
  } = useBatches();

  // Modal state
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionBatchId, setTransitionBatchId] = useState<string | null>(null);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>('advance');

  // Initialize filters from URL params on mount (intentionally runs once)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const handleAdvanceStageClick = useCallback((batchId: string) => {
    setTransitionBatchId(batchId);
    setTransitionMode('advance');
    setTransitionModalOpen(true);
  }, []);

  // Handle record failure modal open
  const handleRecordFailureClick = useCallback((batchId: string) => {
    setTransitionBatchId(batchId);
    setTransitionMode('fail');
    setTransitionModalOpen(true);
  }, []);

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

  // Handle transition modal close
  const handleTransitionModalClose = useCallback(() => {
    setTransitionModalOpen(false);
    setTransitionBatchId(null);
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Propagation Batches</h1>
        <button
          onClick={() => setIsNewBatchOpen(true)}
          className="min-h-[44px] btn btn-primary w-full sm:w-auto"
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
        <EmptyState
          Icon={filters.stage !== 'all' ? SearchX : Sprout}
          title={
            batches.length === 0
              ? 'No batches yet'
              : `No ${filters.stage === 'all' ? '' : filters.stage + ' '}batches found`
          }
          description={
            batches.length === 0
              ? 'Start tracking your first propagation batch. Record cuttings, divisions, or other propagation methods.'
              : 'Try adjusting your filters to see more batches.'
          }
          action={
            batches.length === 0
              ? { label: 'Create first batch', onClick: () => setIsNewBatchOpen(true) }
              : undefined
          }
        />
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

      {/* Stage Transition Modal */}
      {transitionBatchId && (
        <StageTransitionModal
          batchId={transitionBatchId}
          isOpen={transitionModalOpen}
          onClose={handleTransitionModalClose}
          mode={transitionMode}
        />
      )}

      {/* New Batch Form Modal */}
      <NewBatchForm
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
      />
    </div>
  );
}
