/**
 * Guide system type definitions
 *
 * These types match the structure of public/guides/index.json
 */

export interface GuideCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface GuideMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  daysToHarvest: number;
  blackoutDays: number;
  preSoak: boolean;
  file: string;
  status: 'complete' | 'draft';
}

export interface GuideIndex {
  version: string;
  lastUpdated: string;
  totalGuides: number;
  categories: GuideCategory[];
  guides: GuideMetadata[];
}

export interface GuideContent {
  metadata: GuideMetadata;
  content: string;
}

export interface UseGrowingGuideResult {
  content: string | null;
  metadata: GuideMetadata | null;
  isLoading: boolean;
  error: string | null;
}
