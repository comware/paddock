/**
 * SupplyForm constants and validation schemas
 *
 * Extracted from SupplyForm.tsx for maintainability.
 */

import { z } from 'zod';
import type { SupplyCategory } from '../../types';

// ============================================
// CATEGORY OPTIONS
// ============================================

export const SUPPLY_CATEGORIES: Array<{
  value: SupplyCategory;
  label: string;
  description: string;
}> = [
  {
    value: 'rooting_hormone',
    label: 'Rooting Hormone',
    description: 'Powders, gels, and liquids to promote root growth',
  },
  {
    value: 'growing_medium',
    label: 'Growing Medium',
    description: 'Perlite, vermiculite, coco coir, potting mix',
  },
  {
    value: 'containers',
    label: 'Containers',
    description: 'Pots, trays, cell packs, propagation flats',
  },
  {
    value: 'labels',
    label: 'Labels',
    description: 'Plant labels, markers, tags',
  },
  {
    value: 'tools',
    label: 'Tools',
    description: 'Scissors, scalpels, dibbers, misters',
  },
  {
    value: 'heating',
    label: 'Heating',
    description: 'Heat mats, cables, thermostats',
  },
  {
    value: 'misting',
    label: 'Misting',
    description: 'Misting systems, spray bottles, domes',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Miscellaneous propagation supplies',
  },
];

// ============================================
// UNIT OPTIONS
// ============================================

export const UNIT_OPTIONS = [
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'L', label: 'Liters (L)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'pack', label: 'Packs' },
  { value: 'bag', label: 'Bags' },
  { value: 'box', label: 'Boxes' },
];

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const supplySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  category: z.enum([
    'rooting_hormone',
    'growing_medium',
    'containers',
    'labels',
    'tools',
    'heating',
    'misting',
    'other',
  ] as const, {
    message: 'Please select a category',
  }),
  unit: z.string().min(1, 'Unit is required'),
  quantityPurchased: z.number().min(0.01, 'Quantity must be greater than 0'),
  totalCost: z.number().min(0, 'Cost cannot be negative'),
  supplier: z.string().max(100, 'Supplier name too long').optional(),
  lowStockThreshold: z.number().min(0).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export type SupplyFormData = z.infer<typeof supplySchema>;

export const purchaseSchema = z.object({
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  totalCost: z.number().min(0, 'Cost cannot be negative'),
  supplier: z.string().max(100, 'Supplier name too long').optional(),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;

// ============================================
// HELPERS
// ============================================

export const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
