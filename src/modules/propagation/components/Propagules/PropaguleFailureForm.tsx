/**
 * PropaguleFailureForm - Form for recording propagule failure
 *
 * Extracted from PropaguleUpdateForm to reduce component size.
 * Allows selecting failure reason and adding notes.
 */

import type { FailureReason } from '../../types';

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

interface PropaguleFailureFormProps {
  isActiveStage: boolean;
  failureReason: FailureReason;
  onFailureReasonChange: (reason: FailureReason) => void;
  failureNotes: string;
  onFailureNotesChange: (notes: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PropaguleFailureForm({
  isActiveStage,
  failureReason,
  onFailureReasonChange,
  failureNotes,
  onFailureNotesChange,
  isSubmitting,
  onSubmit,
  onCancel,
}: PropaguleFailureFormProps) {
  if (!isActiveStage) {
    return (
      <div className="text-center py-4 text-slate-600 dark:text-slate-400">
        This propagule is already in a terminal stage and cannot be marked as failed.
      </div>
    );
  }

  return (
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
          onChange={(e) => onFailureReasonChange(e.target.value as FailureReason)}
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
          onChange={(e) => onFailureNotesChange(e.target.value)}
          rows={3}
          placeholder="Describe what happened..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Submit Button */}
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
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Recording...' : 'Record Failure'}
        </button>
      </div>
    </>
  );
}
