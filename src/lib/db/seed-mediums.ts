/**
 * Seed Data — Growing Medium Configurations
 *
 * Pre-populates growing medium configurations for the Grow module.
 */

import type { GrowMediumConfig } from './schema';

export const defaultMediums: Omit<GrowMediumConfig, 'id'>[] = [
  {
    value: 'coco_coir',
    label: 'Coco Coir',
    costRating: 'low',
    bestFor: 'Most varieties, good moisture retention',
    notes: 'Sustainable, reusable if sterilized. Standard choice for beginners.',
  },
  {
    value: 'hemp_mat',
    label: 'Hemp Mat',
    costRating: 'medium',
    bestFor: 'Clean harvest, restaurant supply',
    notes: 'No mess at harvest, roots lift cleanly. Slightly lower yields.',
  },
  {
    value: 'biostrate',
    label: 'Biostrate',
    costRating: 'medium',
    bestFor: 'Brassicas, professional growers',
    notes: 'Felt-like mat, excellent root hold. Industry standard for commercial.',
  },
  {
    value: 'soil',
    label: 'Soil (Potting Mix)',
    costRating: 'low',
    bestFor: 'Sunflower, pea shoots, wheatgrass',
    notes: 'Traditional method, heavier yields. Messier harvest.',
  },
  {
    value: 'vermiculite',
    label: 'Vermiculite',
    costRating: 'low',
    bestFor: 'Even moisture distribution',
    notes: 'Often mixed with coco coir. Good for mucilaginous seeds.',
  },
  {
    value: 'jute_mat',
    label: 'Jute Mat',
    costRating: 'low',
    bestFor: 'Budget-conscious, biodegradable',
    notes: 'Natural fiber, fully compostable. Good drainage.',
  },
  {
    value: 'paper_towel',
    label: 'Paper Towel',
    costRating: 'low',
    bestFor: 'Experiments, germination tests',
    notes: 'Testing only - not for production. Dries out quickly.',
  },
];
