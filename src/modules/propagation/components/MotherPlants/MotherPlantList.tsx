/**
 * MotherPlantList - Main mother plant registry management view
 *
 * Features:
 * - Grid display of all mother plants via MotherPlantCard
 * - Filter by species, status
 * - Health check modal
 * - "Take Cutting" action that opens NewBatchForm with pre-filled motherPlantId
 * - Mobile-responsive card layout
 *
 * Follows the BatchList pattern from the propagation module.
 */

import { Leaf, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMotherPlants, type MotherPlantFilters, type MotherPlantSort, type PropMotherPlantWithComputed } from '../../stores';
import type { MotherPlantStatus } from '../../types';
import { MotherPlantCard } from './MotherPlantCard';
import { MotherPlantForm } from './MotherPlantForm';
import { HealthCheckModal } from './HealthCheckModal';
import { NewBatchForm } from '../Batches/NewBatchForm';

/**
 * Status options for filter dropdown.
 */
const STATUS_OPTIONS: Array<{ value: MotherPlantStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
  { value: 'deceased', label: 'Deceased' },
];

/**
 * Sort options for the list.
 */
const SORT_OPTIONS: Array<{ field: MotherPlantSort['field']; label: string }> = [
  { field: 'species', label: 'Species' },
  { field: 'label', label: 'Label' },
  { field: 'acquisitionDate', label: 'Acquisition Date' },
  { field: 'lastHealthCheck', label: 'Last Health Check' },
  { field: 'healthScore', label: 'Health Score' },
];

