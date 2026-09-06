/**
 * GuideDetailModal - Full-screen modal for viewing a vegetable growing guide.
 *
 * Uses useVegetableGuide to fetch the markdown for the selected crop and
 * renders it with react-markdown + remark-gfm, matching the propagation
 * module's guide modal (src/modules/propagation/components/Guides/GuideDetailModal.tsx).
 *
 * Handles three states beyond the happy path: loading, fetch error, and a
 * guide whose index `status` is still `stub` — some crops may not have
 * written content yet while other agents are populating the guide library,
 * and the modal should say so plainly rather than rendering an empty article.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {metadata?.name ?? cropName}
            </h2>
            {metadata && (
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {metadata.daysToMaturity} days to maturity
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {metadata.sowingMethod}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {metadata.difficulty}
                </span>
              </div>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
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
    </div>
  );
}
