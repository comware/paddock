/**
 * SpeciesConfigTimingFields - Timing and overdue threshold form sections
 *
 * Extracted from SpeciesConfigForm to reduce component size.
 * Handles typical timing values and overdue warning thresholds.
 */

import { Controller, type Control } from 'react-hook-form';
import type { SpeciesConfigFormData } from './speciesConfigConstants';

interface SpeciesConfigTimingFieldsProps {
  control: Control<SpeciesConfigFormData>;
}

/**
 * Number input controlled via react-hook-form Controller for nullable fields.
 */
function NullableNumberField({
  name,
  control,
  label,
  placeholder,
  hint,
  min = 1,
  max = 365,
}: {
  name: keyof SpeciesConfigFormData;
  control: Control<SpeciesConfigFormData>;
  label: string;
  placeholder: string;
  hint?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            type="number"
            min={min}
            max={max}
            value={(field.value as number | null) ?? ''}
            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        )}
      />
      {hint && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export function SpeciesConfigTimingFields({ control }: SpeciesConfigTimingFieldsProps) {
  return (
    <>
      {/* Section: Typical Timing */}
      <div className="grid grid-cols-2 gap-4">
        <NullableNumberField
          name="typicalRootingDays"
          control={control}
          label="Typical Rooting Days"
          placeholder="e.g., 21"
          hint="Expected days to develop roots"
        />
        <NullableNumberField
          name="typicalDaysToReady"
          control={control}
          label="Days to Ready"
          placeholder="e.g., 90"
          hint="Total days from taken to ready"
          max={730}
        />
      </div>

      {/* Section: Overdue Thresholds */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Overdue Warning Thresholds
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
          Batches will be flagged as needing attention when they exceed these days in each stage
        </p>

        <div className="grid grid-cols-3 gap-4">
          <NullableNumberField
            name="maxDaysRooting"
            control={control}
            label="Max Days Rooting"
            placeholder="e.g., 28"
          />
          <NullableNumberField
            name="maxDaysPottedUp"
            control={control}
            label="Max Days Potted Up"
            placeholder="e.g., 21"
          />
          <NullableNumberField
            name="maxDaysHardening"
            control={control}
            label="Max Days Hardening"
            placeholder="e.g., 21"
          />
        </div>
      </div>
    </>
  );
}
