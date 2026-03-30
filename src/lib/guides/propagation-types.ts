/**
 * Propagation Guide Types
 *
 * Type definitions for propagation guide metadata and index.
 * Similar structure to growing guides but with propagation-specific fields.
 */

export interface PropagationGuideMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: 'very-easy' | 'easy' | 'intermediate' | 'advanced';
  bestMethod: string;
  timeToRoot: string;
  successRate: string;
  file: string;
}

export interface PropagationMethodMetadata {
  id: string;
  name: string;
  difficulty: string;
  file: string;
  status: 'complete' | 'planned';
}

export interface PropagationGuideCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface PropagationGuideIndex {
  version: string;
  lastUpdated: string;
  categories: PropagationGuideCategory[];
  methods: PropagationMethodMetadata[];
  guides: PropagationGuideMetadata[];
}
