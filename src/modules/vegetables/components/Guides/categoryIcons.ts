/**
 * Line icons for the vegetable guide categories.
 *
 * These were emoji in index.json - 🥬 🥦 🥕 🧅 and so on. There is a genuine argument for
 * keeping them, which is that they depict the crop rather than standing in for an abstract
 * idea, and that is why they survived the round that converted propagation. But the two
 * libraries sit one click apart, and a reader moving between them saw the same kind of thing
 * drawn two different ways. Consistency won.
 *
 * Same shape as the propagation map: components cannot live in JSON, so they live here and
 * the `icon` field is gone from the index entirely.
 */

import {
  LeafyGreen,
  Broccoli,
  Carrot,
  Sprout,
  Bean,
  Grape,
  Cherry,
  Leaf,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

const BY_CATEGORY: Record<string, LucideIcon> = {
  'leafy-greens': LeafyGreen,
  brassicas: Broccoli,
  roots: Carrot,
  // No onion in Lucide. A bulb sends up a shoot, which Sprout draws.
  alliums: Sprout,
  legumes: Bean,
  // No pumpkin either. Cucurbits sprawl on a vine; Grape is the closest vining fruit.
  cucurbits: Grape,
  fruiting: Cherry,
  herbs: Leaf,
  perennials: Wheat,
};

export function categoryIcon(categoryId: string): LucideIcon {
  return BY_CATEGORY[categoryId] ?? Sprout;
}
