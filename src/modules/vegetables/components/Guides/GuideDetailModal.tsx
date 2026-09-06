/**
 * GuideDetailModal - Full-screen modal for viewing a vegetable growing guide.
 *
 * Uses useVegetableGuide to fetch the markdown for the selected crop and
 * renders it with react-markdown + remark-gfm.
 *
 * Uses the shared Modal rather than a hand-rolled overlay. Propagation's guide modal is a
 * plain div, which means it is not announced as a dialog, cannot be dismissed with Escape,
 * and does not trap focus - so a keyboard or screen-reader user can tab straight out of it
 * into the page behind. The shared Modal is a native <dialog> with showModal(), which gets
 * all three for free. Propagation's has the same gap and is worth the same change.
 *
 * Handles three states beyond the happy path: loading, fetch error, and a
 * guide whose index `status` is still `stub` — some crops may not have
 * written content yet while other agents are populating the guide library,
 * and the modal should say so plainly rather than rendering an empty article.
 */

import { LoadingState } from '@/components/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '@/components/ui';
import { useVegetableGuide } from '@/lib/guides/useVegetableGuide';

interface GuideDetailModalProps {
  cropName: string | null;
  onClose: () => void;
}

export function GuideDetailModal({ cropName, onClose }: GuideDetailModalProps) {
  const { content, metadata, isLoading, error } = useVegetableGuide(cropName);

  if (!cropName) return null;

  const isStub = metadata?.status === 'stub';

  return (
    <Modal isOpen onClose={onClose} title={metadata?.name ?? cropName} size="3xl">
      <div className="p-4">
        {metadata && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {metadata.daysToMaturity} days to maturity
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 capitalize">
              {metadata.sowingMethod}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize">
              {metadata.difficulty}
            </span>
          </div>
        )}

        {/* Modal Content */}
        <div className="overflow-y-auto">
          {isLoading ? (
            <LoadingState className="py-12" />
          ) : error ? (
            <p className="text-center text-slate-500 py-8">Failed to load guide: {error}</p>
          ) : isStub ? (
            <p className="text-center text-slate-500 py-8">
              This guide hasn&apos;t been written yet. Check back soon — the growing guide for{' '}
              {metadata?.name ?? cropName} is still on its way.
            </p>
          ) : content ? (
            <article className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-sm prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-center text-slate-500 py-8">Failed to load guide content</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