export function MotherPlantList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Store state and actions
  const {
    motherPlants,
    isLoading,
    loadMotherPlants,
    filters,
    sort,
    setFilters,
    setSort,
    resetFilters,
    getFilteredMotherPlants,
    getUniqueSpecies,
    getStatusCounts,
    recordHealthCheck,
  } = useMotherPlants();

  // Modal state
  const [isNewPlantOpen, setIsNewPlantOpen] = useState(false);
  const [healthCheckPlant, setHealthCheckPlant] = useState<PropMotherPlantWithComputed | null>(null);
  const [takeCuttingPlant, setTakeCuttingPlant] = useState<PropMotherPlantWithComputed | null>(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const speciesParam = searchParams.get('species');
    const sortFieldParam = searchParams.get('sortField');
    const sortDirParam = searchParams.get('sortDir');

    const urlFilters: Partial<MotherPlantFilters> = {};
    if (statusParam) urlFilters.status = statusParam as MotherPlantFilters['status'];
    if (speciesParam) urlFilters.species = speciesParam;

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }

    if (sortFieldParam || sortDirParam) {
      setSort({
        field: (sortFieldParam as MotherPlantSort['field']) || sort.field,
        direction: (sortDirParam as MotherPlantSort['direction']) || sort.direction,
      });
    }
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load mother plants on mount
  useEffect(() => {
    loadMotherPlants();
  }, [loadMotherPlants]);

  // Sync filters to URL params
  const updateSearchParams = useCallback(
    (newFilters: Partial<MotherPlantFilters>, newSort?: MotherPlantSort) => {
      const params = new URLSearchParams();

      const mergedFilters = { ...filters, ...newFilters };
      const mergedSort = newSort || sort;

      if (mergedFilters.status !== 'all') params.set('status', mergedFilters.status as string);
      if (mergedFilters.species !== 'all') params.set('species', mergedFilters.species as string);
      if (mergedSort.field !== 'species') params.set('sortField', mergedSort.field);
      if (mergedSort.direction !== 'asc') params.set('sortDir', mergedSort.direction);

      setSearchParams(params, { replace: true });
    },
    [filters, sort, setSearchParams]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: Partial<MotherPlantFilters>) => {
      setFilters(newFilters);
      updateSearchParams(newFilters);
    },
    [setFilters, updateSearchParams]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSort: MotherPlantSort) => {
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

  // Handle health check
  const handleHealthCheckClick = useCallback(
    (plantId: string) => {
      const plant = motherPlants.find((p) => p.id === plantId);
      if (plant) {
        setHealthCheckPlant(plant);
      }
    },
    [motherPlants]
  );

  // Handle health check submit
  const handleHealthCheckSubmit = useCallback(
    async (id: string, score: number, notes?: string) => {
      await recordHealthCheck(id, score, notes);
    },
    [recordHealthCheck]
  );

  // Handle take cutting (opens NewBatchForm with motherPlantId pre-filled)
  const handleTakeCuttingClick = useCallback(
    (plantId: string) => {
      const plant = motherPlants.find((p) => p.id === plantId);
      if (plant) {
        setTakeCuttingPlant(plant);
      }
    },
    [motherPlants]
  );

  // Handle view details
  const handleViewDetails = useCallback(
    (plantId: string) => {
      navigate(`/propagation/mother-plants/${plantId}`);
    },
    [navigate]
  );

  // Handle plant card click
  const handlePlantClick = useCallback(
    (plantId: string) => {
      navigate(`/propagation/mother-plants/${plantId}`);
    },
    [navigate]
  );

  // Get filtered plants and stats
  const filteredPlants = getFilteredMotherPlants();
  const uniqueSpecies = getUniqueSpecies();
  const statusCounts = getStatusCounts();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading mother plants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mother Plants</h1>
        <button
          onClick={() => setIsNewPlantOpen(true)}
          className="btn btn-primary"
        >
          <span className="text-lg">+</span>
          Register Mother Plant
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFiltersChange({ status: e.target.value as MotherPlantFilters['status'] })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.value !== 'all' && ` (${statusCounts[option.value as MotherPlantStatus]})`}
                </option>
              ))}
            </select>
          </div>

          {/* Species Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Species
            </label>
            <select
              value={filters.species}
              onChange={(e) => handleFiltersChange({ species: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Species</option>
              {uniqueSpecies.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Field */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sort By
            </label>
            <select
              value={sort.field}
              onChange={(e) => handleSortChange({ ...sort, field: e.target.value as MotherPlantSort['field'] })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.field} value={option.field}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Direction */}
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Order
            </label>
            <button
              onClick={() => handleSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              {sort.direction === 'asc' ? 'A-Z / Oldest' : 'Z-A / Newest'}
            </button>
          </div>

          {/* Reset Button */}
          <div className="flex-shrink-0 flex items-end">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Plant Grid */}
      {filteredPlants.length === 0 ? (
        <EmptyState
          Icon={filters.status !== 'all' || filters.species !== 'all' ? SearchX : Leaf}
          title={motherPlants.length === 0 ? 'No mother plants yet' : 'No matching plants found'}
          description={
            motherPlants.length === 0
              ? 'Register your first mother plant to start tracking your stock plants and their propagation history.'
              : 'Try adjusting your filters to see more plants.'
          }
          action={
            motherPlants.length === 0 ? { label: 'Register first mother plant', onClick: () => setIsNewPlantOpen(true) } : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlants.map((plant) => (
            <MotherPlantCard
              key={plant.id}
              plant={plant}
              onHealthCheck={handleHealthCheckClick}
              onTakeCutting={handleTakeCuttingClick}
              onViewDetails={handleViewDetails}
              onClick={handlePlantClick}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {motherPlants.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {statusCounts.active}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Active</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">
              {statusCounts.retired}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Retired</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {statusCounts.deceased}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Deceased</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {motherPlants.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total</div>
          </div>
        </div>
      )}

      {/* Register Mother Plant Modal */}
      <MotherPlantForm
        isOpen={isNewPlantOpen}
        onClose={() => setIsNewPlantOpen(false)}
      />

      {/* Health Check Modal */}
      <HealthCheckModal
        isOpen={!!healthCheckPlant}
        onClose={() => setHealthCheckPlant(null)}
        plant={healthCheckPlant}
        onSubmit={handleHealthCheckSubmit}
      />

      {/* Take Cutting Modal - Uses NewBatchForm with pre-filled motherPlantId */}
      {takeCuttingPlant && (
        <NewBatchForm
          isOpen={!!takeCuttingPlant}
          onClose={() => setTakeCuttingPlant(null)}
          prefillMotherPlantId={takeCuttingPlant.id}
          prefillSpecies={takeCuttingPlant.species}
          prefillVariety={takeCuttingPlant.variety}
        />
      )}
    </div>
  );
}
