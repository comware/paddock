import { useState, useEffect } from 'react';
import type { GuideIndex, GuideMetadata } from './types';

interface UseGrowingGuideResult {
  content: string | null;
  metadata: GuideMetadata | null;
  isLoading: boolean;
  error: string | null;
}

// Cache for guide index and content
let guideIndexCache: GuideIndex | null = null;
const contentCache = new Map<string, string>();

// Alias mapping for varieties with different names
const VARIETY_ALIASES: Record<string, string> = {
  'Pak Choi': 'Bok Choy',
  'Pak choi': 'Bok Choy',
  'pak choi': 'Bok Choy',
  'Mustard': 'Mustard (Red)',
  'mustard': 'Mustard (Red)',
};

/**
 * Normalize a variety name for matching
 */
function normalizeVarietyName(name: string): string {
  return name.toLowerCase().trim().replace(/[()]/g, '');
}

/**
 * Find a guide matching the variety name using fuzzy matching
 */
function findMatchingGuide(
  varietyName: string,
  guides: GuideMetadata[]
): GuideMetadata | null {
  if (!varietyName) return null;

  // Check aliases first
  const aliasedName = VARIETY_ALIASES[varietyName] || varietyName;
  
  // 1. Try exact match
  let match = guides.find(g => g.name === aliasedName);
  if (match) return match;

  // 2. Try case-insensitive exact match
  const lowerName = aliasedName.toLowerCase();
  match = guides.find(g => g.name.toLowerCase() === lowerName);
  if (match) return match;

  // 3. Try partial match (variety name is start of guide name)
  match = guides.find(g => 
    g.name.toLowerCase().startsWith(lowerName)
  );
  if (match) return match;

  // 4. Try normalized match (remove parentheses and compare)
  const normalizedSearch = normalizeVarietyName(aliasedName);
  match = guides.find(g => 
    normalizeVarietyName(g.name) === normalizedSearch
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
 * Load the guide index from the public directory
 */
async function loadGuideIndex(): Promise<GuideIndex> {
  if (guideIndexCache) {
    return guideIndexCache;
  }

  const response = await fetch('/guides/index.json');
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

  const response = await fetch(`/guides/${filePath}`);
  if (!response.ok) {
    throw new Error(`Failed to load guide: ${filePath}`);
  }

  const content = await response.text();
  contentCache.set(filePath, content);
  return content;
}

/**
 * Hook to load growing guide for a variety
 */
export function useGrowingGuide(varietyName: string | null): UseGrowingGuideResult {
  const [content, setContent] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<GuideMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!varietyName) {
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

    loadGuide(varietyName);

    return () => {
      isCancelled = true;
    };
  }, [varietyName]);

  return { content, metadata, isLoading, error };
}
