/**
 * motherPlantConstants - Constants, schema, and types for MotherPlantForm
 */

import { z } from 'zod';
import type { AcquisitionMethod } from '../../types';

export const ACQUISITION_METHODS: Array<{
  value: AcquisitionMethod;
  label: string;
  description: string;
}> = [
  { value: 'purchased', label: 'Purchased', description: 'Bought from nursery or seller' },
  { value: 'propagated', label: 'Propagated', description: 'Grown from your own propagation' },
  { value: 'gifted', label: 'Gifted', description: 'Received as a gift' },
  { value: 'wild_collected', label: 'Wild Collected', description: 'Collected from the wild' },
];

export const motherPlantSchema = z.object({
  species: z.string().min(1, 'Species is required').max(100, 'Species name too long'),
  variety: z.string().max(100, 'Variety name too long').optional(),
  scientificName: z.string().max(150, 'Scientific name too long').optional(),
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  acquisitionDate: z.date(),
  acquisitionMethod: z.enum(['purchased', 'propagated', 'gifted', 'wild_collected'] as const, {
    message: 'Please select how you acquired this plant',
  }),
  acquisitionSource: z.string().max(200, 'Source too long').optional(),
  acquisitionCost: z.number().min(0, 'Cost cannot be negative').optional().nullable(),
  location: z.string().max(200, 'Location too long').optional(),
  estimatedAge: z.number().int().min(0, 'Age cannot be negative').optional().nullable(),
  propagationNotes: z.string().max(1000, 'Notes too long').optional(),
});

export type MotherPlantFormData = z.infer<typeof motherPlantSchema>;
