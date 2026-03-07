/**
 * speciesConfigConstants - Constants, schema, and types for SpeciesConfigForm
 */

import { z } from 'zod';
import type { PropagationMethod } from '../../types';

// ============================================
// PROPAGATION METHODS
// ============================================

export const PROPAGATION_METHODS: Array<{
  value: PropagationMethod;
  label: string;
  category: string;
}> = [
  // Cuttings
  { value: 'cutting_softwood', label: 'Softwood Cutting', category: 'Cuttings' },
  { value: 'cutting_semi_hardwood', label: 'Semi-hardwood Cutting', category: 'Cuttings' },
  { value: 'cutting_hardwood', label: 'Hardwood Cutting', category: 'Cuttings' },
  { value: 'cutting_leaf', label: 'Leaf Cutting', category: 'Cuttings' },
  { value: 'cutting_root', label: 'Root Cutting', category: 'Cuttings' },
  // Division
  { value: 'division', label: 'Division', category: 'Division' },
  // Layering
  { value: 'layering_simple', label: 'Simple Layering', category: 'Layering' },
  { value: 'layering_air', label: 'Air Layering', category: 'Layering' },
  // Grafting
  { value: 'grafting_whip', label: 'Whip Grafting', category: 'Grafting' },
  { value: 'grafting_cleft', label: 'Cleft Grafting', category: 'Grafting' },
  { value: 'grafting_bud', label: 'Bud Grafting', category: 'Grafting' },
  // Seed
  { value: 'seed', label: 'Seed', category: 'Seed' },
];

// ============================================
// MONTH OPTIONS
// ============================================

export const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

export const speciesConfigSchema = z.object({
  species: z.string().min(1, 'Species name is required').max(100, 'Name too long'),
  scientificName: z.string().max(150, 'Scientific name too long').optional(),
  preferredMethod: z.enum([
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
  ] as const).optional(),
  typicalRootingDays: z.number().min(1).max(365).optional().nullable(),
  typicalDaysToReady: z.number().min(1).max(730).optional().nullable(),
  maxDaysRooting: z.number().min(1).max(365).optional().nullable(),
  maxDaysPottedUp: z.number().min(1).max(365).optional().nullable(),
  maxDaysHardening: z.number().min(1).max(365).optional().nullable(),
  bestPropagationMonths: z.array(z.number().min(1).max(12)).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export type SpeciesConfigFormData = z.infer<typeof speciesConfigSchema>;
