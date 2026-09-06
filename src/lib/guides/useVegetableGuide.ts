import { useState, useEffect } from 'react';
import type { VegetableGuideIndex, VegetableGuideMetadata } from './vegetable-types';

interface UseVegetableGuideResult {
  content: string | null;
  metadata: VegetableGuideMetadata | null;
  isLoading: boolean;
  error: string | null;
}

// Cache for guide index and content
let guideIndexCache: VegetableGuideIndex | null = null;
const contentCache = new Map<string, string>();

// Alias mapping for crop names that vary by country. Vegetable naming varies
// far more than microgreens naming (which is mostly one crop, one name), so
// rather than repeating each alias in every casing (as the microgreens
// version does), we normalise both the lookup key and the input at match
// time. That keeps this table small and correct regardless of how a grower
// capitalises what they type.
const CROP_ALIASES: Record<string, string> = {
  Silverbeet: 'Chard',
  Courgette: 'Zucchini',
  'Bell Pepper': 'Capsicum',
  Arugula: 'Rocket',
  Aubergine: 'Eggplant',
  Cilantro: 'Coriander',
  Swede: 'Rutabaga',
  Rutabaga: 'Swede',
  Scallion: 'Spring Onion',
  'Green Onion': 'Spring Onion',
  Beet: 'Beetroot',
  Snowpea: 'Snow Pea',
  Zucchini: 'Zucchini',
};

// Normalised (lowercased) alias lookup, built once, so "silverbeet",
// "Silverbeet" and "SILVERBEET" all resolve the same way without listing
// every casing by hand.
const NORMALISED_CROP_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(CROP_ALIASES).map(([key, value]) => [key.toLowerCase(), value])
);

/**
 * Normalize a crop name for matching
 */
function normalizeCropName(name: string): string {
  return name.toLowerCase().trim().replace(/[()]/g, '');
}

/**
 * Resolve a crop name through the alias table, case-insensitively.
 */
function resolveAlias(name: string): string {
  return NORMALISED_CROP_ALIASES[name.toLowerCase()] ?? name;
}

/**
 * Find a guide matching the crop name using fuzzy matching
 */
function findMatchingGuide(
  cropName: string,
  guides: VegetableGuideMetadata[]
): VegetableGuideMetadata | null {
  if (!cropName) return null;

  // Check aliases first (case-insensitively)
  const aliasedName = resolveAlias(cropName);

  // 1. Try exact match
  let match = guides.find(g => g.name === aliasedName);
  if (match) return match;

  // 2. Try case-insensitive exact match
  const lowerName = aliasedName.toLowerCase();
  match = guides.find(g => g.name.toLowerCase() === lowerName);
  if (match) return match;

  // 3. Try partial match (crop name is start of guide name)
  match = guides.find(g =>
    g.name.toLowerCase().startsWith(lowerName)
  );
  if (match) return match;

  // 4. Try normalized match (remove parentheses and compare)
  const normalizedSearch = normalizeCropName(aliasedName);
  match = guides.find(g =>
    normalizeCropName(g.name) === normalizedSearch
  );
  if (match) return match;

  // 5. Try contains match
  match = guides.find(g =>
    g.name.toLowerCase().includes(lowerName) ||
    lowerName.includes(g.name.toLowerCase())
  );
  if (match) return match;

  return null;
}

/**
 * Load the vegetable guide index from the public directory
 */
async function loadGuideIndex(): Promise<VegetableGuideIndex> {
  if (guideIndexCache) {
    return guideIndexCache;
  }

  const response = await fetch('/guides/vegetables/index.json');
  if (!response.ok) {
    throw new Error('Failed to load guide index');
  }

  const data = await response.json();
  guideIndexCache = data;
  return data;
}

/**
 * Load guide content from the public directory
 */
async function loadGuideContent(filePath: string): Promise<string> {
  if (contentCache.has(filePath)) {
    return contentCache.get(filePath)!;
  }

  const response = await fetch(`/guides/vegetables/${filePath}`);
  if (!response.ok) {
    throw new Error(`Failed to load guide: ${filePath}`);
  }

  const content = await response.text();
  contentCache.set(filePath, content);
  return content;
}

/**
 * Hook to load growing guide for a vegetable crop
 */
export function useVegetableGuide(cropName: string | null): UseVegetableGuideResult {
  const [content, setContent] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VegetableGuideMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cropName) {
      setContent(null);
      setMetadata(null);
      setError(null);
      return;
    }

    let isCancelled = false;

    async function loadGuide(name: string) {
      setIsLoading(true);
      setError(null);

      try {
        // Load guide index
        const index = await loadGuideIndex();

        // Find matching guide
        const guide = findMatchingGuide(name, index.guides);

        if (!guide) {
          setError(`No growing guide found for "${name}"`);
          setContent(null);
          setMetadata(null);
          setIsLoading(false);
          return;
        }

        // Load guide content
        const guideContent = await loadGuideContent(guide.file);

        if (!isCancelled) {
          setMetadata(guide);
          setContent(guideContent);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load guide');
          setContent(null);
          setMetadata(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGuide(cropName);

    return () => {
      isCancelled = true;
    };
  }, [cropName]);

  return { content, metadata, isLoading, error };
}

// Exported for testing the matcher directly without mounting the hook.
export { findMatchingGuide as __findMatchingGuideForTesting };
