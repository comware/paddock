/**
 * GraduationForm - Modal form for recording batch graduations
 *
 * Records the final disposition of propagules from a batch:
 * - Outcome type (personal_use, planted_garden, gifted, sold, composted)
 * - Quantity (partial or full graduation)
 * - Conditional fields based on outcome (recipient, location, price)
 * - Notes and graduation date
 *
 * Uses the useGraduations store for persistence.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { useBatches } from '../../stores/useBatches';
import { useGraduations } from '../../stores/useGraduations';
import type { GraduationOutcome } from '../../types';
import {
  BatchInfoHeader,
  OutcomeSelector,
  QuantitySelector,
  SuccessFeedback,
} from './GraduationFormParts';

// ============================================
// TYPES
// ============================================

export interface GraduationFormProps {
  /** The batch ID to graduate from */
  batchId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback after successful graduation */
  onSuccess?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GraduationForm({
  batchId,
  isOpen,
  onClose,
  onSuccess,
}: GraduationFormProps) {
  // Stores
  const { getBatchById, loadBatches } = useBatches();
  const { recordBatchGraduation, loadGraduations, getGiftRecipients } = useGraduations();

  // Form state
  const [outcome, setOutcome] = useState<GraduationOutcome | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [plantedLocation, setPlantedLocation] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [graduationDate, setGraduationDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // UI state
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get batch data
  const batch = useMemo(() => getBatchById(batchId), [batchId, getBatchById]);

  // Get previous gift recipients for autocomplete
  const previousRecipients = useMemo(() => getGiftRecipients(), [getGiftRecipients]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && batch) {
      setOutcome('');
      setQuantity(Math.min(1, batch.quantitySurviving));
      setRecipientName('');
      setRecipientContact('');
      setPlantedLocation('');
      setSalePrice('');
      setNotes('');
      setGraduationDate(format(new Date(), 'yyyy-MM-dd'));
      setStep('form');
      setError(null);
    }
  }, [isOpen, batch]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!batch || !outcome) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await recordBatchGraduation(batchId, quantity, outcome, {
        recipientName: outcome === 'gifted' ? recipientName || undefined : undefined,
        recipientContact:
          outcome === 'gifted' ? recipientContact || undefined : undefined,
        plantedLocation:
          outcome === 'planted_garden' ? plantedLocation || undefined : undefined,
        salePrice:
          outcome === 'sold' && salePrice
            ? parseFloat(salePrice)
            : undefined,
        notes: notes || undefined,
        graduationDate: new Date(graduationDate),
      });

      // Reload data
      await loadBatches();
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
    outcome,
    batchId,
    quantity,
    recipientName,
    recipientContact,
    plantedLocation,
    salePrice,
    notes,
    graduationDate,
    recordBatchGraduation,
    loadBatches,
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

  // Validation
  const canSubmit = useMemo(() => {
    if (!outcome) return false;
    if (quantity < 1) return false;
    if (outcome === 'gifted' && !recipientName.trim()) return false;
    return true;
  }, [outcome, quantity, recipientName]);

  // Early return if batch not found
  if (!batch) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Graduate Plants" size="lg">
      {/* Success Step */}
      {step === 'success' && outcome && (
        <SuccessFeedback quantity={quantity} outcome={outcome} />
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
          <OutcomeSelector selectedOutcome={outcome} onSelect={setOutcome} />

          {/* Quantity Selector */}
          <QuantitySelector
            quantity={quantity}
            maxQuantity={batch.quantitySurviving}
            onChange={setQuantity}
          />

          {/* Conditional Fields */}
          {outcome === 'gifted' && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Gift Details
              </h4>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  list="previous-recipients"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Who received this plant?"
                />
                {previousRecipients.length > 0 && (
                  <datalist id="previous-recipients">
                    {previousRecipients.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Contact Info{' '}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Email or phone for follow-up"
                />
              </div>
            </div>
          )}

          {outcome === 'planted_garden' && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Planted Location{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={plantedLocation}
                onChange={(e) => setPlantedLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Where in the garden was it planted?"
              />
            </div>
          )}

          {outcome === 'sold' && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Sale Price{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Graduation Date
            </label>
            <input
              type="date"
              value={graduationDate}
              onChange={(e) => setGraduationDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

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
              placeholder="Any additional notes about this graduation..."
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
              disabled={!canSubmit || isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Graduate'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
