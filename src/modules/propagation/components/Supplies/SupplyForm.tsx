/**
 * SupplyForm - Form for creating/editing supplies and recording purchases
 *
 * Features:
 * - Create and edit supply details
 * - Record new purchases with quantity and cost
 * - Calculate and display new cost-per-unit
 * - Zod validation
 *
 * Follows the StationForm pattern from the propagation module.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui';
import { useSupplies } from '../../stores/useSupplies';
import type { PropSupply } from '../../types';
import {
  RequiredTextField,
  OptionalTextField,
  NumericRangeField,
  TextareaField,
  SelectField,
  FormError,
  FormActions,
  FormSectionHeader,
} from '../shared/FormFields';
import {
  SUPPLY_CATEGORIES,
  UNIT_OPTIONS,
  supplySchema,
  purchaseSchema,
  formatCurrency,
  type SupplyFormData,
  type PurchaseFormData,
} from './SupplyFormConstants';

// ============================================
// PROPS
// ============================================

interface SupplyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (supplyId: string) => void;
  editSupply?: PropSupply;
  // If purchaseMode is true, show simplified form for recording purchase
  purchaseMode?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function SupplyForm({
  isOpen,
  onClose,
  onSuccess,
  editSupply,
  purchaseMode,
}: SupplyFormProps) {
  const { addSupply, updateSupply } = useSupplies();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newCostPerUnit, setNewCostPerUnit] = useState<number | null>(null);

  const isEditMode = !!editSupply && !purchaseMode;
  const isPurchaseMode = purchaseMode && !!editSupply;

  // Main supply form
  const {
    register: registerSupply,
    handleSubmit: handleSubmitSupply,
    watch: watchSupply,
    setValue: setSupplyValue,
    reset: resetSupply,
    formState: { errors: supplyErrors, isSubmitting: isSupplySubmitting },
  } = useForm<SupplyFormData>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      name: '',
      category: undefined,
      unit: 'pcs',
      quantityPurchased: 1,
      totalCost: 0,
      supplier: '',
      lowStockThreshold: undefined,
      notes: '',
    },
  });

  // Purchase form
  const {
    register: registerPurchase,
    handleSubmit: handleSubmitPurchase,
    watch: watchPurchase,
    reset: resetPurchase,
    formState: { errors: purchaseErrors, isSubmitting: isPurchaseSubmitting },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      quantity: 1,
      totalCost: 0,
      supplier: '',
    },
  });

  const selectedCategory = watchSupply('category');
  const quantityPurchased = watchSupply('quantityPurchased');
  const totalCost = watchSupply('totalCost');
  const purchaseQuantity = watchPurchase('quantity');
  const purchaseCost = watchPurchase('totalCost');

  // Calculate cost per unit preview for new supply
  const costPerUnitPreview =
    quantityPurchased > 0 ? totalCost / quantityPurchased : 0;

  // Calculate new cost per unit after purchase
  useEffect(() => {
    if (isPurchaseMode && editSupply) {
      const currentTotal = editSupply.quantityRemaining * editSupply.costPerUnit;
      const newTotal = purchaseQuantity + editSupply.quantityRemaining;
      if (newTotal > 0) {
        const newAvgCost = (currentTotal + purchaseCost) / newTotal;
        setNewCostPerUnit(newAvgCost);
      } else {
        setNewCostPerUnit(null);
      }
    }
  }, [isPurchaseMode, editSupply, purchaseQuantity, purchaseCost]);

  // Reset forms when opening
  useEffect(() => {
    if (isOpen) {
      if (editSupply && !purchaseMode) {
        resetSupply({
          name: editSupply.name,
          category: editSupply.category,
          unit: editSupply.unit,
          quantityPurchased: editSupply.quantityPurchased,
          totalCost: editSupply.totalCost,
          supplier: editSupply.supplier || '',
          lowStockThreshold: editSupply.lowStockThreshold,
          notes: editSupply.notes || '',
        });
      } else if (purchaseMode && editSupply) {
        resetPurchase({
          quantity: 1,
          totalCost: 0,
          supplier: editSupply.supplier || '',
        });
        setNewCostPerUnit(null);
      } else {
        resetSupply({
          name: '',
          category: undefined,
          unit: 'pcs',
          quantityPurchased: 1,
          totalCost: 0,
          supplier: '',
          lowStockThreshold: undefined,
          notes: '',
        });
      }
      setSubmitError(null);
    }
  }, [isOpen, editSupply, purchaseMode, resetSupply, resetPurchase]);

  // Handle supply form submission (create/edit)
  const onSubmitSupply = async (data: SupplyFormData) => {
    setSubmitError(null);

    try {
      if (isEditMode && editSupply?.id) {
        await updateSupply(editSupply.id, {
          name: data.name.trim(),
          category: data.category,
          unit: data.unit,
          quantityPurchased: data.quantityPurchased,
          totalCost: data.totalCost,
          supplier: data.supplier?.trim() || undefined,
          lowStockThreshold: data.lowStockThreshold,
          notes: data.notes?.trim() || undefined,
        });
        onSuccess?.(editSupply.id);
      } else {
        const supplyId = await addSupply({
          name: data.name.trim(),
          category: data.category,
          unit: data.unit,
          quantityPurchased: data.quantityPurchased,
          totalCost: data.totalCost,
          purchaseDate: new Date(),
          supplier: data.supplier?.trim() || undefined,
          lowStockThreshold: data.lowStockThreshold,
          notes: data.notes?.trim() || undefined,
        });
        onSuccess?.(supplyId);
      }
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save supply:', error);
      setSubmitError((error as Error).message || 'Failed to save supply');
    }
  };

  // Handle purchase form submission
  const onSubmitPurchase = async (data: PurchaseFormData) => {
    setSubmitError(null);

    if (!editSupply?.id) {
      setSubmitError('No supply selected');
      return;
    }

    try {
      const newQuantityPurchased = editSupply.quantityPurchased + data.quantity;
      const newTotalCost = editSupply.totalCost + data.totalCost;
      const newQuantityRemaining = editSupply.quantityRemaining + data.quantity;

      await updateSupply(editSupply.id, {
        quantityPurchased: newQuantityPurchased,
        totalCost: newTotalCost,
        quantityRemaining: newQuantityRemaining,
        purchaseDate: new Date(),
        supplier: data.supplier?.trim() || editSupply.supplier,
      });

      onSuccess?.(editSupply.id);
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to record purchase:', error);
      setSubmitError((error as Error).message || 'Failed to record purchase');
    }
  };

  const handleClose = () => {
    resetSupply();
    resetPurchase();
    setSubmitError(null);
    setNewCostPerUnit(null);
    onClose();
  };

  // Purchase mode form
  if (isPurchaseMode && editSupply) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Restock: ${editSupply.name}`}
        size="md"
      >
        <form onSubmit={handleSubmitPurchase(onSubmitPurchase)} className="space-y-5">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Current Stock</span>
                <div className="font-medium text-slate-900 dark:text-white">
                  {editSupply.quantityRemaining} {editSupply.unit}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Current Cost/Unit</span>
                <div className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(editSupply.costPerUnit)}/{editSupply.unit}
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity Purchased *
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                {...registerPurchase('quantity', { valueAsNumber: true })}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {editSupply.unit}
              </span>
            </div>
            {purchaseErrors.quantity && (
              <p className="mt-1 text-sm text-red-500">{purchaseErrors.quantity.message}</p>
            )}
          </div>

          {/* Purchase Cost */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Total Cost *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                {...registerPurchase('totalCost', { valueAsNumber: true })}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            {purchaseErrors.totalCost && (
              <p className="mt-1 text-sm text-red-500">{purchaseErrors.totalCost.message}</p>
            )}
          </div>

          <OptionalTextField label="Supplier" registration={registerPurchase('supplier')} placeholder="e.g., Amazon, Local Nursery" />

          {/* Cost Calculation Preview */}
          {newCostPerUnit !== null && purchaseQuantity > 0 && (
            <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-2">
                After Purchase:
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-primary-600 dark:text-primary-400">New Stock</span>
                  <div className="font-bold text-primary-900 dark:text-primary-100">
                    {editSupply.quantityRemaining + purchaseQuantity} {editSupply.unit}
                  </div>
                </div>
                <div>
                  <span className="text-primary-600 dark:text-primary-400">New Cost/Unit</span>
                  <div className="font-bold text-primary-900 dark:text-primary-100">
                    {formatCurrency(newCostPerUnit)}/{editSupply.unit}
                  </div>
                </div>
              </div>
            </div>
          )}

          <FormError message={submitError} />
          <FormActions onCancel={handleClose} isSubmitting={isPurchaseSubmitting} submitLabel="Record Purchase" submittingLabel="Recording..." />
        </form>
      </Modal>
    );
  }

  // Create/Edit supply form
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? `Edit Supply: ${editSupply?.name}` : 'New Supply'}
      size="lg"
    >
      <form onSubmit={handleSubmitSupply(onSubmitSupply)} className="space-y-5">
        {/* Section: Basic Info */}
        <div className="space-y-4">
          <FormSectionHeader title="Supply Information" />
          <RequiredTextField label="Name" registration={registerSupply('name')} error={supplyErrors.name} placeholder="e.g., Clonex Rooting Gel, Perlite 20L" />

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPLY_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSupplyValue('category', cat.value)}
                  title={cat.description}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    selectedCategory === cat.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <input type="hidden" {...registerSupply('category')} />
            {supplyErrors.category && (
              <p className="mt-1 text-sm text-red-500">{supplyErrors.category.message}</p>
            )}
          </div>

          <SelectField label="Unit of Measure" registration={registerSupply('unit')} options={UNIT_OPTIONS} required />
        </div>

        {/* Section: Purchase Details */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <FormSectionHeader title={isEditMode ? 'Purchase History' : 'Initial Purchase'} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                {...registerSupply('quantityPurchased', { valueAsNumber: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {supplyErrors.quantityPurchased && (
                <p className="mt-1 text-sm text-red-500">{supplyErrors.quantityPurchased.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Cost *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  {...registerSupply('totalCost', { valueAsNumber: true })}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {supplyErrors.totalCost && (
                <p className="mt-1 text-sm text-red-500">{supplyErrors.totalCost.message}</p>
              )}
            </div>
          </div>

          {costPerUnitPreview > 0 && (
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Cost per unit: </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(costPerUnitPreview)}
              </span>
            </div>
          )}

          <OptionalTextField label="Supplier" registration={registerSupply('supplier')} placeholder="e.g., Amazon, Local Nursery" />
        </div>

        {/* Section: Inventory Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <FormSectionHeader title="Inventory Settings" />
          <NumericRangeField label="Reorder Point" registration={registerSupply('lowStockThreshold', { valueAsNumber: true })} error={supplyErrors.lowStockThreshold} step="0.01" placeholder="Alert when below this quantity" hint="You'll see a low stock alert when inventory falls below this level" />

          <TextareaField label="Notes" registration={registerSupply('notes')} error={supplyErrors.notes} placeholder="Storage location, usage notes..." />
        </div>

        <FormError message={submitError} />
        <FormActions onCancel={handleClose} isSubmitting={isSupplySubmitting} submitLabel={isEditMode ? 'Save Changes' : 'Add Supply'} submittingLabel="Saving..." />
      </form>
    </Modal>
  );
}
