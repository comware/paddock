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
import { getStageDisplayName, getStageColors, getValidNextStages, isActiveStage } from '../../utils';
import { PropaguleUpdateFields } from './PropaguleUpdateFields';
import { PropaguleStageAdvanceForm } from './PropaguleStageAdvanceForm';
import { PropaguleFailureForm } from './PropaguleFailureForm';

interface PropaguleUpdateFormProps {
  propaguleId: string;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'update' | 'advance' | 'fail';
}

export function PropaguleUpdateForm({
  propaguleId,
  isOpen,
  onClose,
  mode = 'update',
}: PropaguleUpdateFormProps) {
  const {
    getPropaguleById, updatePropagule, advanceStage, markFailed,
    recordMeasurements: _recordMeasurements, updateHealthScore: _updateHealthScore,
  } = usePropagules();

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

      const validNextStages = getValidNextStages(propagule.stage);
      if (validNextStages.length > 0 && validNextStages[0] !== 'failed') {
        setSelectedStage(validNextStages[0]);
      }
    }
  }, [propagule]);

  useEffect(() => {
    if (!isOpen) { setError(null); setFailureReason('unknown'); setFailureNotes(''); }
  }, [isOpen]);

  const validNextStages = propagule
    ? getValidNextStages(propagule.stage).filter((s) => s !== 'failed')
    : [];

  const handleUpdate = useCallback(async () => {
    if (!propagule) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updates: UpdatePropaguleInput = {};
      if (label !== (propagule.label ?? '')) updates.label = label || undefined;
      if (notes !== (propagule.notes ?? '')) updates.notes = notes || undefined;
      if (healthScore !== propagule.healthScore) updates.healthScore = healthScore;

      const measurements: MeasurementInput = {};
      if (heightCm !== propagule.heightCm) measurements.heightCm = heightCm;
      if (stemDiameterMm !== propagule.stemDiameterMm) measurements.stemDiameterMm = stemDiameterMm;
      if (leafCount !== propagule.leafCount) measurements.leafCount = leafCount;
      if (rootScore !== propagule.rootScore) measurements.rootScore = rootScore;

      const allUpdates = { ...updates, ...measurements };
      if (Object.keys(allUpdates).length > 0) await updatePropagule(propaguleId, allUpdates);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [propagule, propaguleId, label, notes, healthScore, heightCm, stemDiameterMm, leafCount, rootScore, updatePropagule, onClose]);

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

  if (!propagule) return null;

  const stageColors = getStageColors(propagule.stage);
  const modalTitle = mode === 'advance' ? 'Advance Stage' : mode === 'fail' ? 'Record Failure' : 'Update Propagule';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="space-y-6">
        {/* Propagule Info Header */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg text-slate-900 dark:text-white">{propagule.propaguleNumber}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {propagule.species}{propagule.variety && ` - ${propagule.variety}`}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors.bg} ${stageColors.text}`}>
              {getStageDisplayName(propagule.stage)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {mode === 'update' && (
          <PropaguleUpdateFields
            label={label} onLabelChange={setLabel}
            healthScore={healthScore} onHealthScoreChange={setHealthScore}
            heightCm={heightCm} onHeightChange={setHeightCm}
            stemDiameterMm={stemDiameterMm} onStemDiameterChange={setStemDiameterMm}
            leafCount={leafCount} onLeafCountChange={setLeafCount}
            rootScore={rootScore} onRootScoreChange={setRootScore}
            notes={notes} onNotesChange={setNotes}
            isSubmitting={isSubmitting} onSubmit={handleUpdate} onCancel={onClose}
          />
        )}

        {mode === 'advance' && (
          <div className="space-y-4">
            <PropaguleStageAdvanceForm
              validNextStages={validNextStages}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStage}
              isSubmitting={isSubmitting}
              onSubmit={handleAdvanceStage}
              onCancel={onClose}
            />
          </div>
        )}

        {mode === 'fail' && (
          <div className="space-y-4">
            <PropaguleFailureForm
              isActiveStage={isActiveStage(propagule.stage)}
              failureReason={failureReason}
              onFailureReasonChange={setFailureReason}
              failureNotes={failureNotes}
              onFailureNotesChange={setFailureNotes}
              isSubmitting={isSubmitting}
              onSubmit={handleRecordFailure}
              onCancel={onClose}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
