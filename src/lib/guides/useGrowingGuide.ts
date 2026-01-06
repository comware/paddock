/**
 * useGrowingGuide - Hook for loading variety-specific growing guides
 *
 * Handles fetching guide content with fuzzy matching for variety names.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GuideIndex, GuideMetadata, UseGrowingGuideResult } from './types';

// Module-level cache for guide index (shared across all hook instances)
let guideIndexCache: GuideIndex | null = null;
let guideIndexPromise: Promise<GuideIndex> | null = null;

// Cache for loaded guide content
const guideContentCache = new Map<string, string>();

// Alias table for variety name mismatches
const VARIETY_ALIASES: Record<string, string> = {
  'pak choi': 'bok choy',
  'pac choi': 'bok choy',
  'chinese cabbage': 'bok choy',
  'daikon': 'radish (daikon)',
  'china rose': 'radish (china rose)',
};

/**
 * Normalize a variety name for matching
 */
function normalizeVarietyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the best matching guide for a variety name
 */
function findGuideMatch(
  varietyName: string,
  guides: GuideMetadata[]
): GuideMetadata | null {
  const normalizedInput = normalizeVarietyName(varietyName);

  // Check aliases first
  const aliasKey = Object.keys(VARIETY_ALIASES).find(
    (alias) => normalizedInput.includes(alias) || alias.includes(normalizedInput)
  );
  const searchName = aliasKey ? VARIETY_ALIASES[aliasKey] : normalizedInput;

  // 1. Exact match (normalized)
  const exactMatch = guides.find(
    (g) => normalizeVarietyName(g.name) === searchName
  );
  if (exactMatch) return exactMatch;

  // 2. Input is contained in guide name (e.g., "Basil" matches "Basil (Genovese)")
  const containedMatch = guides.find((g) =>
    normalizeVarietyName(g.name).includes(searchName)
  );
  if (containedMatch) return containedMatch;

  // 3. Guide name is contained in input (e.g., "Mustard Red" matches "Mustard")
  const reverseMatch = guides.find((g) =>
    searchName.includes(normalizeVarietyName(g.name).split(' ')[0])
  );
  if (reverseMatch) return reverseMatch;

  // 4. First word match (e.g., "Radish" matches any radish variant)
  const inputFirstWord = searchName.split(' ')[0];
  const firstWordMatch = guides.find(
    (g) => normalizeVarietyName(g.name).split(' ')[0] === inputFirstWord
  );
  if (firstWordMatch) return firstWordMatch;

  return null;
}

/**
 * Fetch and cache the guide index
 */
async function fetchGuideIndex(): Promise<GuideIndex> {
  if (guideIndexCache) return guideIndexCache;

  if (guideIndexPromise) return guideIndexPromise;

  guideIndexPromise = fetch('/guides/index.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load guide index');
      return res.json();
    })
    .then((data: GuideIndex) => {
      guideIndexCache = data;
      return data;
    })
    .catch((error) => {
      guideIndexPromise = null;
      throw error;
    });

  return guideIndexPromise;
}

/**
 * Fetch and cache guide content
 */
async function fetchGuideContent(filePath: string): Promise<string> {
  if (guideContentCache.has(filePath)) {
    return guideContentCache.get(filePath)!;
  }

  const res = await fetch(`/guides/${filePath}`);
  if (!res.ok) throw new Error(`Failed to load guide: ${filePath}`);

  const content = await res.text();
  guideContentCache.set(filePath, content);
  return content;
}

/**
 * Hook for loading growing guide content
 *
 * @param varietyName - The variety name to find a guide for
 * @returns Guide content, metadata, loading state, and error
 */
export function useGrowingGuide(
  varietyName: string | null
): UseGrowingGuideResult {
  const [content, setContent] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<GuideMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGuide = useCallback(async () => {
    if (!varietyName) {
      setContent(null);
      setMetadata(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const index = await fetchGuideIndex();
      const guide = findGuideMatch(varietyName, index.guides);

      if (!guide) {
        setContent(null);
        setMetadata(null);
        setError(`No growing guide found for "${varietyName}"`);
        return;
      }

      const guideContent = await fetchGuideContent(guide.file);
      setContent(guideContent);
      setMetadata(guide);
    } catch (err) {
      setError((err as Error).message);
      setContent(null);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, [varietyName]);

  useEffect(() => {
    loadGuide();
  }, [loadGuide]);

  return { content, metadata, isLoading, error };
}

/**
 * Get all available guides (useful for browse/search)
 */
export async function getAllGuides(): Promise<GuideMetadata[]> {
  const index = await fetchGuideIndex();
  return index.guides;
}

/**
 * Clear all cached data (useful for testing)
 */
export function clearGuideCache(): void {
  guideIndexCache = null;
  guideIndexPromise = null;
  guideContentCache.clear();
}
