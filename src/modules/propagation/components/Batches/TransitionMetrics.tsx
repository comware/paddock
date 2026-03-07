/**
 * TransitionMetrics - Confirmation step and success feedback for stage transitions.
 *
 * Extracted from StageTransitionModal.tsx for code health.
 */

import type { PropagationStage, FailureReason, PropBatchWithComputed } from '../../types';
import { getStageDisplayName } from '../../utils/stageHelpers';
import { FAILURE_REASON_OPTIONS } from './TransitionChecklist';
import type { TransitionMode } from './StageTransitionModal';

// ============================================
// CONFIRMATION STEP
// ============================================

/**
 * Confirmation step before submission.
 */
export function ConfirmationStep({
  mode,
  batch,
  targetStage,
  quantity,
  failureReason,
  onConfirm,
  onBack,
  isSubmitting,
}: {
  mode: TransitionMode;
  batch: PropBatchWithComputed;
  targetStage?: PropagationStage;
  quantity: number;
  failureReason?: FailureReason;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const isAdvance = mode === 'advance';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div
        className={`p-4 rounded-lg border-2 ${
          isAdvance
            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div
          className={`text-lg font-semibold mb-2 ${
            isAdvance
              ? 'text-primary-800 dark:text-primary-200'
              : 'text-red-800 dark:text-red-200'
          }`}
        >
          {isAdvance ? 'Confirm Stage Advancement' : 'Confirm Batch Failure'}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isAdvance ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}>
              Batch:
            </span>
            <span className={isAdvance ? 'text-primary-800 dark:text-primary-200' : 'text-red-800 dark:text-red-200'}>
              {batch.batchNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isAdvance ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}>
              Current Stage:
            </span>
            <span className={isAdvance ? 'text-primary-800 dark:text-primary-200' : 'text-red-800 dark:text-red-200'}>
              {getStageDisplayName(batch.stage)}
            </span>
          </div>
          {isAdvance && targetStage && (
            <div className="flex justify-between">
              <span className="text-primary-600 dark:text-primary-400">New Stage:</span>
              <span className="text-primary-800 dark:text-primary-200 font-medium">
                {getStageDisplayName(targetStage)}
              </span>
            </div>
          )}
          {!isAdvance && failureReason && (
            <div className="flex justify-between">
              <span className="text-red-600 dark:text-red-400">Reason:</span>
              <span className="text-red-800 dark:text-red-200 font-medium">
                {FAILURE_REASON_OPTIONS.find((o) => o.value === failureReason)?.label}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className={isAdvance ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}>
              {isAdvance ? 'Surviving Quantity:' : 'Lost:'}
            </span>
            <span className={isAdvance ? 'text-primary-800 dark:text-primary-200' : 'text-red-800 dark:text-red-200'}>
              {isAdvance ? `${quantity} of ${batch.quantityStarted}` : `All ${batch.quantitySurviving} remaining`}
            </span>
          </div>
        </div>
      </div>

      {/* Warning for failure mode */}
      {!isAdvance && (
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <strong>Warning:</strong> This action will mark the entire batch as failed and set surviving quantity to 0. This cannot be undone.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isAdvance
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isSubmitting
            ? 'Processing...'
            : isAdvance
            ? 'Confirm Advancement'
            : 'Confirm Failure'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// SUCCESS FEEDBACK
// ============================================

/**
 * Success feedback display.
 */
export function SuccessFeedback({
  mode,
  targetStage,
}: {
  mode: TransitionMode;
  targetStage?: PropagationStage;
}) {
  return (
    <div className="text-center py-6">
      <div
        className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          mode === 'advance'
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }`}
      >
        <svg
          className={`w-8 h-8 ${
            mode === 'advance' ? 'text-green-500' : 'text-red-500'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {mode === 'advance' ? 'Stage Advanced' : 'Failure Recorded'}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {mode === 'advance' && targetStage
          ? `Batch successfully advanced to ${getStageDisplayName(targetStage)}.`
          : 'Batch has been marked as failed.'}
      </p>
    </div>
  );
}
