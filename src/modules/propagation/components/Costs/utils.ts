/**
 * Cost Component Utilities
 *
 * Shared constants and utility functions for cost display components.
 */

import type { SupplyCategory } from '../../types';

/**
 * Category colors for cost breakdown display.
 * Matches the Supplies module colors for consistency.
 */
export const CATEGORY_COLORS: Record<SupplyCategory | 'manual', { bg: string; text: string; bar: string }> = {
  rooting_hormone: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    bar: 'bg-green-500',
  },
  growing_medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  containers: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    bar: 'bg-blue-500',
  },
  labels: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    bar: 'bg-purple-500',
  },
  tools: {
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    bar: 'bg-slate-500',
  },
  heating: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    bar: 'bg-red-500',
  },
  misting: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    bar: 'bg-cyan-500',
  },
  other: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    bar: 'bg-gray-500',
  },
  manual: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    bar: 'bg-indigo-500',
  },
};

/**
 * Display names for cost categories.
 */
export const CATEGORY_DISPLAY_NAMES: Record<SupplyCategory | 'manual', string> = {
  rooting_hormone: 'Rooting Hormone',
  growing_medium: 'Growing Medium',
  containers: 'Containers',
  labels: 'Labels',
  tools: 'Tools',
  heating: 'Heating',
  misting: 'Misting',
  other: 'Other Supplies',
  manual: 'Manual Costs',
};

/**
 * Get display name for a category.
 */
export function getCategoryDisplay(category: SupplyCategory | 'manual'): string {
  return CATEGORY_DISPLAY_NAMES[category] || category;
}

/**
 * Format currency value.
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format cost per unit with appropriate precision.
 * Shows more decimals for small values.
 */
export function formatCostPerUnit(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}
