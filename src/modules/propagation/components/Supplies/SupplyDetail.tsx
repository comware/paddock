/**
 * SupplyDetail - Detailed view of a single supply item
 *
 * Displays:
 * - Supply metadata (name, category, cost info)
 * - Current inventory status
 * - Action buttons (Edit, Restock, Adjust Inventory)
 *
 * Route: /propagation/supplies/:id
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useSupplies } from '../../stores/useSupplies';
import { SupplyForm } from './SupplyForm';
import { CATEGORY_COLORS, getCategoryDisplay, formatCurrency } from './utils';

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Metadata row component for consistent styling.
 */
function MetadataRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      {children || (
        <span className="text-slate-900 dark:text-white font-medium">
          {value ?? '-'}
        </span>
      )}
    </div>
  );
}

/**
 * Section header component.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
      {title}
    </h3>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SupplyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Store
  const {
    getSupplyById,
    loadSupplies,
    deleteSupply,
    isLoading,
  } = useSupplies();

  // Local state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data
  useEffect(() => {
    loadSupplies();
  }, [loadSupplies]);

  // Get supply data
  const supply = useMemo(() => {
    if (!id) return null;
    return getSupplyById(id);
  }, [id, getSupplyById]);

  // Get inventory status color
  const getInventoryStatusColor = (): string => {
    if (!supply) return 'text-slate-600 dark:text-slate-400';

    if (supply.isLowStock) {
      return 'text-red-600 dark:text-red-400';
    }

    const percentRemaining =
      supply.quantityPurchased > 0
        ? (supply.quantityRemaining / supply.quantityPurchased) * 100
        : 100;

    if (percentRemaining <= 25) {
      return 'text-yellow-600 dark:text-yellow-400';
    }

    return 'text-green-600 dark:text-green-400';
  };

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!id || !supply) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${supply.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteSupply(id);
      navigate('/propagation/supplies');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete supply:', error);
      alert('Failed to delete supply. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [id, supply, deleteSupply, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading supply...</div>
      </div>
    );
  }

  // Supply not found
  if (!supply) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">?</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Supply Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This supply doesn't exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/propagation/supplies')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to Supplies
        </button>
      </div>
    );
  }

  const categoryColors = CATEGORY_COLORS[supply.category];
  const percentRemaining =
    supply.quantityPurchased > 0
      ? Math.round((supply.quantityRemaining / supply.quantityPurchased) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/propagation/supplies"
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span>&larr;</span>
        <span>Back to Supplies</span>
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {supply.name}
              </h1>
              {supply.isLowStock && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  Low Stock
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors.bg} ${categoryColors.text}`}
              >
                {getCategoryDisplay(supply.category)}
              </span>
            </div>
            {supply.supplier && (
              <div className="text-lg text-slate-600 dark:text-slate-300">
                from {supply.supplier}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowRestockModal(true)}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              + Restock
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supply Details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Supply Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Name" value={supply.name} />
                <MetadataRow
                  label="Category"
                  value={getCategoryDisplay(supply.category)}
                />
                <MetadataRow label="Unit" value={supply.unit} />
                <MetadataRow
                  label="Supplier"
                  value={supply.supplier || 'Not specified'}
                />
              </div>
              <div>
                <MetadataRow label="Cost per Unit">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(supply.costPerUnit)}/{supply.unit}
                  </span>
                </MetadataRow>
                <MetadataRow label="Total Cost">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(supply.totalCost)}
                  </span>
                </MetadataRow>
                <MetadataRow label="Total Purchased">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {supply.quantityPurchased} {supply.unit}
                  </span>
                </MetadataRow>
                <MetadataRow label="Reorder Point">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {supply.lowStockThreshold !== undefined
                      ? `${supply.lowStockThreshold} ${supply.unit}`
                      : 'Not set'}
                  </span>
                </MetadataRow>
              </div>
            </div>

            {/* Notes */}
            {supply.notes && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Notes
                </h4>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {supply.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Inventory Status */}
        <div className="space-y-6">
          {/* Inventory Level */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Inventory" />
            <div className="space-y-4">
              {/* Current Stock */}
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className={`text-4xl font-bold ${getInventoryStatusColor()}`}>
                  {supply.quantityRemaining}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {supply.unit} in stock
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Inventory Level
                  </span>
                  <span className={`text-sm font-medium ${getInventoryStatusColor()}`}>
                    {percentRemaining}%
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      supply.isLowStock
                        ? 'bg-red-500'
                        : percentRemaining <= 25
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentRemaining, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                  <span>0</span>
                  {supply.lowStockThreshold && (
                    <span className="text-orange-500">
                      Reorder: {supply.lowStockThreshold}
                    </span>
                  )}
                  <span>{supply.quantityPurchased}</span>
                </div>
              </div>

              {/* Low Stock Warning */}
              {supply.isLowStock && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Stock is below reorder point ({supply.lowStockThreshold} {supply.unit})
                  </p>
                  <button
                    onClick={() => setShowRestockModal(true)}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium"
                  >
                    Restock now
                  </button>
                </div>
              )}

              {/* Inventory Value */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <MetadataRow label="Inventory Value">
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(supply.quantityRemaining * supply.costPerUnit)}
                  </span>
                </MetadataRow>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="History" />
            <div className="space-y-2 text-sm">
              <MetadataRow
                label="Last Purchase"
                value={format(new Date(supply.purchaseDate), 'MMM d, yyyy')}
              />
              <MetadataRow
                label="Created"
                value={format(new Date(supply.createdAt), 'MMM d, yyyy')}
              />
              <MetadataRow
                label="Last Updated"
                value={format(new Date(supply.updatedAt), 'MMM d, yyyy')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Supply Modal */}
      <SupplyForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editSupply={supply}
        onSuccess={() => setShowEditModal(false)}
      />

      {/* Restock Modal */}
      <SupplyForm
        isOpen={showRestockModal}
        onClose={() => setShowRestockModal(false)}
        editSupply={supply}
        purchaseMode
        onSuccess={() => setShowRestockModal(false)}
      />
    </div>
  );
}
