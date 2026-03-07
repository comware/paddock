/**
 * PropaguleObservations - Transition history and stage timeline for propagules.
 *
 * Extracted from PropaguleDetail.tsx for code health.
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { useStageTransitions } from '../../stores/useStageTransitions';
import type { PropagationStage, FailureReason } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
} from '../../utils';
import { FAILURE_REASON_NAMES } from './PropaguleInfo';

// ============================================
// TRANSITION HISTORY
// ============================================

/**
 * Transition History for propagule.
 */
export function PropaguleTransitionHistory({
  propaguleId,
}: {
  propaguleId: string;
}) {
  const { transitions } = useStageTransitions();

  const propaguleTransitions = useMemo(() => {
    return transitions
      .filter((t) => t.propaguleId === propaguleId)
      .sort((a, b) => new Date(b.transitionDate).getTime() - new Date(a.transitionDate).getTime());
  }, [transitions, propaguleId]);

  if (propaguleTransitions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No transition history recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {propaguleTransitions.map((transition) => (
        <div
          key={transition.id}
          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {transition.fromStage ? (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStageColors(transition.fromStage).bg} ${getStageColors(transition.fromStage).text}`}>
                    {getStageDisplayName(transition.fromStage)}
                  </span>
                  <span className="text-slate-400">-&gt;</span>
                </>
              ) : null}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStageColors(transition.toStage).bg} ${getStageColors(transition.toStage).text}`}>
                {getStageDisplayName(transition.toStage)}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {format(new Date(transition.transitionDate), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          {/* Failure reason */}
          {transition.failureReason && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Reason: {FAILURE_REASON_NAMES[transition.failureReason as FailureReason]}
            </div>
          )}

          {/* Notes */}
          {transition.notes && (
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">
              "{transition.notes}"
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// STAGE TIMELINE
// ============================================

/**
 * Simple Stage Timeline for propagule (vertical).
 */
export function PropaguleStageTimeline({
  currentStage,
  createdAt: _createdAt,
}: {
  currentStage: PropagationStage;
  createdAt: Date;
}) {
  const stages: PropagationStage[] = [
    'taken',
    'rooting',
    'rooted',
    'potted_up',
    'hardening',
    'ready',
    'graduated',
  ];

  const currentIndex = stages.indexOf(currentStage);
  const isFailed = currentStage === 'failed';

  return (
    <div className="py-2">
      {stages.map((stage, index) => {
        const isCompleted = !isFailed && index < currentIndex;
        const isCurrent = !isFailed && index === currentIndex;
        const isFuture = !isFailed && index > currentIndex;
        const colors = getStageColors(stage);

        return (
          <div key={stage} className="flex items-start gap-3">
            {/* Node and Connector */}
            <div className="flex flex-col items-center">
              {/* Node */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  isCompleted
                    ? `${colors.bg} ${colors.text}`
                    : isCurrent
                      ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ring-primary-500`
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              {/* Connector */}
              {index < stages.length - 1 && (
                <div
                  className={`w-0.5 h-10 ${
                    isCompleted || isCurrent
                      ? 'bg-primary-300 dark:bg-primary-600'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pt-1 pb-3">
              <div className={`font-medium ${isFuture ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                {getStageDisplayName(stage)}
              </div>
              {isCurrent && (
                <div className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  Current Stage
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Failed indicator if applicable */}
      {isFailed && (
        <div className="flex items-start gap-3 mt-2">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-800 border-2 border-red-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="pt-1">
            <div className="font-medium text-red-700 dark:text-red-400">
              Failed
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Propagule did not complete
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
