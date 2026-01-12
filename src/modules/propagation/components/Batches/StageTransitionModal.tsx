/**
 * StageTransitionModal - Modal for advancing batch stages or recording failures
 *
 * A reusable modal component that handles two modes:
 * - 'advance': Advance a batch to its next valid stage
 * - 'fail': Record batch failure with required reason
 *
 * Features:
 * - Shows current stage prominently
 * - Stage selector with only valid next stages
 * - Quantity input with quick decrement buttons
 * - Notes textarea (optional)
 * - Confirmation step before submit
 * - Success feedback and auto-close
 *
 * Used by BatchDetail.tsx and BatchList.tsx action buttons.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useBatches } from '../../stores/useBatches';
import { useStageTransitions } from '../../stores/useStageTransitions';
import type { PropagationStage, FailureReason, PropBatchWithComputed } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  getValidNextStages,
} from '../../utils/stageHelpers';

// ============================================
// TYPES
// ============================================

export type TransitionMode = 'advance' | 'fail';

export interface StageTransitionModalProps {
  /** The batch ID to transition */
  batchId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** The transition mode - 'advance' for stage progression, 'fail' for recording failure */
  mode: TransitionMode;
  /** Optional callback after successful transition */
  onSuccess?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Display names for failure reasons.
 */
const FAILURE_REASON_OPTIONS: Array<{ value: FailureReason; label: string; description: string }> = [
  { value: 'rot', label: 'Rot', description: 'Fungal or bacterial rot' },
  { value: 'dried_out', label: 'Dried Out', description: 'Insufficient moisture' },
  { value: 'disease', label: 'Disease', description: 'Pathogen infection' },
  { value: 'pest', label: 'Pest Damage', description: 'Insect or pest damage' },
  { value: 'no_roots', label: 'No Root Development', description: 'Failed to develop roots' },
  { value: 'transplant_shock', label: 'Transplant Shock', description: 'Died after potting/moving' },
  { value: 'environmental', label: 'Environmental', description: 'Temperature/humidity issues' },
  { value: 'unknown', label: 'Unknown', description: 'Cause not determined' },
];

/**
 * Quick decrement amounts for quantity input.
 */
const QUICK_DECREMENTS = [1, 5, 10];

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Batch info header showing species and current stage.
 */
