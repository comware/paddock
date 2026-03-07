/**
 * TransitionChecklist - Sub-components for stage transition form inputs.
 *
 * Contains BatchInfoHeader, StageSelector, QuantityInput, and FailureReasonSelector.
 * Extracted from StageTransitionModal.tsx for code health.
 */

import type { PropagationStage, FailureReason, PropBatchWithComputed } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
} from '../../utils/stageHelpers';

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

export { FAILURE_REASON_OPTIONS };

/**
 * Quick decrement amounts for quantity input.
 */
const QUICK_DECREMENTS = [1, 5, 10];

// ============================================
// BATCH INFO HEADER
// ============================================

/**
 * Batch info header showing species and current stage.
 */
export function BatchInfoHeader({ batch }: { batch: PropBatchWithComputed }) {
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

// ============================================
// STAGE SELECTOR
// ============================================

/**
 * Stage selector for advance mode.
 */
export function StageSelector({
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

// ============================================
// QUANTITY INPUT
// ============================================

/**
 * Quantity input with quick decrement buttons.
 */
export function QuantityInput({
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

// ============================================
// FAILURE REASON SELECTOR
// ============================================

/**
 * Failure reason selector for fail mode.
 */
export function FailureReasonSelector({
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
