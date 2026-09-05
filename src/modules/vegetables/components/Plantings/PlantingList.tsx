/**
 * PlantingList - Main planting management view.
 *
 * Scoped to the active site. Defaults to hiding `finished` and `failed` plantings - a
 * grower opening this view wants what is in the ground now - but a status filter can bring
 * them back into view; the default is a convenience, not a data loss.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlantings } from '../../stores/usePlantings';
import { useBeds } from '../../stores/useBeds';
import { useSites } from '@/platform';
import type { VegPlanting } from '@/lib/db';
import { PlantingCard } from './PlantingCard';
import { PlantingForm } from './PlantingForm';
import { EmptyState } from '@/components/shared';

type StatusFilter = 'current' | VegPlanting['status'] | 'all';

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'current', label: 'Current (hide finished/failed)' },
  { value: 'all', label: 'All' },
  { value: 'planned', label: 'Planned' },
  { value: 'growing', label: 'Growing' },
  { value: 'harvesting', label: 'Harvesting' },
  { value: 'finished', label: 'Finished' },
  { value: 'failed', label: 'Failed' },
];

const ALL_BEDS = '__all__';
const ALL_CROPS = '__all__';

export function PlantingList() {
  const navigate = useNavigate();
  const { isLoading, error, loadPlantings, plantingsBySite } = usePlantings();
  const { beds, loadBeds } = useBeds();
  const { activeSiteId, loadSites } = useSites();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('current');
  const [bedFilter, setBedFilter] = useState<string>(ALL_BEDS);
  const [cropFilter, setCropFilter] = useState<string>(ALL_CROPS);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadSites();
    loadPlantings();
    loadBeds();
  }, [loadSites, loadPlantings, loadBeds]);

  // usePlantings() above subscribes to the whole store, so this re-renders (and recomputes)
  // whenever the store's plantings array changes - no memoization of the filtered list
  // against a Zustand selector, whose reference never changes and would stop this
  // recomputing after a write.
  const sitePlantings = activeSiteId ? plantingsBySite(activeSiteId) : [];

  // No useMemo here, matching BedList's convention: sitePlantings is already a fresh
  // derivation off live store state each render, so memoizing against it buys nothing and
  // only risks staleness.
  const crops = Array.from(new Set(sitePlantings.map((p) => p.crop))).sort();

  const sitebeds = beds.filter((b) => b.siteId === activeSiteId);

  const filteredPlantings = sitePlantings.filter((p) => {
    if (statusFilter === 'current' && (p.status === 'finished' || p.status === 'failed')) return false;
    if (statusFilter !== 'current' && statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (bedFilter !== ALL_BEDS && p.bedId !== bedFilter) return false;
    if (cropFilter !== ALL_CROPS && p.crop !== cropFilter) return false;
    return true;
  });

  const handleCardClick = (id: string) => {
    navigate(`/vegetables/plantings/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading plantings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Plantings</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add planting
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="planting-status-filter" className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Status:
          </label>
          <select
            id="planting-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="planting-bed-filter" className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Bed:
          </label>
          <select
            id="planting-bed-filter"
            value={bedFilter}
            onChange={(e) => setBedFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={ALL_BEDS}>All beds</option>
            {sitebeds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="planting-crop-filter" className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Crop:
          </label>
          <select
            id="planting-crop-filter"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={ALL_CROPS}>All crops</option>
            {crops.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          {filteredPlantings.length} of {sitePlantings.length} plantings
        </div>
      </div>

      {/* Planting Grid */}
      {filteredPlantings.length === 0 ? (
        <EmptyState
          icon="🥕"
          title={sitePlantings.length === 0 ? 'No plantings yet' : 'No plantings match this filter'}
          description={
            sitePlantings.length === 0
              ? 'Add your first planting to start tracking what is growing where.'
              : 'Try a different filter to see more plantings.'
          }
          action={
            sitePlantings.length === 0
              ? { label: 'Add planting', onClick: () => setIsFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <div data-testid="planting-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlantings.map((planting) => (
            <PlantingCard key={planting.id} planting={planting} onClick={handleCardClick} />
          ))}
        </div>
      )}

      {/* Add Planting Modal */}
      <PlantingForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}
