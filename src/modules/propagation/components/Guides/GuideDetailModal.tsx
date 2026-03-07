/**
 * GuideDetailModal - Full-screen modal for viewing propagation guide content
 *
 * Displays markdown guide content with metadata badges for species guides,
 * method guides, and getting started guides.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PropagationGuideMetadata, PropagationMethodMetadata } from '@/lib/guides/propagation-types';

interface GettingStartedGuide {
  id: string;
  title: string;
  description: string;
  icon: string;
  file: string;
}

interface GuideDetailModalProps {
  selectedGuide: PropagationGuideMetadata | null;
  selectedMethod: PropagationMethodMetadata | null;
  selectedGettingStarted: GettingStartedGuide | null;
  guideContent: string | null;
  loadingContent: boolean;
  onClose: () => void;
  getDifficultyColor: (difficulty: string) => string;
}

export function GuideDetailModal({
  selectedGuide,
  selectedMethod,
  selectedGettingStarted,
  guideContent,
  loadingContent,
  onClose,
  getDifficultyColor,
}: GuideDetailModalProps) {
  if (!selectedGuide && !selectedMethod && !selectedGettingStarted) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            {selectedGettingStarted ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedGettingStarted.icon}</span>
                  {selectedGettingStarted.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedGettingStarted.description}
                </p>
              </>
            ) : selectedMethod ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedMethod.name}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(selectedMethod.difficulty)}`}>
                    {selectedMethod.difficulty}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Method Guide
                  </span>
                </div>
              </>
            ) : selectedGuide && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedGuide.name}</h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(selectedGuide.difficulty)}`}>
                    {selectedGuide.difficulty}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {selectedGuide.bestMethod}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    {selectedGuide.timeToRoot}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {selectedGuide.successRate}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loadingContent ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : guideContent ? (
            <article className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-sm prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{guideContent}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-center text-slate-500 py-8">Failed to load guide content</p>
          )}
        </div>
      </div>
    </div>
  );
}

export type { GettingStartedGuide };
