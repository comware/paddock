/**
 * HarvestList - the picks logged against one planting, most recent first.
 *
 * The summary above the list follows harvestTotals.ts: every unit in `totals` is rendered
 * separately, and `sellableTotals` is shown alongside only when it differs from `totals` -
 * a planting where everything picked was sellable would otherwise show the same numbers
 * twice for no reason. Units are never summed together.
 */

import { useState } from 'react';
import { useHarvests } from '../../stores/useHarvests';
import { ConfirmDialog } from '@/components/ui';
import { HarvestLogModal } from './HarvestLogModal';
import type { VegHarvest } from '@/lib/db';

interface HarvestListProps {
  plantingId: string;
}

type HarvestUnit = VegHarvest['unit'];
type UnitTotals = Partial<Record<HarvestUnit, number>>;

const UNIT_LABELS: Record<HarvestUnit, string> = {
  kg: 'kg',
  g: 'g',
  bunches: 'bunches',
  count: 'count',
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function totalsDiffer(a: UnitTotals, b: UnitTotals): boolean {
  const units = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const unit of units) {
    if ((a[unit as HarvestUnit] ?? 0) !== (b[unit as HarvestUnit] ?? 0)) return true;
  }
  return false;
}

export function HarvestList({ plantingId }: HarvestListProps) {
  const { harvestsForPlanting, summaryFor, deleteHarvest } = useHarvests();
  const [editingHarvest, setEditingHarvest] = useState<VegHarvest | null>(null);
  const [deletingHarvest, setDeletingHarvest] = useState<VegHarvest | null>(null);

  // harvestsForPlanting already returns oldest-first (see useHarvests); this view wants
  // most-recent-first, so sort a copy rather than mutating what the store handed back.
  const harvests = [...harvestsForPlanting(plantingId)].sort((a, b) => b.date.getTime() - a.date.getTime());
  const summary = summaryFor(plantingId);
  const totalEntries = Object.entries(summary.totals) as [HarvestUnit, number][];
  const sellableEntries = Object.entries(summary.sellableTotals) as [HarvestUnit, number][];
  const showSellable = totalsDiffer(summary.totals, summary.sellableTotals);

  const handleConfirmDelete = async () => {
    if (!deletingHarvest?.id) return;
    await deleteHarvest(deletingHarvest.id);
    setDeletingHarvest(null);
  };

  return (
    <div className="space-y-4">
      {summary.harvestCount > 0 && (
        <div data-testid="harvest-summary" className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 space-y-2">
          <div className="flex flex-wrap gap-2">
            {totalEntries.map(([unit, amount]) => (
              <span
                key={unit}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
              >
                {`${amount} ${UNIT_LABELS[unit]}`}
              </span>
            ))}
          </div>

          {showSellable && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Sellable:</span>
              {sellableEntries.length === 0 && <span>none</span>}
              {sellableEntries.map(([unit, amount]) => (
                <span key={unit} className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600">
                  {`${amount} ${UNIT_LABELS[unit]}`}
                </span>
              ))}
            </div>
          )}

          <div className="text-sm text-slate-600 dark:text-slate-400">
            {summary.harvestCount} pick{summary.harvestCount === 1 ? '' : 's'} over {summary.daysHarvesting} day
            {summary.daysHarvesting === 1 ? '' : 's'}
            {summary.firstHarvest && summary.lastHarvest && (
              <>
                {' '}
                ({formatDate(summary.firstHarvest)} - {formatDate(summary.lastHarvest)})
              </>
            )}
          </div>
        </div>
      )}

      {harvests.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No picks logged yet.</p>
      ) : (
        <ul data-testid="harvest-picks" className="space-y-2">
          {harvests.map((harvest) => (
            <li
              key={harvest.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-white">{formatDate(harvest.date)}</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {harvest.quantity} {UNIT_LABELS[harvest.unit]}
                  </span>
                  {harvest.qualityGrade && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Grade {harvest.qualityGrade}
                    </span>
                  )}
                  {!harvest.sellable && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      Not for sale
                    </span>
                  )}
                </div>
                {harvest.notes && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{harvest.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditingHarvest(harvest)}
                  className="px-2 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingHarvest(harvest)}
                  className="px-2 py-1 rounded text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingHarvest && (
        <HarvestLogModal
          isOpen={!!editingHarvest}
          onClose={() => setEditingHarvest(null)}
          plantingId={plantingId}
          editHarvest={editingHarvest}
          onLogged={() => setEditingHarvest(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingHarvest}
        onClose={() => setDeletingHarvest(null)}
        onConfirm={handleConfirmDelete}
        title="Delete pick"
        message={
          deletingHarvest
            ? `Delete this pick of ${deletingHarvest.quantity} ${UNIT_LABELS[deletingHarvest.unit]} from ${formatDate(deletingHarvest.date)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
