/**
 * SupplyList - Main supplies inventory management view
 *
 * Features:
 * - Grid display of all supplies via SupplyCard
 * - Group by category with section headers
 * - Filter by category and low stock status
 * - Low stock alert banner
 * - Quick actions for add, edit, restock
 * - Mobile-responsive layout
 *
 * Follows the StationList pattern from the propagation module.
 */

import { Package, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSupplies } from '../../stores/useSupplies';
import type { PropSupply, PropSupplyWithStatus, SupplyCategory } from '../../types';
import { SupplyCard } from './SupplyCard';
import { SupplyForm } from './SupplyForm';
import { LowStockAlert } from './LowStockAlert';
import { getCategoryDisplay } from './utils';

// ============================================
// FILTER OPTIONS
// ============================================

const CATEGORY_OPTIONS: Array<{ value: SupplyCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'rooting_hormone', label: 'Rooting Hormone' },
  { value: 'growing_medium', label: 'Growing Medium' },
  { value: 'containers', label: 'Containers' },
  { value: 'labels', label: 'Labels' },
  { value: 'tools', label: 'Tools' },
  { value: 'heating', label: 'Heating' },
  { value: 'misting', label: 'Misting' },
  { value: 'other', label: 'Other' },
];

// ============================================
// COMPONENT
// ============================================

