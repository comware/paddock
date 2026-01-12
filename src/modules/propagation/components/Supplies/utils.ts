/**
 * Supplies Utilities
 *
 * Shared constants and utility functions for supply components.
 */

import type { SupplyCategory } from '../../types';

/**
 * Display names for supply categories.
 */
export const CATEGORY_DISPLAY_NAMES: Record<SupplyCategory, string> = {
  rooting_hormone: 'Rooting Hormone',
  growing_medium: 'Growing Medium',
  containers: 'Containers',
  labels: 'Labels',
  tools: 'Tools',
  heating: 'Heating',
  misting: 'Misting',
  other: 'Other',
};

/**
 * Category badge colors.
 */
export const CATEGORY_COLORS: Record<SupplyCategory, { bg: string; text: string }> = {
  rooting_hormone: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
  },
  growing_medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  containers: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  labels: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
  },
  tools: {
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
  },
  heating: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
  },
  misting: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  other: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
  },
};

/**
 * Get display name for supply category.
 */
export function getCategoryDisplay(category: SupplyCategory): string {
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
