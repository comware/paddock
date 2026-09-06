/**
 * CostBreakdown - Display cost breakdown for a batch
 *
 * Features:
 * - Lists all costs (supply-linked and manual)
 * - Shows supply name, quantity used, unit cost, total
 * - Delete cost button with confirmation
 * - Add cost button opens BatchCostForm
 * - Empty state when no costs recorded
 *
 * Designed for use on BatchDetail page.
 */

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useBatchCosts, type EnrichedBatchCost } from '../../stores/useBatchCosts';
import { formatCurrency, formatCostPerUnit, getCategoryDisplay, CATEGORY_COLORS } from './utils';
import { BatchCostForm } from './BatchCostForm';

// ============================================
// PROPS
// ============================================

interface CostBreakdownProps {
  batchId: string;
  onCostsUpdated?: () => void;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Individual cost entry row.
 */
function CostRow({
  cost,
  onDelete,
}: {
  cost: EnrichedBatchCost;
  onDelete: (id: string) => void;
}) {
  const isSupplyCost = !!cost.supplyId;

  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Cost Type and Name */}
          <div className="flex items-center gap-2 mb-1">
            {isSupplyCost ? (
              <>
                <span className="font-medium text-slate-900 dark:text-white truncate">
                  {cost.supplyName || 'Unknown Supply'}
                </span>
                {cost.supplyCategory && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      CATEGORY_COLORS[cost.supplyCategory].bg
                    } ${CATEGORY_COLORS[cost.supplyCategory].text}`}
                  >
                    {getCategoryDisplay(cost.supplyCategory)}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900 dark:text-white truncate">
                  {cost.manualDescription || 'Manual Cost'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS.manual.bg} ${CATEGORY_COLORS.manual.text}`}
                >
                  Manual
                </span>
              </>
            )}
          </div>

          {/* Cost Details */}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {isSupplyCost && cost.quantityUsed !== undefined ? (
              <span>
                {cost.quantityUsed} {cost.supplyUnit} x{' '}
                {formatCostPerUnit(cost.calculatedCost! / cost.quantityUsed)}
              </span>
            ) : (
              <span>One-time cost</span>
            )}
          </div>

          {/* Date */}
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {format(cost.createdAtDate, 'MMM d, yyyy h:mm a')}
          </div>
        </div>

        {/* Cost Amount and Delete */}
        <div className="flex items-center gap-3 ml-3">
          <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
            {formatCurrency(
              isSupplyCost ? (cost.calculatedCost ?? 0) : (cost.manualCost ?? 0)
            )}
          </span>
          <button
            onClick={() => onDelete(cost.id!)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete cost"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CostBreakdown({ batchId, onCostsUpdated }: CostBreakdownProps) {
  const {
    getCostsForBatch,
    removeCost,
    loadCostsForBatch,
    getTotalBatchCost,
    isLoading,
  } = useBatchCosts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [costToDelete, setCostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load costs for this batch on mount
  useEffect(() => {
    loadCostsForBatch(batchId);
  }, [batchId, loadCostsForBatch]);

  // Get costs for this batch
  const costs = useMemo(() => getCostsForBatch(batchId), [batchId, getCostsForBatch]);
  const totalCost = useMemo(() => getTotalBatchCost(batchId), [batchId, getTotalBatchCost]);

  // Handle delete click
  const handleDeleteClick = (costId: string) => {
    setCostToDelete(costId);
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!costToDelete) return;

    setIsDeleting(true);
    try {
      await removeCost(costToDelete);
      onCostsUpdated?.();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete cost:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setCostToDelete(null);
    }
  };

  // Handle cost added
  const handleCostAdded = () => {
    loadCostsForBatch(batchId);
    onCostsUpdated?.();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="text-slate-500 dark:text-slate-400">Loading costs...</div>
      </div>
    );
  }

  // Empty state
  if (costs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">$</div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-1">
            No Costs Recorded
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Track supplies and other expenses used for this batch.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            + Add First Cost
          </button>
        </div>

        <BatchCostForm
          batchId={batchId}
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          onSuccess={handleCostAdded}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {costs.length} cost{costs.length !== 1 ? 's' : ''} recorded
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary btn-sm"
        >
          + Add Cost
        </button>
      </div>

      {/* Cost List */}
      <div className="space-y-2">
        {costs.map((cost) => (
          <CostRow key={cost.id} cost={cost} onDelete={handleDeleteClick} />
        ))}
      </div>

      {/* Total */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700 dark:text-slate-300">Total</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalCost)}
          </span>
        </div>
      </div>

      {/* Add Cost Form Modal */}
      <BatchCostForm
        batchId={batchId}
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleCostAdded}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCostToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Cost Entry"
        message="Are you sure you want to delete this cost? If it's a supply cost, the inventory will be restored. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
