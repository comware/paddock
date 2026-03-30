/**
 * usePropagationGuide Hook
 *
 * Hook to load propagation guide content and metadata.
 * Similar to useGrowingGuide but for propagation guides.
 */

import { useState, useEffect } from 'react';
import type { PropagationGuideIndex, PropagationGuideMetadata } from './propagation-types';

interface UsePropagationGuideResult {
  content: string | null;
  metadata: PropagationGuideMetadata | null;
  isLoading: boolean;
  error: string | null;
}

// Cache for guide index and content
let propagationIndexCache: PropagationGuideIndex | null = null;
const propagationContentCache = new Map<string, string>();

/**
 * Normalize a species name for matching
 */
function normalizeSpeciesName(name: string): string {
  return name.toLowerCase().trim().replace(/[()]/g, '');
}

/**
 * Find a guide matching the species name using fuzzy matching
 */
function findMatchingGuide(
  speciesName: string,
  guides: PropagationGuideMetadata[]
): PropagationGuideMetadata | null {
  if (!speciesName) return null;

  // 1. Try exact match
  let match = guides.find(g => g.name === speciesName);
  if (match) return match;

  // 2. Try case-insensitive exact match
  const lowerName = speciesName.toLowerCase();
  match = guides.find(g => g.name.toLowerCase() === lowerName);
  if (match) return match;

  // 3. Try partial match (species name is start of guide name)
  match = guides.find(g =>
    g.name.toLowerCase().startsWith(lowerName)
  );
  if (match) return match;

  // 4. Try normalized match (remove parentheses and compare)
  const normalizedSearch = normalizeSpeciesName(speciesName);
  match = guides.find(g =>
    normalizeSpeciesName(g.name) === normalizedSearch
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
 * Load the propagation guide index from the public directory
 */
async function loadPropagationGuideIndex(): Promise<PropagationGuideIndex> {
  if (propagationIndexCache) {
    return propagationIndexCache;
  }

  const response = await fetch('/guides/propagation/index.json');
  if (!response.ok) {
    throw new Error('Failed to load propagation guide index');
  }

  const data = await response.json();
  propagationIndexCache = data;
  return data;
}

/**
 * Load propagation guide content from the public directory
 */
async function loadPropagationGuideContent(filePath: string): Promise<string> {
  if (propagationContentCache.has(filePath)) {
    return propagationContentCache.get(filePath)!;
  }

  const response = await fetch(`/guides/propagation/${filePath}`);
  if (!response.ok) {
    throw new Error(`Failed to load propagation guide: ${filePath}`);
  }

  const content = await response.text();
  propagationContentCache.set(filePath, content);
  return content;
}

/**
 * Hook to load propagation guide for a species
 */
export function usePropagationGuide(speciesName: string | null): UsePropagationGuideResult {
  const [content, setContent] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PropagationGuideMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!speciesName) {
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
        const index = await loadPropagationGuideIndex();

        // Find matching guide
        const guide = findMatchingGuide(name, index.guides);

        if (!guide) {
          setError(`No propagation guide found for "${name}"`);
          setContent(null);
          setMetadata(null);
          setIsLoading(false);
          return;
        }

        // Load guide content
        const guideContent = await loadPropagationGuideContent(guide.file);

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

    loadGuide(speciesName);

    return () => {
      isCancelled = true;
    };
  }, [speciesName]);

  return { content, metadata, isLoading, error };
}

/**
 * Utility function to get the propagation guide index (for use in components)
 */
export async function getPropagationGuideIndex(): Promise<PropagationGuideIndex> {
  return loadPropagationGuideIndex();
}

/**
 * Clear the propagation guide cache (for testing or refresh)
 */
export function clearPropagationGuideCache(): void {
  propagationIndexCache = null;
  propagationContentCache.clear();
}
