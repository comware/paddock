/**
 * GrowingGuidePanel - Displays variety-specific growing instructions
 *
 * Renders markdown guide content with metadata quick facts.
 */

import ReactMarkdown from 'react-markdown';
import { useGrowingGuide } from '@/lib/guides/useGrowingGuide';

interface GrowingGuidePanelProps {
  varietyName: string;
}

export function GrowingGuidePanel({ varietyName }: GrowingGuidePanelProps) {
  const { content, metadata, isLoading, error } = useGrowingGuide(varietyName);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading growing guide...</p>
      </div>
    );
  }

  // Error or not found state
  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        <svg
          className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <p className="text-sm font-medium mb-1">No guide available</p>
        <p className="text-xs text-center max-w-xs">
          We don't have a growing guide for "{varietyName}" yet.
          Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Facts Badge */}
      {metadata && (
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              metadata.difficulty === 'beginner'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : metadata.difficulty === 'intermediate'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {metadata.difficulty.charAt(0).toUpperCase() + metadata.difficulty.slice(1)}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {metadata.daysToHarvest} days to harvest
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {metadata.blackoutDays} days blackout
          </span>
          {metadata.preSoak && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              Pre-soak required
            </span>
          )}
        </div>
      )}

      {/* Guide Content */}
      <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
        <article className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-sm prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
