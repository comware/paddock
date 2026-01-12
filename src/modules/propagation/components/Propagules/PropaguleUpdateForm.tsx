/**
 * PropaguleUpdateForm - Modal form for updating propagule information
 *
 * Features:
 * - Health score input (1-5)
 * - Measurements (height, root count, leaf count)
 * - Photo upload placeholder
 * - Notes textarea
 * - Individual stage transition
 * - Failure recording with reason
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui';
import { usePropagules, type UpdatePropaguleInput, type MeasurementInput } from '../../stores';
import type { PropagationStage, FailureReason } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  getValidNextStages,
  isActiveStage,
} from '../../utils';

interface PropaguleUpdateFormProps {
  propaguleId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Mode determines which form section is shown */
  mode?: 'update' | 'advance' | 'fail';
}

/**
 * Display names for failure reasons.
 */
const FAILURE_REASON_NAMES: Record<FailureReason, string> = {
  rot: 'Rot (Fungal/Bacterial)',
  dried_out: 'Dried Out',
  disease: 'Disease',
  pest: 'Pest Damage',
  no_roots: 'No Root Development',
  transplant_shock: 'Transplant Shock',
  environmental: 'Environmental Issues',
  unknown: 'Unknown',
};

/**
 * Health score selector component.
 */
function HealthScoreSelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (score: number) => void;
}) {
  const scores = [1, 2, 3, 4, 5];
  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Health Score
      </label>
      <div className="flex gap-2">
        {scores.map((score, index) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-colors ${
              value === score
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title={labels[index]}
          >
            <div className="text-lg font-bold">{score}</div>
            <div className="text-xs truncate">{labels[index]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Measurement input field component.
 */
function MeasurementField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? undefined : Number(val));
          }}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400 w-12">{unit}</span>
      </div>
    </div>
  );
}

