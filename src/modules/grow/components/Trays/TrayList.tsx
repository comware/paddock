/**
 * TrayList - Main tray management view
 *
 * Features:
 * - Grid display of all trays
 * - Filter by status
 * - Sort by date or tray number
 * - Quick actions for move to light / harvest
 */

import { useState, useEffect, useMemo } from 'react';
import { useTrays, useVarieties, type TrayStatus, type TrayWithComputed } from '../../stores';
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
  const { trays, isLoading, loadTrays, moveToLight } = useTrays();
  const { loadVarieties } = useVarieties();

  const [statusFilter, setStatusFilter] = useState<TrayStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isNewTrayOpen, setIsNewTrayOpen] = useState(false);
  const [harvestingTray, setHarvestingTray] = useState<TrayWithComputed | null>(null);
  const [editingTray, setEditingTray] = useState<TrayWithComputed | null>(null);

  // Load data on mount
  useEffect(() => {
    loadTrays();
    loadVarieties();
  }, [loadTrays, loadVarieties]);

  // Filter and sort trays
  const filteredTrays = useMemo(() => {
    let result = [...trays];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
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
  }, [trays, statusFilter, sortBy]);

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
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter */}
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
