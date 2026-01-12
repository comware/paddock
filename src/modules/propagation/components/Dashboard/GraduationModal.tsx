/**
 * GraduationModal - Modal for graduating batches from the dashboard
 *
 * Allows users to record graduation outcomes for batches in "ready" stage:
 * - Select outcome (planted, gifted, sold, personal use, composted)
 * - Specify quantity to graduate
 * - Add optional details (recipient, location, notes)
 *
 * Integrates with useGraduations store for recording graduations.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useBatches } from '../../stores/useBatches';
import { useGraduations } from '../../stores/useGraduations';
import type { GraduationOutcome, PropBatchWithComputed } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils/stageHelpers';

// ============================================
// TYPES
// ============================================

export interface GraduationModalProps {
  /** The batch ID to graduate */
  batchId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback after successful graduation */
  onSuccess?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Graduation outcome options with display info.
 */
const OUTCOME_OPTIONS: Array<{
  value: GraduationOutcome;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'planted_garden',
    label: 'Planted in Garden',
    icon: '~',
    description: 'Planted in your landscape or garden',
  },
  {
    value: 'gifted',
    label: 'Gifted',
    icon: '!',
    description: 'Given to a friend or family member',
  },
  {
    value: 'sold',
    label: 'Sold',
    icon: '$',
    description: 'Sold at market or to a customer',
  },
  {
    value: 'personal_use',
    label: 'Personal Use',
    icon: '*',
    description: 'Kept for your own use',
  },
  {
    value: 'composted',
    label: 'Composted',
    icon: '#',
    description: 'Did not survive to graduation',
  },
];

/**
 * Quick quantity buttons for common amounts.
 */
const QUICK_QUANTITIES = [1, 5, 10];

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
            {batch.quantitySurviving} available to graduate
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Outcome selector buttons.
 */
function OutcomeSelector({
  selectedOutcome,
  onSelect,
}: {
  selectedOutcome: GraduationOutcome | '';
  onSelect: (outcome: GraduationOutcome) => void;
}) {
  return (
    <div className="space-y-2">
      {OUTCOME_OPTIONS.map((option) => {
        const isSelected = selectedOutcome === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
              isSelected
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            <span className="text-xl">{option.icon}</span>
            <div className="flex-1 text-left">
              <div
                className={`font-medium ${
                  isSelected
                    ? 'text-primary-700 dark:text-primary-300'
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
 * Quantity input with quick select buttons.
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
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Quantity to Graduate
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChange(Math.min(Math.max(1, val), maxQuantity));
            }
          }}
          min={1}
          max={maxQuantity}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {QUICK_QUANTITIES.filter((q) => q <= maxQuantity).map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(amount)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              quantity === amount
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'
            }`}
          >
            {amount}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(maxQuantity)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            quantity === maxQuantity
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'
          }`}
        >
          All
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Maximum: {maxQuantity} available
      </p>
    </div>
  );
}

/**
 * Success feedback display.
 */
function SuccessFeedback({
  quantity,
  outcome,
}: {
  quantity: number;
  outcome: GraduationOutcome;
}) {
  const outcomeLabel = OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label;

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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Graduation Recorded
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {quantity} propagule{quantity !== 1 ? 's' : ''} recorded as "{outcomeLabel}".
      </p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GraduationModal({
  batchId,
  isOpen,
  onClose,
  onSuccess,
}: GraduationModalProps) {
  // Stores
  const { getBatchById } = useBatches();
  const { recordBatchGraduation, loadGraduations } = useGraduations();

  // Form state
  const [selectedOutcome, setSelectedOutcome] = useState<GraduationOutcome | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [plantedLocation, setPlantedLocation] = useState('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [notes, setNotes] = useState('');

  // UI state
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get batch data
  const batch = useMemo(() => getBatchById(batchId), [batchId, getBatchById]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && batch) {
      setSelectedOutcome('');
      setQuantity(Math.min(1, batch.quantitySurviving));
      setRecipientName('');
      setPlantedLocation('');
      setSalePrice('');
      setNotes('');
      setStep('form');
      setError(null);
    }
  }, [isOpen, batch]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!batch || !selectedOutcome) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await recordBatchGraduation(batchId, quantity, selectedOutcome, {
        recipientName: recipientName || undefined,
        plantedLocation: plantedLocation || undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        notes: notes || undefined,
      });

      // Reload graduations data
      await loadGraduations();

      // Show success feedback
      setStep('success');

      // Call success callback and close after delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    batch,
    batchId,
    selectedOutcome,
    quantity,
    recipientName,
    plantedLocation,
    salePrice,
    notes,
    recordBatchGraduation,
    loadGraduations,
    onSuccess,
    onClose,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Early return if batch not found or not in ready stage
  if (!batch) {
    return null;
  }

  // Show context fields based on outcome
  const showRecipientField = selectedOutcome === 'gifted';
  const showLocationField = selectedOutcome === 'planted_garden';
  const showPriceField = selectedOutcome === 'sold';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Graduate Batch" size="md">
      {/* Success Step */}
      {step === 'success' && selectedOutcome && (
        <SuccessFeedback quantity={quantity} outcome={selectedOutcome} />
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

          {/* Outcome Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Graduation Outcome <span className="text-red-500">*</span>
            </label>
            <OutcomeSelector
              selectedOutcome={selectedOutcome}
              onSelect={setSelectedOutcome}
            />
          </div>

          {/* Quantity Input */}
          {batch.quantitySurviving > 1 && (
            <QuantityInput
              quantity={quantity}
              maxQuantity={batch.quantitySurviving}
              onChange={setQuantity}
            />
          )}

          {/* Context Fields Based on Outcome */}
          {showRecipientField && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Who did you gift this to?"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {showLocationField && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Planting Location
              </label>
              <input
                type="text"
                value={plantedLocation}
                onChange={(e) => setPlantedLocation(e.target.value)}
                placeholder="Where in your garden?"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {showPriceField && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sale Price
              </label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.01}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedOutcome || isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Graduation'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
