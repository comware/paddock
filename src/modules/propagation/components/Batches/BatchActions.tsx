/**
 * BatchActions - Propagule list display for exploded batches.
 *
 * Extracted from BatchDetail.tsx for code health.
 */

import type { PropPropaguleWithComputed } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils';
import { SectionHeader } from './BatchMetrics';

interface BatchPropagulesListProps {
  propagules: PropPropaguleWithComputed[];
}

export function BatchPropagulesList({ propagules }: BatchPropagulesListProps) {
  if (propagules.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No propagules found for this batch.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {propagules.length} individual propagule{propagules.length !== 1 ? 's' : ''} created from this batch
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {propagules.map((propagule) => {
          const propStageColors = getStageColors(propagule.stage);
          return (
            <div
              key={propagule.id}
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                  {propagule.propaguleNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${propStageColors.bg} ${propStageColors.text}`}
                >
                  {getStageDisplayName(propagule.stage)}
                </span>
              </div>
              {propagule.label && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {propagule.label}
                </div>
              )}
              {propagule.healthScore !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Health:</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {propagule.healthScore}/5
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Re-export SectionHeader for convenience
export { SectionHeader };
