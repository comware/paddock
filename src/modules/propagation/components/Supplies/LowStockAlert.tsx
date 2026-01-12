/**
 * LowStockAlert - Banner component for low stock supply items
 *
 * Displays a prominent alert when supplies are running low,
 * with a list of items and quick links to restock.
 */

import { useNavigate } from 'react-router-dom';
import type { PropSupplyWithStatus } from '../../types';
import { CATEGORY_COLORS, getCategoryDisplay } from './utils';

interface LowStockAlertProps {
  lowStockItems: PropSupplyWithStatus[];
  onRestockClick?: (supplyId: string) => void;
  maxItems?: number;
  compact?: boolean;
}

export function LowStockAlert({
  lowStockItems,
  onRestockClick,
  maxItems = 5,
  compact = false,
}: LowStockAlertProps) {
  const navigate = useNavigate();

  if (lowStockItems.length === 0) {
    return null;
  }

  const displayItems = lowStockItems.slice(0, maxItems);
  const remainingCount = lowStockItems.length - maxItems;

  // Compact version for dashboard widgets
  if (compact) {
    return (
      <div
        className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        onClick={() => navigate('/propagation/supplies?lowStock=true')}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">!!</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-orange-800 dark:text-orange-200">
              Low Stock Alert
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400 truncate">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need restocking
            </p>
          </div>
          <span className="text-orange-500 dark:text-orange-400 text-sm">View all</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">!!</span>
          <div>
            <h2 className="text-lg font-bold text-orange-800 dark:text-orange-200">
              Low Stock Alert
            </h2>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {lowStockItems.length} supply item{lowStockItems.length !== 1 ? 's' : ''} below reorder point
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/propagation/supplies?lowStock=true')}
          className="text-sm font-medium text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200"
        >
          View All
        </button>
      </div>

      {/* Item List */}
      <div className="space-y-2">
        {displayItems.map((item) => {
          const categoryColors = CATEGORY_COLORS[item.category];
          const shortage = item.lowStockThreshold
            ? item.lowStockThreshold - item.quantityRemaining
            : 0;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors.bg} ${categoryColors.text}`}
                    >
                      {getCategoryDisplay(item.category)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {item.quantityRemaining} {item.unit}
                    </span>
                    {item.lowStockThreshold && (
                      <>
                        {' '}
                        remaining (reorder at {item.lowStockThreshold} {item.unit})
                      </>
                    )}
                    {shortage > 0 && (
                      <span className="ml-2 text-red-600 dark:text-red-400">
                        - Need {shortage} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {onRestockClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestockClick(item.id!);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors whitespace-nowrap ml-3"
                >
                  Restock
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more count */}
      {remainingCount > 0 && (
        <button
          onClick={() => navigate('/propagation/supplies?lowStock=true')}
          className="w-full mt-3 py-2 text-sm text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200 text-center"
        >
          + {remainingCount} more item{remainingCount !== 1 ? 's' : ''} low on stock
        </button>
      )}
    </div>
  );
}

/**
 * Small badge version for use in headers/nav.
 */
export function LowStockBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
      {count}
    </span>
  );
}
