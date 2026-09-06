/**
 * SpeciesConfigList - List view for managing species configurations
 *
 * Features:
 * - Display all species configurations
 * - Search/filter species
 * - Edit and delete configurations
 * - Highlight in-season species
 * - Show configuration summary
 */

import { useState, useMemo } from 'react';
import { useSpeciesConfigs } from '../../stores/useSpeciesConfigs';
import { SpeciesConfigForm } from './SpeciesConfigForm';
import type { PropSpeciesConfig } from '../../types';

// ============================================
// METHOD DISPLAY NAMES
// ============================================

const METHOD_DISPLAY_NAMES: Record<string, string> = {
  cutting_softwood: 'Softwood Cutting',
  cutting_semi_hardwood: 'Semi-hardwood',
  cutting_hardwood: 'Hardwood Cutting',
  cutting_leaf: 'Leaf Cutting',
  cutting_root: 'Root Cutting',
  division: 'Division',
  layering_simple: 'Simple Layering',
  layering_air: 'Air Layering',
  grafting_whip: 'Whip Grafting',
  grafting_cleft: 'Cleft Grafting',
  grafting_bud: 'Bud Grafting',
  seed: 'Seed',
};

// ============================================
// COMPONENT
// ============================================

export function SpeciesConfigList() {
  const { configs, isLoading, deleteConfig } = useSpeciesConfigs();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PropSpeciesConfig | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter configs based on search
  const filteredConfigs = useMemo(() => {
    if (!searchTerm.trim()) return configs;

    const search = searchTerm.toLowerCase();
    return configs.filter(
      (c) =>
        c.species.toLowerCase().includes(search) ||
        c.scientificName?.toLowerCase().includes(search) ||
        c.notes?.toLowerCase().includes(search)
    );
  }, [configs, searchTerm]);

  const handleAdd = () => {
    setEditingConfig(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (config: PropSpeciesConfig) => {
    setEditingConfig(config);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConfig(id);
      setDeleteConfirmId(null);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete config:', error);
      setDeleteError((error as Error).message || 'Failed to delete configuration');
    }
  };

  const handleFormClose = () => {
    setShowFormModal(false);
    setEditingConfig(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Species Configurations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Set default propagation methods and timing for each species
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="btn btn-primary self-start"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Species
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search species..."
          className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Error Display */}
      {deleteError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {deleteError}
        </div>
      )}

      {/* Empty State */}
      {filteredConfigs.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center shadow-sm">
          {configs.length === 0 ? (
            <>
              <span className="text-5xl mb-4 block">🌱</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No species configured yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Add species configurations to set default propagation methods and timing.
                These defaults will auto-fill when creating new batches.
              </p>
              <button
                onClick={handleAdd}
                className="btn btn-primary"
              >
                Add Your First Species
              </button>
            </>
          ) : (
            <>
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                No species match "{searchTerm}"
              </p>
            </>
          )}
        </div>
      )}

      {/* Species List */}
      {filteredConfigs.length > 0 && (
        <div className="grid gap-4">
          {filteredConfigs.map((config) => (
            <div
              key={config.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Species Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                      {config.species}
                    </h3>
                    {config.isOptimalSeason && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                        In Season
                      </span>
                    )}
                  </div>

                  {config.scientificName && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-3">
                      {config.scientificName}
                    </p>
                  )}

                  {/* Configuration Summary */}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {config.preferredMethod && (
                      <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        {METHOD_DISPLAY_NAMES[config.preferredMethod] || config.preferredMethod}
                      </span>
                    )}
                    {config.typicalRootingDays && (
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {config.typicalRootingDays}d rooting
                      </span>
                    )}
                    {config.typicalDaysToReady && (
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {config.typicalDaysToReady}d to ready
                      </span>
                    )}
                    {config.bestMonthsDisplay && config.bestMonthsDisplay !== 'Any time' && (
                      <span className="px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                        {config.bestMonthsDisplay}
                      </span>
                    )}
                  </div>

                  {/* Overdue Thresholds Summary */}
                  {(config.maxDaysRooting || config.maxDaysPottedUp || config.maxDaysHardening) && (
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Overdue alerts:{' '}
                      {[
                        config.maxDaysRooting && `${config.maxDaysRooting}d rooting`,
                        config.maxDaysPottedUp && `${config.maxDaysPottedUp}d potted`,
                        config.maxDaysHardening && `${config.maxDaysHardening}d hardening`,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}

                  {/* Notes Preview */}
                  {config.notes && (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {config.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(config.id!)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === config.id && (
                <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    Delete configuration for <strong>{config.species}</strong>? This won't affect existing batches.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(config.id!)}
                      className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {configs.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Species: </span>
              <span className="font-semibold text-slate-900 dark:text-white">{configs.length}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">In Season: </span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {configs.filter((c) => c.isOptimalSeason).length}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">With Method Defaults: </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {configs.filter((c) => c.preferredMethod).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <SpeciesConfigForm
        isOpen={showFormModal}
        onClose={handleFormClose}
        editConfig={editingConfig}
      />
    </div>
  );
}