export function PropaguleUpdateForm({
  propaguleId,
  isOpen,
  onClose,
  mode = 'update',
}: PropaguleUpdateFormProps) {
  // Store
  const {
    getPropaguleById,
    updatePropagule,
    advanceStage,
    markFailed,
    recordMeasurements,
    updateHealthScore,
  } = usePropagules();

  // Get propagule data
  const propagule = getPropaguleById(propaguleId);

  // Form state
  const [healthScore, setHealthScore] = useState<number | undefined>(undefined);
  const [heightCm, setHeightCm] = useState<number | undefined>(undefined);
  const [stemDiameterMm, setStemDiameterMm] = useState<number | undefined>(undefined);
  const [leafCount, setLeafCount] = useState<number | undefined>(undefined);
  const [rootScore, setRootScore] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [label, setLabel] = useState('');

  // Stage transition state
  const [selectedStage, setSelectedStage] = useState<PropagationStage | null>(null);
  const [failureReason, setFailureReason] = useState<FailureReason>('unknown');
  const [failureNotes, setFailureNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with propagule data
  useEffect(() => {
    if (propagule) {
      setHealthScore(propagule.healthScore);
      setHeightCm(propagule.heightCm);
      setStemDiameterMm(propagule.stemDiameterMm);
      setLeafCount(propagule.leafCount);
      setRootScore(propagule.rootScore);
      setNotes(propagule.notes ?? '');
      setLabel(propagule.label ?? '');

      // Set first valid next stage as default
      const validNextStages = getValidNextStages(propagule.stage);
      if (validNextStages.length > 0 && validNextStages[0] !== 'failed') {
        setSelectedStage(validNextStages[0]);
      }
    }
  }, [propagule]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setFailureReason('unknown');
      setFailureNotes('');
    }
  }, [isOpen]);

  // Get valid next stages
  const validNextStages = propagule
    ? getValidNextStages(propagule.stage).filter((s) => s !== 'failed')
    : [];

  // Handle general update
  const handleUpdate = useCallback(async () => {
    if (!propagule) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updates: UpdatePropaguleInput = {};

      if (label !== (propagule.label ?? '')) {
        updates.label = label || undefined;
      }
      if (notes !== (propagule.notes ?? '')) {
        updates.notes = notes || undefined;
      }
      if (healthScore !== propagule.healthScore) {
        updates.healthScore = healthScore;
      }

      // Record measurements
      const measurements: MeasurementInput = {};
      if (heightCm !== propagule.heightCm) measurements.heightCm = heightCm;
      if (stemDiameterMm !== propagule.stemDiameterMm) measurements.stemDiameterMm = stemDiameterMm;
      if (leafCount !== propagule.leafCount) measurements.leafCount = leafCount;
      if (rootScore !== propagule.rootScore) measurements.rootScore = rootScore;

      // Merge measurements into updates
      const allUpdates = { ...updates, ...measurements };

      if (Object.keys(allUpdates).length > 0) {
        await updatePropagule(propaguleId, allUpdates);
      }

      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    propagule,
    propaguleId,
    label,
    notes,
    healthScore,
    heightCm,
    stemDiameterMm,
    leafCount,
    rootScore,
    updatePropagule,
    onClose,
  ]);

  // Handle stage advance
  const handleAdvanceStage = useCallback(async () => {
    if (!propagule || !selectedStage) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await advanceStage(propaguleId, selectedStage);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [propagule, propaguleId, selectedStage, advanceStage, onClose]);

  // Handle failure recording
  const handleRecordFailure = useCallback(async () => {
    if (!propagule) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await markFailed(propaguleId, failureReason, failureNotes || undefined);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [propagule, propaguleId, failureReason, failureNotes, markFailed, onClose]);

  if (!propagule) {
    return null;
  }

  const stageColors = getStageColors(propagule.stage);

  // Determine modal title based on mode
  const modalTitle =
    mode === 'advance'
      ? 'Advance Stage'
      : mode === 'fail'
        ? 'Record Failure'
        : 'Update Propagule';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="space-y-6">
        {/* Propagule Info Header */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg text-slate-900 dark:text-white">
                {propagule.propaguleNumber}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {propagule.species}
                {propagule.variety && ` - ${propagule.variety}`}
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors.bg} ${stageColors.text}`}
            >
              {getStageDisplayName(propagule.stage)}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Update Form */}
        {mode === 'update' && (
          <div className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Label / Custom Name
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., 'Best performer', 'For sale'"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Health Score */}
            <HealthScoreSelector value={healthScore} onChange={setHealthScore} />

            {/* Measurements */}
            <div className="grid grid-cols-2 gap-4">
              <MeasurementField
                label="Height"
                value={heightCm}
                onChange={setHeightCm}
                unit="cm"
                max={500}
                step={0.5}
              />
              <MeasurementField
                label="Stem Diameter"
                value={stemDiameterMm}
                onChange={setStemDiameterMm}
                unit="mm"
                max={100}
                step={0.1}
              />
              <MeasurementField
                label="Leaf Count"
                value={leafCount}
                onChange={setLeafCount}
                unit="leaves"
                max={1000}
              />
              <MeasurementField
                label="Root Score"
                value={rootScore}
                onChange={setRootScore}
                unit="/ 5"
                min={1}
                max={5}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any observations or notes..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Photo Upload Placeholder */}
            <div className="p-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
              <div className="text-slate-400 dark:text-slate-500">
                Photo upload coming soon
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Advance Stage Form */}
        {mode === 'advance' && (
          <div className="space-y-4">
            {validNextStages.length === 0 ? (
              <div className="text-center py-4 text-slate-600 dark:text-slate-400">
                This propagule cannot advance further. It has reached a terminal stage.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Advance to Stage
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {validNextStages.map((stage) => {
                      const colors = getStageColors(stage);
                      const isSelected = selectedStage === stage;

                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setSelectedStage(stage)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.text} ${colors.border}`
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="font-medium">{getStageDisplayName(stage)}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAdvanceStage}
                    disabled={isSubmitting || !selectedStage}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Advancing...' : 'Advance Stage'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Record Failure Form */}
        {mode === 'fail' && (
          <div className="space-y-4">
            {!isActiveStage(propagule.stage) ? (
              <div className="text-center py-4 text-slate-600 dark:text-slate-400">
                This propagule is already in a terminal stage and cannot be marked as failed.
              </div>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Marking this propagule as failed is permanent and cannot be undone.
                  </div>
                </div>

                {/* Failure Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Failure Reason
                  </label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value as FailureReason)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {(Object.keys(FAILURE_REASON_NAMES) as FailureReason[]).map((reason) => (
                      <option key={reason} value={reason}>
                        {FAILURE_REASON_NAMES[reason]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Failure Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={failureNotes}
                    onChange={(e) => setFailureNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe what happened..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRecordFailure}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Recording...' : 'Record Failure'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
