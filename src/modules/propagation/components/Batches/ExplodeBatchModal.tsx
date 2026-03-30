/**
 * ExplodeBatchModal - Modal for converting a batch into individual propagules
 *
 * Allows users to "explode" a batch into individual propagule records for
 * high-value plants where each cutting needs individual tracking.
 *
 * Features:
 * - Shows batch info and current surviving count
 * - Explains implications of exploding
 * - Warning that batch becomes read-only after
 * - Preview of propagule numbers to be generated
 * - Confirmation step before execution
 * - Success feedback with link to propagules
 *
 * Used by BatchDetail.tsx for high-value plant tracking.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useBatches } from '../../stores/useBatches';
import { usePropagules } from '../../stores/usePropagules';
import type { PropBatchWithComputed } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils/stageHelpers';

// ============================================
// TYPES
// ============================================

export interface ExplodeBatchModalProps {
  /** The batch ID to explode */
  batchId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback after successful explosion */
  onSuccess?: (propaguleIds: string[]) => void;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Batch info header showing species, stage, and quantities.
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
 * Preview of propagule numbers that will be generated.
 */
function PropaguleNumberPreview({
  batchNumber,
  count,
}: {
  batchNumber: string;
  count: number;
}) {
  // Generate preview numbers
  const previewNumbers = useMemo(() => {
    const numbers: string[] = [];
    const showCount = Math.min(count, 5);
    for (let i = 1; i <= showCount; i++) {
      numbers.push(`${batchNumber}-${i.toString().padStart(2, '0')}`);
    }
    return numbers;
  }, [batchNumber, count]);

  return (
    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
        Propagule Numbers Preview
      </h4>
      <div className="flex flex-wrap gap-2">
        {previewNumbers.map((num) => (
          <span
            key={num}
            className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 text-sm font-mono"
          >
            {num}
          </span>
        ))}
        {count > 5 && (
          <span className="px-2 py-1 text-blue-600 dark:text-blue-400 text-sm">
            ... and {count - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Implications warning section.
 */
function ImplicationsWarning() {
  return (
    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Important Information
      </h4>
      <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
        <li>Each surviving propagule will get its own record</li>
        <li>Individual tracking allows health scores, measurements, and photos per propagule</li>
        <li>The batch will become read-only after explosion</li>
        <li>Stage transitions and failures will be tracked per propagule</li>
        <li>This action cannot be undone</li>
      </ul>
    </div>
  );
}

/**
 * Confirmation step before explosion.
 */
function ConfirmationStep({
  batch,
  count,
  onConfirm,
  onBack,
  isSubmitting,
}: {
  batch: PropBatchWithComputed;
  count: number;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800">
        <div className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
          Confirm Batch Explosion
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-purple-600 dark:text-purple-400">Batch:</span>
            <span className="text-purple-800 dark:text-purple-200 font-medium">
              {batch.batchNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-600 dark:text-purple-400">Species:</span>
            <span className="text-purple-800 dark:text-purple-200">
              {batch.species}
              {batch.variety && ` - ${batch.variety}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-600 dark:text-purple-400">Current Stage:</span>
            <span className="text-purple-800 dark:text-purple-200">
              {getStageDisplayName(batch.stage)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-600 dark:text-purple-400">
              Propagules to Create:
            </span>
            <span className="text-purple-800 dark:text-purple-200 font-bold">
              {count}
            </span>
          </div>
        </div>
      </div>

      {/* Final warning */}
      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
        <p className="text-sm text-orange-800 dark:text-orange-200">
          <strong>Warning:</strong> This will create {count} individual propagule records and
          mark the batch as exploded. The batch will become read-only and can no longer be
          modified directly. This action cannot be undone.
        </p>
      </div>

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
          className="flex-1 px-4 py-2.5 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Propagules...' : 'Confirm Explosion'}
        </button>
      </div>
    </div>
  );
}

/**
 * Success feedback display.
 */
function SuccessFeedback({ count }: { count: number }) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
        <svg
          className="w-8 h-8 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Batch Exploded Successfully
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {count} individual propagule{count !== 1 ? 's' : ''} created.
        <br />
        You can now track each one independently.
      </p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExplodeBatchModal({
  batchId,
  isOpen,
  onClose,
  onSuccess,
}: ExplodeBatchModalProps) {
  // Stores
  const { getBatchById, loadBatches } = useBatches();
  const { explodeBatch } = usePropagules();

  // UI state
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  // Get batch data
  const batch = useMemo(() => getBatchById(batchId), [batchId, getBatchById]);

  // Count of propagules to create
  const propaguleCount = batch?.quantitySurviving ?? 0;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError(null);
      setCreatedCount(0);
    }
  }, [isOpen]);

  // Handle explosion submission
  const handleSubmit = useCallback(async () => {
    if (!batch) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Explode the batch
      const propaguleIds = await explodeBatch(batch, propaguleCount);

      // Reload batches to get updated isExploded status
      await loadBatches();

      // Set success state
      setCreatedCount(propaguleIds.length);
      setStep('success');

      // Call success callback and close after delay
      setTimeout(() => {
        onSuccess?.(propaguleIds);
        onClose();
      }, 2000);
    } catch (err) {
      setError((err as Error).message || 'Failed to explode batch');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  }, [batch, propaguleCount, explodeBatch, loadBatches, onSuccess, onClose]);

  // Handle proceed to confirmation
  const handleProceedToConfirm = useCallback(() => {
    setError(null);
    setStep('confirm');
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Early return if batch not found
  if (!batch) {
    return null;
  }

  // Check if already exploded
  if (batch.isExploded) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Batch Already Exploded" size="md">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            This batch has already been exploded
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Individual propagules have already been created from this batch.
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  // Check if batch has surviving propagules
  if (propaguleCount === 0) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Cannot Explode Batch" size="md">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No surviving propagules
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            This batch has no surviving propagules to convert to individual records.
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Explode Batch to Individuals" size="lg">
      {/* Success Step */}
      {step === 'success' && <SuccessFeedback count={createdCount} />}

      {/* Confirmation Step */}
      {step === 'confirm' && (
        <ConfirmationStep
          batch={batch}
          count={propaguleCount}
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

          {/* Propagule Count Info */}
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">
                Propagules to create:
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {propaguleCount}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Based on current surviving count
            </p>
          </div>

          {/* Propagule Number Preview */}
          <PropaguleNumberPreview batchNumber={batch.batchNumber} count={propaguleCount} />

          {/* Implications Warning */}
          <ImplicationsWarning />

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
              className="flex-1 px-4 py-2.5 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
