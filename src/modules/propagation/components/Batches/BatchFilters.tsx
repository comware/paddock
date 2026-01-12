/**
 * BatchFilters - Filter controls for batch list
 *
 * Provides stage tabs, species/method/station dropdowns.
 * Follows the TrayList filter pattern from the grow module.
 */

import { useCallback, useState } from 'react';
import type { PropagationStage, PropagationMethod, BatchFilters as BatchFiltersType, BatchSort } from '../../types';
import { STAGE_COLORS } from '../../utils';

interface BatchFiltersProps {
  filters: BatchFiltersType;
  sort: BatchSort;
  stageCounts: Record<PropagationStage | 'active', number>;
  uniqueSpecies: string[];
  uniqueStations: string[];
  onFiltersChange: (filters: Partial<BatchFiltersType>) => void;
  onSortChange: (sort: BatchSort) => void;
  onResetFilters: () => void;
}

/**
 * Stage filter options including 'all' and 'active' pseudo-stages.
 */
type StageFilterValue = PropagationStage | 'all' | 'active';

const stageFilterOptions: { value: StageFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'taken', label: 'Taken' },
  { value: 'rooting', label: 'Rooting' },
  { value: 'rooted', label: 'Rooted' },
  { value: 'potted_up', label: 'Potted Up' },
  { value: 'hardening', label: 'Hardening' },
  { value: 'ready', label: 'Ready' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'failed', label: 'Failed' },
];

/**
 * Method display names for filter dropdown.
 */
const METHOD_OPTIONS: { value: PropagationMethod | 'all'; label: string }[] = [
  { value: 'all', label: 'All Methods' },
  { value: 'cutting_softwood', label: 'Softwood Cutting' },
  { value: 'cutting_semi_hardwood', label: 'Semi-Hardwood Cutting' },
  { value: 'cutting_hardwood', label: 'Hardwood Cutting' },
  { value: 'cutting_leaf', label: 'Leaf Cutting' },
  { value: 'cutting_root', label: 'Root Cutting' },
  { value: 'division', label: 'Division' },
  { value: 'layering_simple', label: 'Simple Layering' },
  { value: 'layering_air', label: 'Air Layering' },
  { value: 'grafting_whip', label: 'Whip Graft' },
  { value: 'grafting_cleft', label: 'Cleft Graft' },
  { value: 'grafting_bud', label: 'Bud Graft' },
  { value: 'seed', label: 'Seed' },
];

/**
 * Sort options for batch list.
 */
const SORT_OPTIONS: { value: BatchSort['field']; label: string }[] = [
  { value: 'dateTaken', label: 'Date Taken' },
  { value: 'species', label: 'Species (A-Z)' },
  { value: 'stage', label: 'Stage' },
  { value: 'daysInStage', label: 'Days in Stage' },
  { value: 'quantitySurviving', label: 'Surviving Count' },
];

export function BatchFilters({
  filters,
  sort,
  stageCounts,
  uniqueSpecies,
  uniqueStations,
  onFiltersChange,
  onSortChange,
  onResetFilters,
}: BatchFiltersProps) {
  const handleStageChange = useCallback(
    (stage: StageFilterValue) => {
      onFiltersChange({ stage });
    },
    [onFiltersChange]
  );

  const handleSpeciesChange = useCallback(
    (species: string) => {
      onFiltersChange({ species });
    },
    [onFiltersChange]
  );

  const handleMethodChange = useCallback(
    (method: PropagationMethod | 'all') => {
      onFiltersChange({ method });
    },
    [onFiltersChange]
  );

  const handleStationChange = useCallback(
    (stationId: string) => {
      onFiltersChange({ stationId });
    },
    [onFiltersChange]
  );

  const handleSortFieldChange = useCallback(
    (field: BatchSort['field']) => {
      onSortChange({ field, direction: sort.direction });
    },
    [onSortChange, sort.direction]
  );

  const handleSortDirectionToggle = useCallback(() => {
    onSortChange({
      field: sort.field,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
  }, [onSortChange, sort]);

  // Check if any filters are active (non-default)
  const hasActiveFilters =
    filters.stage !== 'all' ||
    filters.species !== 'all' ||
    filters.method !== 'all' ||
    filters.stationId !== 'all';

  // Calculate total count for 'all' filter
  const totalCount = Object.values(stageCounts).reduce((sum, count) => sum + count, 0) - stageCounts.active;

  // Mobile filter panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Count of active additional filters (excluding stage)
  const additionalFilterCount = [
    filters.species !== 'all',
    filters.method !== 'all',
    filters.stationId !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Stage Filter Tabs - horizontal scroll on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
          {stageFilterOptions.map((option) => {
            const isActive = filters.stage === option.value;
            const count =
              option.value === 'all'
                ? totalCount
                : stageCounts[option.value as PropagationStage | 'active'] || 0;

            // Get colors for stage-specific badges
            const stageColors =
              option.value !== 'all' && option.value !== 'active'
                ? STAGE_COLORS[option.value as PropagationStage]
                : null;

            return (
              <button
                key={option.value}
                onClick={() => handleStageChange(option.value)}
                className={`min-h-[44px] px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : stageColors
                      ? `${stageColors.bg} ${stageColors.text} hover:opacity-80`
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Controls - always visible */}
        <div className="flex items-center gap-2 sm:ml-auto shrink-0">
          <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">Sort:</span>
          <select
            value={sort.field}
            onChange={(e) => handleSortFieldChange(e.target.value as BatchSort['field'])}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSortDirectionToggle}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
            title={sort.direction === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sort.direction === 'asc' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Filter Toggle Button */}
      <div className="sm:hidden">
        <button
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className="w-full min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {additionalFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary-500 text-white text-xs">
                {additionalFilterCount}
              </span>
            )}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Additional Filters - collapsible on mobile, always visible on desktop */}
      <div className={`${isFilterPanelOpen ? 'block' : 'hidden'} sm:block`}>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 p-4 sm:p-0 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent rounded-lg sm:rounded-none">
          {/* Species Filter */}
          {uniqueSpecies.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-sm text-slate-500 dark:text-slate-400">Species:</label>
              <select
                value={filters.species}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Species</option>
                {uniqueSpecies.map((species) => (
                  <option key={species} value={species}>
                    {species}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Method Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-sm text-slate-500 dark:text-slate-400">Method:</label>
            <select
              value={filters.method}
              onChange={(e) => handleMethodChange(e.target.value as PropagationMethod | 'all')}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Station Filter */}
          {uniqueStations.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-sm text-slate-500 dark:text-slate-400">Station:</label>
              <select
                value={filters.stationId}
                onChange={(e) => handleStationChange(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Stations</option>
                {uniqueStations.map((stationId) => (
                  <option key={stationId} value={stationId}>
                    {stationId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors sm:ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
