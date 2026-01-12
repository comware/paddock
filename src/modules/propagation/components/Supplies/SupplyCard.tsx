/**
 * SupplyCard - Individual supply display component
 *
 * Shows supply info with category badge, quantity, cost-per-unit, and low stock indicator.
 * Follows the StationCard pattern from the propagation module.
 */

import type { PropSupplyWithStatus } from '../../types';
import { CATEGORY_COLORS, getCategoryDisplay, formatCurrency } from './utils';

interface SupplyCardProps {
  supply: PropSupplyWithStatus;
  onEdit?: (id: string) => void;
  onRecordPurchase?: (id: string) => void;
  onClick?: (id: string) => void;
}

/**
 * Get inventory status color.
 */
function getInventoryStatusColor(supply: PropSupplyWithStatus): {
  bar: string;
  text: string;
  bg: string;
} {
  if (supply.isLowStock) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    };
  }

  const percentRemaining =
    supply.quantityPurchased > 0
      ? (supply.quantityRemaining / supply.quantityPurchased) * 100
      : 100;

  if (percentRemaining <= 25) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    };
  }

  return {
    bar: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  };
}

export function SupplyCard({
  supply,
  onEdit,
  onRecordPurchase,
  onClick,
}: SupplyCardProps) {
  const categoryColors = CATEGORY_COLORS[supply.category];
  const inventoryColors = getInventoryStatusColor(supply);

  const percentRemaining =
    supply.quantityPurchased > 0
      ? Math.round((supply.quantityRemaining / supply.quantityPurchased) * 100)
      : 100;

  // Determine card background based on status
  const getCardBackground = (): string => {
    if (supply.isLowStock) {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${getCardBackground()}`}
      onClick={() => onClick?.(supply.id!)}
    >
      {/* Header: Name and Category Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white truncate">
              {supply.name}
            </span>
            {supply.isLowStock && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200">
                Low Stock
              </span>
            )}
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors.bg} ${categoryColors.text} whitespace-nowrap ml-2`}
        >
          {getCategoryDisplay(supply.category)}
        </span>
      </div>

      {/* Quantity and Cost Info */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-700">
          <span className="text-slate-500 dark:text-slate-400 text-xs block">
            In Stock
          </span>
          <span className={`font-medium ${inventoryColors.text}`}>
            {supply.quantityRemaining} {supply.unit}
          </span>
        </div>
        <div className="px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-700">
          <span className="text-slate-500 dark:text-slate-400 text-xs block">
            Cost/Unit
          </span>
          <span className="font-medium text-slate-900 dark:text-white">
            {formatCurrency(supply.costPerUnit)}/{supply.unit}
          </span>
        </div>
      </div>

      {/* Inventory Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Inventory Level
          </span>
          <span className={`text-xs font-medium ${inventoryColors.text}`}>
            {percentRemaining}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${inventoryColors.bar} transition-all duration-300`}
            style={{ width: `${Math.min(percentRemaining, 100)}%` }}
          />
        </div>
        {supply.lowStockThreshold !== undefined && (
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
            <span>Reorder at {supply.lowStockThreshold} {supply.unit}</span>
            <span>Total: {supply.quantityPurchased} {supply.unit}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        {onRecordPurchase && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRecordPurchase(supply.id!);
            }}
            className="flex-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            + Restock
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(supply.id!);
            }}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