export function SupplyList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Store state and actions
  const {
    supplies,
    isLoading,
    loadSupplies,
    filters,
    setFilters,
    resetFilters,
    getFilteredSupplies,
    getLowStockSupplies,
    getSupplyById,
  } = useSupplies();

  // Modal state
  const [isNewSupplyOpen, setIsNewSupplyOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<PropSupply | null>(null);
  const [restockingSupply, setRestockingSupply] = useState<PropSupply | null>(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const lowStockParam = searchParams.get('lowStock');

    const urlFilters: { category?: SupplyCategory | 'all'; lowStockOnly?: boolean } = {};
    if (categoryParam && categoryParam !== 'all') {
      urlFilters.category = categoryParam as SupplyCategory;
    }
    if (lowStockParam === 'true') {
      urlFilters.lowStockOnly = true;
    }

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load supplies on mount
  useEffect(() => {
    loadSupplies();
  }, [loadSupplies]);

  // Sync filters to URL params
  const updateSearchParams = useCallback(
    (newFilters: { category?: SupplyCategory | 'all'; lowStockOnly?: boolean }) => {
      const params = new URLSearchParams();
      const mergedFilters = { ...filters, ...newFilters };

      if (mergedFilters.category && mergedFilters.category !== 'all') {
        params.set('category', mergedFilters.category);
      }
      if (mergedFilters.lowStockOnly) {
        params.set('lowStock', 'true');
      }

      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams]
  );

  // Handle filter changes
  const handleCategoryChange = useCallback(
    (category: SupplyCategory | 'all') => {
      setFilters({ category });
      updateSearchParams({ category });
    },
    [setFilters, updateSearchParams]
  );

  const handleLowStockToggle = useCallback(() => {
    const newValue = !filters.lowStockOnly;
    setFilters({ lowStockOnly: newValue });
    updateSearchParams({ lowStockOnly: newValue });
  }, [filters.lowStockOnly, setFilters, updateSearchParams]);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [resetFilters, setSearchParams]);

  // Handle supply actions
  const handleEditClick = useCallback(
    (supplyId: string) => {
      const supply = getSupplyById(supplyId);
      if (supply) {
        setEditingSupply(supply);
      }
    },
    [getSupplyById]
  );

  const handleRestockClick = useCallback(
    (supplyId: string) => {
      const supply = getSupplyById(supplyId);
      if (supply) {
        setRestockingSupply(supply);
      }
    },
    [getSupplyById]
  );

  const handleSupplyClick = useCallback(
    (supplyId: string) => {
      navigate(`/propagation/supplies/${supplyId}`);
    },
    [navigate]
  );

  // Get filtered supplies and group by category
  const filteredSupplies = getFilteredSupplies();
  const lowStockSupplies = getLowStockSupplies();

  // Group supplies by category for display
  const groupedSupplies = useMemo(() => {
    const groups: Record<SupplyCategory, PropSupplyWithStatus[]> = {
      rooting_hormone: [],
      growing_medium: [],
      containers: [],
      labels: [],
      tools: [],
      heating: [],
      misting: [],
      other: [],
    };

    for (const supply of filteredSupplies) {
      groups[supply.category].push(supply);
    }

    return groups;
  }, [filteredSupplies]);

  // Get non-empty categories in order
  const nonEmptyCategories = useMemo(() => {
    const categoryOrder: SupplyCategory[] = [
      'rooting_hormone',
      'growing_medium',
      'containers',
      'labels',
      'tools',
      'heating',
      'misting',
      'other',
    ];
    return categoryOrder.filter((cat) => groupedSupplies[cat].length > 0);
  }, [groupedSupplies]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalValue = supplies.reduce(
      (sum, s) => sum + s.quantityRemaining * s.costPerUnit,
      0
    );
    const categoriesInUse = new Set(supplies.map((s) => s.category)).size;

    return {
      total: supplies.length,
      lowStock: lowStockSupplies.length,
      totalValue,
      categoriesInUse,
    };
  }, [supplies, lowStockSupplies]);

  // Check if filters are applied
  const hasFilters = filters.category !== 'all' || filters.lowStockOnly;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading supplies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Propagation Supplies
        </h1>
        <button
          onClick={() => setIsNewSupplyOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add Supply
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockSupplies.length > 0 && !filters.lowStockOnly && (
        <LowStockAlert
          lowStockItems={lowStockSupplies}
          onRestockClick={handleRestockClick}
          maxItems={3}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 card">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Category:
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleCategoryChange(e.target.value as SupplyCategory | 'all')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.lowStockOnly}
            onChange={handleLowStockToggle}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Low stock only
            {lowStockSupplies.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                {lowStockSupplies.length}
              </span>
            )}
          </span>
        </label>

        {/* Reset Filters */}
        {hasFilters && (
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        )}

        {/* Results Count */}
        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          {filteredSupplies.length} of {supplies.length} supplies
        </div>
      </div>

      {/* Supply Grid - Grouped by Category */}
      {filteredSupplies.length === 0 ? (
        <EmptyState
          Icon={hasFilters ? SearchX : Package}
          title={supplies.length === 0 ? 'No supplies yet' : 'No supplies match filters'}
          description={
            supplies.length === 0
              ? 'Track your propagation supplies to monitor inventory and calculate costs.'
              : 'Try adjusting your filters to see more supplies.'
          }
          action={
            supplies.length === 0 ? { label: 'Add first supply', onClick: () => setIsNewSupplyOpen(true) } : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {nonEmptyCategories.map((category) => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {getCategoryDisplay(category)}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700">
                  {groupedSupplies[category].length}
                </span>
              </div>

              {/* Supply Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedSupplies[category].map((supply) => (
                  <SupplyCard
                    key={supply.id}
                    supply={supply}
                    onEdit={handleEditClick}
                    onRecordPurchase={handleRestockClick}
                    onClick={handleSupplyClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {supplies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Items</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${
              stats.lowStock > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'
            }`}>
              {stats.lowStock}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Low Stock</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.categoriesInUse}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Categories</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Inventory Value</div>
          </div>
        </div>
      )}

      {/* New Supply Form Modal */}
      <SupplyForm
        isOpen={isNewSupplyOpen}
        onClose={() => setIsNewSupplyOpen(false)}
      />

      {/* Edit Supply Form Modal */}
      <SupplyForm
        isOpen={!!editingSupply}
        onClose={() => setEditingSupply(null)}
        editSupply={editingSupply || undefined}
      />

      {/* Restock/Purchase Form Modal */}
      <SupplyForm
        isOpen={!!restockingSupply}
        onClose={() => setRestockingSupply(null)}
        editSupply={restockingSupply || undefined}
        purchaseMode
      />
    </div>
  );
}
