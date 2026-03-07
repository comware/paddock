/**
 * SpeciesConfigSeasonality - Month picker for best propagation months
 *
 * Extracted from SpeciesConfigForm to reduce component size.
 * Provides a grid of month buttons with select all/clear controls.
 */

import type { UseFormRegisterReturn } from 'react-hook-form';
import { MONTHS } from './speciesConfigConstants';

interface SpeciesConfigSeasonalityProps {
  selectedMonths: number[];
  onToggleMonth: (month: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  registration: UseFormRegisterReturn;
}

export function SpeciesConfigSeasonality({
  selectedMonths,
  onToggleMonth,
  onSelectAll,
  onClear,
  registration,
}: SpeciesConfigSeasonalityProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Best Propagation Months
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            When is the optimal time to propagate this species?
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            All Year
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {MONTHS.map((month) => (
          <button
            key={month.value}
            type="button"
            onClick={() => onToggleMonth(month.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMonths.includes(month.value)
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {month.short}
          </button>
        ))}
      </div>
      <input type="hidden" {...registration} />
    </div>
  );
}
