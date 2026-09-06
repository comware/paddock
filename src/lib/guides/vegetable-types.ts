/**
 * Vegetable guide metadata.
 *
 * This shape deliberately differs from the microgreens `GuideMetadata` (see
 * `types.ts`) and from propagation's, because each module's guide describes a
 * different physical thing. A microgreens guide describes a tray: it has a
 * blackout period and a pre-soak, and is harvested once at a fixed number of
 * days. A vegetable guide describes a bed: it has plant and row spacing, a
 * sowing depth, a germination temperature range, and — for crops that support
 * it — a succession interval, because a vegetable bed is usually sown more
 * than once across a season.
 *
 * `successionDays` is nullable rather than a number with some placeholder
 * value, because not every crop is a succession crop. A bed of pumpkins,
 * asparagus, or garlic is planted once and is not resown every N days —
 * giving it a succession interval would be advice to do something silly.
 * `null` means "this is not a succession crop", not "unknown".
 */
export interface VegetableGuideMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'moderate' | 'demanding';
  daysToMaturity: string; // "60-80" - a range, because it is one
  /**
   * How the crop starts.
   *
   * `clove` and `bulb` exist because garlic and shallots are planted from vegetative
   * material rather than sown from true seed. They do go straight into the ground, so
   * `direct` was not wrong - but it reads as seed-sown, and a grower could reasonably go
   * looking for garlic seed, which is not a thing you plant.
   *
   * The two are kept apart because the anatomy differs and growers use the words
   * precisely: garlic divides into cloves within a single bulb, while shallots multiply
   * into a cluster of separate offset bulbs. Calling a shallot a clove is wrong in the
   * same way calling garlic a seed is.
   */
  sowingMethod: 'direct' | 'transplant' | 'either' | 'clove' | 'bulb';
  spacingCm: number; // between plants
  rowSpacingCm: number;
  sowingDepthMm: number;
  soilTempC: string; // germination range, e.g. "10-30"
  successionDays: number | null; // null when it is not a succession crop
  file: string;
  status: string;
}

export interface VegetableGuideCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface VegetableGuideIndex {
  version: string;
  lastUpdated: string;
  categories: VegetableGuideCategory[];
  guides: VegetableGuideMetadata[];
}
