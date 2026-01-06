/**
 * TrayList - Main tray management view
 *
 * Features:
 * - Grid display of all trays
 * - Filter by status
 * - Sort by date or tray number
 * - Quick actions for move to light / harvest
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrays, useVarieties, useSites, useMediums, type TrayStatus, type TrayWithComputed } from '../../stores';
import { TrayCard } from './TrayCard';
import { NewTrayForm } from './NewTrayForm';
import { HarvestForm } from './HarvestForm';
import { EditTrayForm } from './EditTrayForm';

type SortOption = 'newest' | 'oldest' | 'trayNumber';

const statusFilters: { value: TrayStatus | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'blackout', label: 'Blackout', icon: '🌑' },
  { value: 'light', label: 'Light', icon: '💡' },
  { value: 'harvested', label: 'Harvested', icon: '🌿' },
  { value: 'failed', label: 'Failed', icon: '❌' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'trayNumber', label: 'Tray Number' },
];

export function TrayList() {
  const { trays, isLoading, loadTrays, moveToLight, getUniqueVarieties, getUniqueMediums } = useTrays();
  const { loadVarieties } = useVarieties();
  const { sites, loadSites } = useSites();
  const { mediums, loadMediums } = useMediums();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params or defaults
  const statusFilter = (searchParams.get('status') as TrayStatus | 'all') || 'all';
  const siteFilter = searchParams.get('site') || 'all';
  const varietyFilter = searchParams.get('variety') || 'all';
  const mediumFilter = searchParams.get('medium') || 'all';
  const sortBy = (searchParams.get('sort') as SortOption) || 'newest';

  const [isNewTrayOpen, setIsNewTrayOpen] = useState(false);
  const [harvestingTray, setHarvestingTray] = useState<TrayWithComputed | null>(null);
  const [editingTray, setEditingTray] = useState<TrayWithComputed | null>(null);

  // Get unique values for filter dropdowns
  const uniqueVarieties = getUniqueVarieties();
  const uniqueMediums = getUniqueMediums();

  // Update URL params helper
  const updateSearchParams = useCallback((updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === 'newest') {
        newParams.delete(key); // Remove default values to keep URL clean
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Filter setters that update URL
  const setStatusFilter = useCallback((value: TrayStatus | 'all') => {
    updateSearchParams({ status: value });
  }, [updateSearchParams]);

  const setSiteFilter = useCallback((value: string) => {
    updateSearchParams({ site: value });
  }, [updateSearchParams]);

  const setVarietyFilter = useCallback((value: string) => {
    updateSearchParams({ variety: value });
  }, [updateSearchParams]);

  const setMediumFilter = useCallback((value: string) => {
    updateSearchParams({ medium: value });
  }, [updateSearchParams]);

  const setSortBy = useCallback((value: SortOption) => {
    updateSearchParams({ sort: value });
  }, [updateSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Load data on mount
  useEffect(() => {
    loadTrays();
    loadVarieties();
    loadSites();
    loadMediums();
  }, [loadTrays, loadVarieties, loadSites, loadMediums]);

  // Filter and sort trays
  const filteredTrays = useMemo(() => {
    let result = [...trays];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Apply site filter
    if (siteFilter !== 'all') {
      result = result.filter((t) => t.siteId === siteFilter);
    }

    // Apply variety filter
    if (varietyFilter !== 'all') {
      result = result.filter((t) => t.variety === varietyFilter);
    }

    // Apply growing medium filter
    if (mediumFilter !== 'all') {
      result = result.filter((t) => t.growingMedium === mediumFilter);
    }

    // Apply sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.dateSown).getTime() - new Date(a.dateSown).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.dateSown).getTime() - new Date(b.dateSown).getTime());
        break;
      case 'trayNumber':
        result.sort((a, b) => b.trayNumber - a.trayNumber);
        break;
    }

    return result;
  }, [trays, statusFilter, siteFilter, varietyFilter, mediumFilter, sortBy]);

  // Count by status for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: trays.length };
    for (const tray of trays) {
      counts[tray.status] = (counts[tray.status] || 0) + 1;
    }
    return counts;
  }, [trays]);

  const handleMoveToLight = async (id: string) => {
    try {
      await moveToLight(id);
    } catch (error) {
      console.error('Failed to move tray to light:', error);
    }
  };

  const handleHarvest = (id: string) => {
    const tray = trays.find((t) => t.id === id);
    if (tray) {
      setHarvestingTray(tray);
    }
  };

  const handleTrayClick = (id: string) => {
    const tray = trays.find((t) => t.id === id);
    if (tray) {
      setEditingTray(tray);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading trays...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trays</h1>
        <button
          onClick={() => setIsNewTrayOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          New Tray
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status Filter Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === filter.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/10 text-xs">
                  {statusCounts[filter.value] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Filter */}
          {sites.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Site:</span>
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Variety Filter */}
          {uniqueVarieties.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Variety:</span>
              <select
                value={varietyFilter}
                onChange={(e) => setVarietyFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Varieties</option>
                {uniqueVarieties.map((variety) => (
                  <option key={variety} value={variety}>
                    {variety}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Growing Medium Filter */}
          {uniqueMediums.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Medium:</span>
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Mediums</option>
                {uniqueMediums.map((medium) => {
                  const mediumConfig = mediums.find((m) => m.value === medium);
                  return (
                    <option key={medium} value={medium}>
                      {mediumConfig?.label || medium}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {(statusFilter !== 'all' || siteFilter !== 'all' || varietyFilter !== 'all' || mediumFilter !== 'all' || sortBy !== 'newest') && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tray Grid */}
      {filteredTrays.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🌱</div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {statusFilter === 'all' ? 'No trays yet' : `No ${statusFilter} trays`}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {statusFilter === 'all'
              ? 'Start tracking your first tray of microgreens'
              : 'Try selecting a different filter'}
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setIsNewTrayOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              Add First Tray
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTrays.map((tray) => (
            <TrayCard
              key={tray.id}
              tray={tray}
              onMoveToLight={handleMoveToLight}
              onHarvest={handleHarvest}
              onClick={handleTrayClick}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {trays.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {statusCounts['blackout'] || 0}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">In Blackout</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {statusCounts['light'] || 0}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">In Light</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {statusCounts['harvested'] || 0}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Harvested</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {trays.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Trays</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewTrayForm isOpen={isNewTrayOpen} onClose={() => setIsNewTrayOpen(false)} />
      {harvestingTray && (
        <HarvestForm
          isOpen={!!harvestingTray}
          onClose={() => setHarvestingTray(null)}
          tray={harvestingTray}
        />
      )}
      {editingTray && (
        <EditTrayForm
          isOpen={!!editingTray}
          onClose={() => setEditingTray(null)}
          tray={editingTray}
        />
      )}
    </div>
  );
}