function BatchInfoHeader({ batch }: { batch: PropBatchWithComputed }) {
  const stageColors = getStageColors(batch.stage);

  return (
    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 mb-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">
            {batch.batchNumber}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {batch.species}
            {batch.variety && <span className="text-slate-400"> - {batch.variety}</span>}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${stageColors.bg} ${stageColors.text}`}
          >
            {getStageDisplayName(batch.stage)}
          </span>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {batch.quantitySurviving} / {batch.quantityStarted} surviving
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stage selector for advance mode.
 */
function StageSelector({
  validStages,
  selectedStage,
  onSelect,
}: {
  validStages: PropagationStage[];
  selectedStage: PropagationStage | '';
  onSelect: (stage: PropagationStage) => void;
}) {
  // Filter out 'failed' from advance mode options
  const advanceStages = validStages.filter((s) => s !== 'failed');

  if (advanceStages.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 dark:text-slate-400">
        No valid next stages available.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {advanceStages.map((stage) => {
        const colors = getStageColors(stage);
        const isSelected = selectedStage === stage;

        return (
          <button
            key={stage}
            type="button"
            onClick={() => onSelect(stage)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
              isSelected
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}
            />
            <span
              className={`flex-1 text-left font-medium ${
                isSelected
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {getStageDisplayName(stage)}
            </span>
            {isSelected && (
              <svg
                className="w-5 h-5 text-primary-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Quantity input with quick decrement buttons.
 */
function QuantityInput({
  quantity,
  maxQuantity,
  onChange,
}: {
  quantity: number;
  maxQuantity: number;
  onChange: (value: number) => void;
}) {
  const handleDecrement = (amount: number) => {
    const newValue = Math.max(0, quantity - amount);
    onChange(newValue);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Quantity Surviving
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChange(Math.min(Math.max(0, val), maxQuantity));
            }
          }}
          min={0}
          max={maxQuantity}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {QUICK_DECREMENTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleDecrement(amount)}
            disabled={quantity === 0}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            -{amount}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Maximum: {maxQuantity} (originally started)
      </p>
    </div>
  );
}

/**
 * Failure reason selector for fail mode.
 */
function FailureReasonSelector({
  selectedReason,
  onSelect,
}: {
  selectedReason: FailureReason | '';
  onSelect: (reason: FailureReason) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Failure Reason <span className="text-red-500">*</span>
      </label>
      <div className="space-y-2">
        {FAILURE_REASON_OPTIONS.map((option) => {
          const isSelected = selectedReason === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                isSelected
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <div className="flex-1 text-left">
                <div
                  className={`font-medium ${
                    isSelected
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {option.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {option.description}
                </div>
              </div>
              {isSelected && (
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Confirmation step before submission.
 */
function ConfirmationStep({
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

/**
 * Success feedback display.
 */
function SuccessFeedback({
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

// ============================================
// MAIN COMPONENT
// ============================================

export function StageTransitionModal({
  batchId,
  isOpen,
  onClose,
  mode,
  onSuccess,
}: StageTransitionModalProps) {
  // Stores
  const { getBatchById, advanceStage, markFailed } = useBatches();
  const { addTransition } = useStageTransitions();

  // Form state
  const [selectedStage, setSelectedStage] = useState<PropagationStage | ''>('');
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [failureReason, setFailureReason] = useState<FailureReason | ''>('');

  // UI state
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get batch data
  const batch = useMemo(() => getBatchById(batchId), [batchId, getBatchById]);

  // Get valid next stages
  const validNextStages = useMemo(
    () => (batch ? getValidNextStages(batch.stage) : []),
    [batch]
  );

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isOpen && batch) {
      setSelectedStage(
        mode === 'advance'
          ? validNextStages.filter((s) => s !== 'failed')[0] || ''
          : ''
      );
      setQuantity(batch.quantitySurviving);
      setNotes('');
      setFailureReason('');
      setStep('form');
      setError(null);
    }
  }, [isOpen, batch, mode, validNextStages]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!batch) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'advance') {
        if (!selectedStage) {
          throw new Error('Please select a target stage');
        }

        // Advance the batch stage
        await advanceStage(batchId, selectedStage, quantity);

        // Record the transition in audit log
        await addTransition({
          batchId,
          toStage: selectedStage,
          quantityAfter: quantity,
          notes: notes || undefined,
        });
      } else {
        if (!failureReason) {
          throw new Error('Please select a failure reason');
        }

        // Mark batch as failed
        await markFailed(batchId, failureReason, notes || undefined);

        // Record the transition in audit log
        await addTransition({
          batchId,
          toStage: 'failed',
          quantityAfter: 0,
          failureReason,
          notes: notes || undefined,
        });
      }

      // Show success feedback
      setStep('success');

      // Call success callback and close after delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    batch,
    mode,
    selectedStage,
    quantity,
    notes,
    failureReason,
    batchId,
    advanceStage,
    markFailed,
    addTransition,
    onSuccess,
    onClose,
  ]);

  // Handle proceed to confirmation
  const handleProceedToConfirm = useCallback(() => {
    setError(null);

    if (mode === 'advance' && !selectedStage) {
      setError('Please select a target stage');
      return;
    }

    if (mode === 'fail' && !failureReason) {
      setError('Please select a failure reason');
      return;
    }

    setStep('confirm');
  }, [mode, selectedStage, failureReason]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Determine modal title
  const modalTitle = mode === 'advance' ? 'Advance Stage' : 'Record Failure';

  // Early return if batch not found
  if (!batch) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="md">
      {/* Success Step */}
      {step === 'success' && (
        <SuccessFeedback
          mode={mode}
          targetStage={selectedStage || undefined}
        />
      )}

      {/* Confirmation Step */}
      {step === 'confirm' && (
        <ConfirmationStep
          mode={mode}
          batch={batch}
          targetStage={selectedStage || undefined}
          quantity={quantity}
          failureReason={failureReason || undefined}
          onConfirm={handleSubmit}
          onBack={() => setStep('form')}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Form Step */}
      {step === 'form' && (
        <div className="space-y-5">
          {/* Batch Info Header */}
          <BatchInfoHeader batch={batch} />

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Advance Mode Form */}
          {mode === 'advance' && (
            <>
              {/* Stage Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Advance To
                </label>
                <StageSelector
                  validStages={validNextStages}
                  selectedStage={selectedStage}
                  onSelect={setSelectedStage}
                />
              </div>

              {/* Quantity Input */}
              <QuantityInput
                quantity={quantity}
                maxQuantity={batch.quantityStarted}
                onChange={setQuantity}
              />
            </>
          )}

          {/* Fail Mode Form */}
          {mode === 'fail' && (
            <>
              {/* Warning Banner */}
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  This will mark the entire batch as failed. All {batch.quantitySurviving} remaining propagules will be recorded as lost.
                </p>
              </div>

              {/* Failure Reason Selector */}
              <FailureReasonSelector
                selectedReason={failureReason}
                onSelect={setFailureReason}
              />
            </>
          )}

          {/* Notes (both modes) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder={
                mode === 'advance'
                  ? 'Any observations about this transition...'
                  : 'Additional details about the failure...'
              }
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToConfirm}
              disabled={
                (mode === 'advance' && !selectedStage) ||
                (mode === 'fail' && !failureReason)
              }
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'advance'
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
