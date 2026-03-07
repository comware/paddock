/** StageTransitionModal - Modal for advancing batch stages or recording failures. */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useBatches } from '../../stores/useBatches';
import { useStageTransitions } from '../../stores/useStageTransitions';
import type { PropagationStage, FailureReason } from '../../types';
import { getValidNextStages } from '../../utils/stageHelpers';
import { BatchInfoHeader, StageSelector, QuantityInput, FailureReasonSelector } from './TransitionChecklist';
import { ConfirmationStep, SuccessFeedback } from './TransitionMetrics';

export type TransitionMode = 'advance' | 'fail';

export interface StageTransitionModalProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  mode: TransitionMode;
  onSuccess?: () => void;
}

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

        await advanceStage(batchId, selectedStage, quantity);

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

        await markFailed(batchId, failureReason, notes || undefined);

        await addTransition({
          batchId,
          toStage: 'failed',
          quantityAfter: 0,
          failureReason,
          notes: notes || undefined,
        });
      }

      setStep('success');

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
    batch, mode, selectedStage, quantity, notes, failureReason,
    batchId, advanceStage, markFailed, addTransition, onSuccess, onClose,
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
          <BatchInfoHeader batch={batch} />

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {mode === 'advance' && (
            <>
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

              <QuantityInput
                quantity={quantity}
                maxQuantity={batch.quantityStarted}
                onChange={setQuantity}
              />
            </>
          )}

          {mode === 'fail' && (
            <>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  This will mark the entire batch as failed. All {batch.quantitySurviving} remaining propagules will be recorded as lost.
                </p>
              </div>

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
