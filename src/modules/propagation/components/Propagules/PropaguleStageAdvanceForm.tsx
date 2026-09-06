/**
 * PropaguleStageAdvanceForm - Stage transition form for propagules
 *
 * Extracted from PropaguleUpdateForm to reduce component size.
 * Allows selecting the next stage for a propagule.
 */

import type { PropagationStage } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils';

interface PropaguleStageAdvanceFormProps {
  validNextStages: PropagationStage[];
  selectedStage: PropagationStage | null;
  onSelectStage: (stage: PropagationStage) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PropaguleStageAdvanceForm({
  validNextStages,
  selectedStage,
  onSelectStage,
  isSubmitting,
  onSubmit,
  onCancel,
}: PropaguleStageAdvanceFormProps) {
  if (validNextStages.length === 0) {
    return (
      <div className="text-center py-4 text-slate-600 dark:text-slate-400">
        This propagule cannot advance further. It has reached a terminal stage.
      </div>
    );
  }

  return (
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
                onClick={() => onSelectStage(stage)}
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

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !selectedStage}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Advancing...' : 'Advance Stage'}
        </button>
      </div>
    </>
  );
}
