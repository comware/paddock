/**
 * Constants for the NewBatchForm and related components.
 *
 * Extracted from NewBatchForm.tsx to reduce file size and
 * allow reuse across batch form sub-components.
 */

import { z } from 'zod';
import type { PropagationMethod } from '../../types';

// ============================================
// PROPAGATION METHODS WITH DESCRIPTIONS
// ============================================

export const PROPAGATION_METHODS: Array<{
  value: PropagationMethod;
  label: string;
  category: string;
  description: string;
}> = [
  // Cuttings
  {
    value: 'cutting_softwood',
    label: 'Softwood Cutting',
    category: 'Cuttings',
    description: 'New growth, spring/early summer',
  },
  {
    value: 'cutting_semi_hardwood',
    label: 'Semi-hardwood Cutting',
    category: 'Cuttings',
    description: 'Partially mature, mid-summer to autumn',
  },
  {
    value: 'cutting_hardwood',
    label: 'Hardwood Cutting',
    category: 'Cuttings',
    description: 'Dormant wood, late autumn to winter',
  },
  {
    value: 'cutting_leaf',
    label: 'Leaf Cutting',
    category: 'Cuttings',
    description: 'Single leaves with petiole',
  },
  {
    value: 'cutting_root',
    label: 'Root Cutting',
    category: 'Cuttings',
    description: 'Sections of root material',
  },
  // Division
  {
    value: 'division',
    label: 'Division',
    category: 'Division',
    description: 'Splitting established plants',
  },
  // Layering
  {
    value: 'layering_simple',
    label: 'Simple Layering',
    category: 'Layering',
    description: 'Stem bent to ground and buried',
  },
  {
    value: 'layering_air',
    label: 'Air Layering',
    category: 'Layering',
    description: 'Wrapped aerial portion',
  },
  // Grafting
  {
    value: 'grafting_whip',
    label: 'Whip Grafting',
    category: 'Grafting',
    description: 'Diagonal cuts joined together',
  },
  {
    value: 'grafting_cleft',
    label: 'Cleft Grafting',
    category: 'Grafting',
    description: 'Scion inserted into split rootstock',
  },
  {
    value: 'grafting_bud',
    label: 'Bud Grafting',
    category: 'Grafting',
    description: 'Single bud inserted under bark',
  },
  // Seed
  {
    value: 'seed',
    label: 'Seed',
    category: 'Seed',
    description: 'Growing from seeds',
  },
];

// Group methods by category for display
export const METHODS_BY_CATEGORY = PROPAGATION_METHODS.reduce(
  (acc, method) => {
    if (!acc[method.category]) {
      acc[method.category] = [];
    }
    acc[method.category].push(method);
    return acc;
  },
  {} as Record<string, typeof PROPAGATION_METHODS>
);

// ============================================
// COMMON ROOTING MEDIUMS
// ============================================

export const ROOTING_MEDIUMS = [
  { value: '', label: 'Select medium...' },
  { value: 'perlite', label: 'Perlite' },
  { value: 'perlite_vermiculite', label: 'Perlite/Vermiculite Mix' },
  { value: 'coarse_sand', label: 'Coarse Sand' },
  { value: 'coco_coir', label: 'Coco Coir' },
  { value: 'peat_moss', label: 'Peat Moss' },
  { value: 'seed_raising_mix', label: 'Seed Raising Mix' },
  { value: 'water', label: 'Water (hydroponics)' },
  { value: 'sphagnum_moss', label: 'Sphagnum Moss' },
  { value: 'rockwool', label: 'Rockwool' },
  { value: 'other', label: 'Other' },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

export const batchSchema = z.object({
  species: z.string().min(1, 'Species is required').max(100, 'Species name too long'),
  variety: z.string().max(100, 'Variety name too long').optional(),
  method: z.enum([
    'cutting_softwood',
    'cutting_semi_hardwood',
    'cutting_hardwood',
    'cutting_leaf',
    'cutting_root',
    'division',
    'layering_simple',
    'layering_air',
    'grafting_whip',
    'grafting_cleft',
    'grafting_bud',
    'seed',
  ] as const, {
    message: 'Please select a propagation method',
  }),
  quantityStarted: z.number().min(1, 'At least 1 required').max(1000, 'Maximum 1000'),
  stationId: z.string().min(1, 'Station is required'),
  motherPlantId: z.string().optional(),
  dateTaken: z.date(),
  preparationNotes: z.string().max(500, 'Notes too long').optional(),
  rootingMedium: z.string().optional(),
  hormoneUsed: z.string().max(100, 'Hormone name too long').optional(),
});

export type BatchFormData = z.infer<typeof batchSchema>;

// ============================================
// QUICK SELECT QUANTITIES
// ============================================

export const QUICK_QUANTITIES = [5, 10, 20, 50, 100];
