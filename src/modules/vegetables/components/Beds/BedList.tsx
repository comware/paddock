/**
 * BedList - Main bed management view.
 *
 * Scoped to the active site. Deletion goes through the store's deleteBed, which refuses
 * when plantings still reference the bed - this component surfaces that refusal rather
 * than pre-empting it with a second copy of the same rule.
 */

import { useEffect, useState } from 'react';
import { useBeds } from '../../stores/useBeds';
import { useSites } from '@/platform';
import type { VegBed } from '@/lib/db';
import { BedCard } from './BedCard';
import { BedForm } from './BedForm';
import { Modal, ConfirmDialog } from '@/components/ui';
import { EmptyState } from '@/components/shared';

type ActiveFilter = 'active' | 'inactive' | 'all';

const FILTER_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

export function BedList() {
  const { isLoading, error, loadBeds, deleteBed, bedsBySite } = useBeds();
  const { activeSiteId, loadSites } = useSites();

  const [filter, setFilter] = useState<ActiveFilter>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<VegBed | null>(null);
  const [deletingBed, setDeletingBed] = useState<VegBed | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadSites();
    loadBeds();
  }, [loadSites, loadBeds]);

  // useBeds() above subscribes to the whole store, so this re-renders (and recomputes)
  // whenever the store's beds array changes - no memoization needed for a filter this
  // cheap, and no dependency array to keep in sync with what bedsBySite reads internally.
  const siteBeds = activeSiteId ? bedsBySite(activeSiteId) : [];
  const filteredBeds = siteBeds.filter((bed) => {
    if (filter === 'active') return bed.isActive;
    if (filter === 'inactive') return !bed.isActive;
    return true;
  });

  const handleEditClick = (id: string) => {
    const bed = siteBeds.find((b) => b.id === id);
    if (bed) setEditingBed(bed);
  };

  const handleDeleteClick = (id: string) => {
    const bed = siteBeds.find((b) => b.id === id);
    if (bed) {
      setDeleteError(null);
      setDeletingBed(bed);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBed?.id) return;
    // Clear any stale error before attempting, so a leftover error from an earlier,
    // unrelated action can't be mistaken for this delete's outcome.
    useBeds.setState({ error: null });
    await deleteBed(deletingBed.id);

    // deleteBed refuses (without throwing) when plantings still reference the bed, and
    // signals that by setting the store's error. The bed is still in the database, and the
    // UI must not pretend otherwise.
    const refusal = useBeds.getState().error;
    if (refusal) {
      setDeleteError(refusal);
    } else {
      setDeletingBed(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading beds...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && !deletingBed && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Beds</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add Bed
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Status:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActiveFilter)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          {filteredBeds.length} of {siteBeds.length} beds
        </div>
      </div>

      {/* Bed Grid */}
      {filteredBeds.length === 0 ? (
        <EmptyState
          icon="🌱"
          title={siteBeds.length === 0 ? 'No beds yet' : 'No beds match this filter'}
          description={
            siteBeds.length === 0
              ? 'Add your first bed to start tracking what grows where.'
              : 'Try a different status filter to see more beds.'
          }
          action={
            siteBeds.length === 0
              ? { label: 'Add Bed', onClick: () => setIsFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBeds.map((bed) => (
            <BedCard
              key={bed.id}
              bed={bed}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Add Bed Modal */}
      <BedForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {/* Edit Bed Modal */}
      <BedForm
        isOpen={!!editingBed}
        onClose={() => setEditingBed(null)}
        editBed={editingBed || undefined}
      />

      {/* Delete confirmation, or the store's refusal if plantings reference the bed */}
      {deleteError ? (
        <Modal isOpen={!!deletingBed} onClose={() => { setDeletingBed(null); setDeleteError(null); }} title="Cannot Delete Bed" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">{deleteError}</p>
            <div className="flex justify-end">
              <button
                onClick={() => { setDeletingBed(null); setDeleteError(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </Modal>
      ) : (
        <ConfirmDialog
          isOpen={!!deletingBed}
          onClose={() => setDeletingBed(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Bed"
          message={`Are you sure you want to delete "${deletingBed?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
