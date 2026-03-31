/**
 * GraduationForm sub-components and constants
 *
 * Extracted from GraduationForm.tsx for maintainability.
 */

import { useMemo } from 'react';
import type { GraduationOutcome, PropBatchWithComputed } from '../../types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Graduation outcome options with display info.
 */
export const OUTCOME_OPTIONS: Array<{
  value: GraduationOutcome;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'planted_garden',
    label: 'Planted in Garden',
    description: 'Planted in your garden or landscape',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  },
  {
    value: 'personal_use',
    label: 'Personal Use',
    description: 'Kept for your own use (potted, indoor)',
    icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  },
  {
    value: 'gifted',
    label: 'Gifted',
    description: 'Given to a friend or family member',
    icon: 'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  },
  {
    value: 'sold',
    label: 'Sold',
    description: 'Sold at market, online, or to a nursery',
    icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  },
  {
    value: 'composted',
    label: 'Composted',
    description: 'Failed at final stage, added to compost',
    icon: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  },
];

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Batch info header showing species and remaining quantity.
 */
export function BatchInfoHeader({ batch }: { batch: PropBatchWithComputed }) {
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
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {batch.quantitySurviving}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            available to graduate
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Outcome selector component.
 */
export function OutcomeSelector({
  selectedOutcome,
  onSelect,
}: {
  selectedOutcome: GraduationOutcome | '';
  onSelect: (outcome: GraduationOutcome) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Outcome <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OUTCOME_OPTIONS.map((option) => {
          const isSelected = selectedOutcome === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <svg
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isSelected
                    ? 'text-primary-500'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={option.icon} />
              </svg>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium text-sm ${
                    isSelected
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {option.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {option.description}
                </div>
              </div>
              {isSelected && (
                <svg
                  className="w-5 h-5 text-primary-500 flex-shrink-0"
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

/**
 * Quantity selector with quick buttons.
 */
export function QuantitySelector({
  quantity,
  maxQuantity,
  onChange,
}: {
  quantity: number;
  maxQuantity: number;
  onChange: (value: number) => void;
}) {
  const presets = useMemo(() => {
    const values: number[] = [1];
    if (maxQuantity >= 5) values.push(5);
    if (maxQuantity >= 10) values.push(10);
    if (maxQuantity > 1 && !values.includes(maxQuantity)) values.push(maxQuantity);
    return values;
  }, [maxQuantity]);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Quantity <span className="text-red-500">*</span>
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
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              quantity === preset
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'
            }`}
          >
            {preset === maxQuantity ? 'All' : preset}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {maxQuantity} available
      </p>
    </div>
  );
}

/**
 * Success feedback display.
 */
export function SuccessFeedback({
  quantity,
  outcome,
}: {
  quantity: number;
  outcome: GraduationOutcome;
}) {
  const outcomeLabel = OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label ?? outcome;

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
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
        {quantity} propagule{quantity !== 1 ? 's' : ''} graduated as &ldquo;{outcomeLabel}&rdquo;
      </p>
    </div>
  );
}
