/**
 * BatchCostForm - Form for assigning costs to a propagation batch
 *
 * Features:
 * - Supply cost mode: select supply, enter quantity used
 * - Manual cost mode: description and amount
 * - Shows current supply inventory and cost-per-unit
 * - Warning if quantity exceeds available inventory
 * - Zod validation
 *
 * Follows the SupplyForm pattern from the propagation module.
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useBatchCosts } from '../../stores/useBatchCosts';
import { useSupplies } from '../../stores/useSupplies';
import { useBatches } from '../../stores/useBatches';
import { formatCurrency, formatCostPerUnit, getCategoryDisplay, CATEGORY_COLORS } from './utils';
import type { PropSupplyWithStatus, SupplyCategory } from '../../types';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const supplyCostSchema = z.object({
  supplyId: z.string().min(1, 'Please select a supply'),
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
});

const manualCostSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
});

type SupplyCostFormData = z.infer<typeof supplyCostSchema>;
type ManualCostFormData = z.infer<typeof manualCostSchema>;

// ============================================
// PROPS
// ============================================

interface BatchCostFormProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function BatchCostForm({
  batchId,
  isOpen,
  onClose,
  onSuccess,
}: BatchCostFormProps) {
  const { addSupplyCost, addManualCost } = useBatchCosts();
  const { supplies, loadSupplies } = useSupplies();
  const { getBatchById } = useBatches();

  const [costMode, setCostMode] = useState<'supply' | 'manual'>('supply');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedSupply, setSelectedSupply] = useState<PropSupplyWithStatus | null>(null);

  // Get batch details
  const batch = getBatchById(batchId);

  // Supply cost form
  const {
    register: registerSupply,
    handleSubmit: handleSubmitSupply,
    watch: watchSupply,
    reset: resetSupply,
    formState: { errors: supplyErrors, isSubmitting: isSupplySubmitting },
  } = useForm<SupplyCostFormData>({
    resolver: zodResolver(supplyCostSchema),
    defaultValues: {
      supplyId: '',
      quantity: 1,
    },
  });

  // Manual cost form
  const {
    register: registerManual,
    handleSubmit: handleSubmitManual,
    reset: resetManual,
    formState: { errors: manualErrors, isSubmitting: isManualSubmitting },
  } = useForm<ManualCostFormData>({
    resolver: zodResolver(manualCostSchema),
    defaultValues: {
      description: '',
      amount: 0,
    },
  });

  const watchedSupplyId = watchSupply('supplyId');
  const watchedQuantity = watchSupply('quantity');

  // Load supplies on mount
  useEffect(() => {
    loadSupplies();
  }, [loadSupplies]);

  // Update selected supply when selection changes
  useEffect(() => {
    if (watchedSupplyId) {
      const supply = supplies.find((s) => s.id === watchedSupplyId);
      setSelectedSupply(supply || null);
    } else {
      setSelectedSupply(null);
    }
  }, [watchedSupplyId, supplies]);

  // Reset forms when opening
  useEffect(() => {
    if (isOpen) {
      resetSupply({ supplyId: '', quantity: 1 });
      resetManual({ description: '', amount: 0 });
      setSelectedSupply(null);
      setSubmitError(null);
      setCostMode('supply');
    }
  }, [isOpen, resetSupply, resetManual]);

  // Calculate estimated cost for supply mode
  const estimatedCost = useMemo(() => {
    if (!selectedSupply || !watchedQuantity) return 0;
    return selectedSupply.costPerUnit * watchedQuantity;
  }, [selectedSupply, watchedQuantity]);

  // Check if quantity exceeds available inventory
  const exceedsInventory = useMemo(() => {
    if (!selectedSupply || !watchedQuantity) return false;
    return watchedQuantity > selectedSupply.quantityRemaining;
  }, [selectedSupply, watchedQuantity]);

  // Filter to only show supplies with inventory
  const availableSupplies = useMemo(() => {
    return supplies.filter((s) => s.quantityRemaining > 0);
  }, [supplies]);

  // Group supplies by category for better selection UI
  const suppliesByCategory = useMemo(() => {
    const grouped = new Map<string, PropSupplyWithStatus[]>();
    for (const supply of availableSupplies) {
      const existing = grouped.get(supply.category) ?? [];
      existing.push(supply);
      grouped.set(supply.category, existing);
    }
    return grouped;
  }, [availableSupplies]);

  // Handle supply cost submission
  const onSubmitSupplyCost = async (data: SupplyCostFormData) => {
    setSubmitError(null);

    try {
      await addSupplyCost({
        batchId,
        supplyId: data.supplyId,
        quantity: data.quantity,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to add supply cost:', error);
      setSubmitError((error as Error).message || 'Failed to add cost');
    }
  };

  // Handle manual cost submission
  const onSubmitManualCost = async (data: ManualCostFormData) => {
    setSubmitError(null);

    try {
      await addManualCost({
        batchId,
        description: data.description.trim(),
        amount: data.amount,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to add manual cost:', error);
      setSubmitError((error as Error).message || 'Failed to add cost');
    }
  };

  const handleClose = () => {
    resetSupply();
    resetManual();
    setSelectedSupply(null);
    setSubmitError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add Cost to ${batch?.batchNumber || 'Batch'}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Cost Mode Toggle */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <button
            type="button"
            onClick={() => setCostMode('supply')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              costMode === 'supply'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            From Supply
          </button>
          <button
            type="button"
            onClick={() => setCostMode('manual')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              costMode === 'manual'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* Supply Cost Form */}
        {costMode === 'supply' && (
          <form onSubmit={handleSubmitSupply(onSubmitSupplyCost)} className="space-y-5">
            {/* Supply Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Supply *
              </label>

              {availableSupplies.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No supplies with available inventory. Add supplies first or record a manual cost.
                  </p>
                </div>
              ) : (
                <select
                  {...registerSupply('supplyId')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Choose a supply...</option>
                  {Array.from(suppliesByCategory.entries()).map(([category, categorySupplies]) => (
                    <optgroup key={category} label={getCategoryDisplay(category as SupplyCategory)}>
                      {categorySupplies.map((supply) => (
                        <option key={supply.id} value={supply.id}>
                          {supply.name} ({supply.quantityRemaining} {supply.unit} available)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {supplyErrors.supplyId && (
                <p className="mt-1 text-sm text-red-500">{supplyErrors.supplyId.message}</p>
              )}
            </div>

            {/* Selected Supply Info */}
            {selectedSupply && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedSupply.name}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        CATEGORY_COLORS[selectedSupply.category].bg
                      } ${CATEGORY_COLORS[selectedSupply.category].text}`}
                    >
                      {getCategoryDisplay(selectedSupply.category)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Available</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedSupply.quantityRemaining} {selectedSupply.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Cost per Unit</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatCostPerUnit(selectedSupply.costPerUnit)}/{selectedSupply.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Input */}
            {selectedSupply && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Used *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.001"
                    {...registerSupply('quantity', { valueAsNumber: true })}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      exceedsInventory
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-primary-500'
                    } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:border-transparent`}
                  />
                  <span className="text-slate-600 dark:text-slate-400 font-medium min-w-[60px]">
                    {selectedSupply.unit}
                  </span>
                </div>
                {supplyErrors.quantity && (
                  <p className="mt-1 text-sm text-red-500">{supplyErrors.quantity.message}</p>
                )}
                {exceedsInventory && (
                  <p className="mt-1 text-sm text-red-500">
                    Quantity exceeds available inventory ({selectedSupply.quantityRemaining} {selectedSupply.unit})
                  </p>
                )}
              </div>
            )}

            {/* Cost Preview */}
            {selectedSupply && watchedQuantity > 0 && !exceedsInventory && (
              <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-primary-700 dark:text-primary-300">
                    Estimated Cost
                  </span>
                  <span className="text-lg font-bold text-primary-900 dark:text-primary-100">
                    {formatCurrency(estimatedCost)}
                  </span>
                </div>
                <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                  {watchedQuantity} {selectedSupply.unit} x {formatCostPerUnit(selectedSupply.costPerUnit)}
                </p>
              </div>
            )}

            {/* Error Display */}
            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSupplySubmitting || !selectedSupply || exceedsInventory}
                className="flex-1 btn btn-primary"
              >
                {isSupplySubmitting ? 'Adding...' : 'Add Supply Cost'}
              </button>
            </div>
          </form>
        )}

        {/* Manual Cost Form */}
        {costMode === 'manual' && (
          <form onSubmit={handleSubmitManual(onSubmitManualCost)} className="space-y-5">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                {...registerManual('description')}
                placeholder="e.g., Labor, Electricity, Equipment rental"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {manualErrors.description && (
                <p className="mt-1 text-sm text-red-500">{manualErrors.description.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  {...registerManual('amount', { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {manualErrors.amount && (
                <p className="mt-1 text-sm text-red-500">{manualErrors.amount.message}</p>
              )}
            </div>

            {/* Help Text */}
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Use manual costs for expenses not tracked through supplies, such as labor, utilities, or one-time equipment costs.
              </p>
            </div>

            {/* Error Display */}
            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isManualSubmitting}
                className="flex-1 btn btn-primary"
              >
                {isManualSubmitting ? 'Adding...' : 'Add Manual Cost'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
