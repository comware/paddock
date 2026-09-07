/**
 * Line icons for the propagation guide categories.
 *
 * These were emoji carried in index.json - 🎯 for Advanced, 🛒 for Equipment, 🦘 for
 * Australian Natives. Emoji render differently on every platform, sit on an inconsistent
 * baseline beside text, and cannot take the colour of what they sit next to; the rest of the
 * app moved off them, and the guide library was the last place still using them.
 *
 * They live here rather than in index.json because a component cannot be expressed in JSON.
 * The `icon` field is gone from the index entirely, so there is no second source to drift.
 *
 * Keyed by category id. Unknown ids fall back rather than throwing - the index is data, and
 * a category added there before this map is updated should still render.
 */

import {
  Sprout,
  Leaf,
  Target,
  CookingPot,
  Apple,
  Flower2,
  Trees,
  Shrub,
  TreePalm,
  type LucideIcon,
} from 'lucide-react';

const BY_CATEGORY: Record<string, LucideIcon> = {
  beginner: Sprout,
  intermediate: Leaf,
  advanced: Target,
  herbs: CookingPot,
  fruit: Apple,
  ornamentals: Flower2,
  'natives-au': Trees,
  succulents: Shrub,
  houseplants: TreePalm,
};

export function categoryIcon(categoryId: string): LucideIcon {
  return BY_CATEGORY[categoryId] ?? Sprout;
}
