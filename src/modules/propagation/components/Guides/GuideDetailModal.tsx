/**
 * GuideDetailModal - Modal for viewing propagation guide content
 *
 * Displays markdown guide content with metadata badges for species guides,
 * method guides, and getting started guides.
 *
 * Uses the shared Modal rather than a hand-rolled overlay. The previous version was a plain
 * div, which meant no role, no aria-modal, no Escape handling and no focus trap - a keyboard
 * or screen-reader user could tab straight out of it into the page behind, and had no way to
 * dismiss it except finding the close button. The shared Modal is a native <dialog> using
 * showModal(), which gets all of that for free.
 *
 * The badges moved from the header into the body, because Modal takes a plain string title.
 * They read the same; they are just below the heading rather than beside it.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '@/components/ui';
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

const badge = 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium';

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

  const title = selectedGettingStarted
    ? `${selectedGettingStarted.icon} ${selectedGettingStarted.title}`
    : (selectedMethod?.name ?? selectedGuide?.name ?? 'Guide');

  return (
    <Modal isOpen onClose={onClose} title={title} size="3xl">
      <div className="p-4">
        {selectedGettingStarted && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {selectedGettingStarted.description}
          </p>
        )}

        {selectedMethod && (
          <div className="flex gap-2 mb-4">
            <span className={`${badge} ${getDifficultyColor(selectedMethod.difficulty)}`}>
              {selectedMethod.difficulty}
            </span>
            <span className={`${badge} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
              Method Guide
            </span>
          </div>
        )}

        {selectedGuide && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`${badge} ${getDifficultyColor(selectedGuide.difficulty)}`}>
              {selectedGuide.difficulty}
            </span>
            <span className={`${badge} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
              {selectedGuide.bestMethod}
            </span>
            <span className={`${badge} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400`}>
              {selectedGuide.timeToRoot}
            </span>
            <span className={`${badge} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
              {selectedGuide.successRate}
            </span>
          </div>
        )}

        <div className="overflow-y-auto">
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
    </Modal>
  );
}

export type { GettingStartedGuide };
