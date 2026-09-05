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
import type { GraduationOutcome } from '../../types';
import { PlantingPicker } from '../shared/PlantingPicker';
import {
  BatchInfoHeader,
  OutcomeSelector,
  QuantityInput,
  SuccessFeedback,
} from './GraduationModalParts';

// ============================================
// TYPES
// ============================================

export interface GraduationModalProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
  const [plantingId, setPlantingId] = useState<string | undefined>(undefined);
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
      setPlantingId(undefined);
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
        plantingId: selectedOutcome === 'planted_garden' ? plantingId : undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        notes: notes || undefined,
      });

      await loadGraduations();
      setStep('success');

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
    batch, batchId, selectedOutcome, quantity,
    recipientName, plantedLocation, plantingId, salePrice, notes,
    recordBatchGraduation, loadGraduations, onSuccess, onClose,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  if (!batch) {
    return null;
  }

  const showRecipientField = selectedOutcome === 'gifted';
  const showLocationField = selectedOutcome === 'planted_garden';
  const showPriceField = selectedOutcome === 'sold';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Graduate Batch" size="md">
      {step === 'success' && selectedOutcome && (
        <SuccessFeedback quantity={quantity} outcome={selectedOutcome} />
      )}

      {step === 'form' && (
        <div className="space-y-5">
          <BatchInfoHeader batch={batch} />

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Graduation Outcome <span className="text-red-500">*</span>
            </label>
            <OutcomeSelector
              selectedOutcome={selectedOutcome}
              onSelect={setSelectedOutcome}
            />
          </div>

          {batch.quantitySurviving > 1 && (
            <QuantityInput
              quantity={quantity}
              maxQuantity={batch.quantitySurviving}
              onChange={setQuantity}
            />
          )}

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
            <div className="space-y-4">
              <PlantingPicker
                siteId={batch.siteId}
                value={plantingId}
                onChange={setPlantingId}
              />
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
