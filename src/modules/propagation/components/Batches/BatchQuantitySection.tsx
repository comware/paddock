/**
 * BatchQuantitySection - Quantity, station, and date fields for NewBatchForm.
 *
 * Extracted from NewBatchForm.tsx for code health.
 */

import { Controller, type UseFormRegister, type FieldErrors, type Control } from 'react-hook-form';
import type { PropStation } from '../../types';
import { QUICK_QUANTITIES, ROOTING_MEDIUMS, type BatchFormData } from './batchFormConstants';

interface BatchQuantitySectionProps {
  currentQuantity: number;
  stations: PropStation[];
  selectedStation: PropStation | undefined;
  isLoadingData: boolean;
  register: UseFormRegister<BatchFormData>;
  setValue: (name: keyof BatchFormData, value: BatchFormData[keyof BatchFormData]) => void;
  control: Control<BatchFormData>;
  errors: FieldErrors<BatchFormData>;
}

export function BatchQuantitySection({
  currentQuantity,
  stations,
  selectedStation,
  isLoadingData,
  register,
  setValue,
  control,
  errors,
}: BatchQuantitySectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Quantity & Location
      </h3>

      {/* Quantity with quick select */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Quantity *
        </label>
        <div className="flex gap-2 mb-2">
          {QUICK_QUANTITIES.map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setValue('quantityStarted', qty)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentQuantity === qty
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {qty}
            </button>
          ))}
        </div>
        <input
          type="number"
          {...register('quantityStarted', { valueAsNumber: true })}
          min={1}
          max={1000}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {errors.quantityStarted && (
          <p className="mt-1 text-sm text-red-500">{errors.quantityStarted.message}</p>
        )}
      </div>

      {/* Station Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Station *
        </label>
        <select
          {...register('stationId')}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoadingData || stations.length === 0}
        >
          <option value="">Select station...</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} ({station.type.replace(/_/g, ' ')})
            </option>
          ))}
        </select>
        {selectedStation && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Capacity: {selectedStation.capacity} slots
            {selectedStation.isIndoor ? ' | Indoor' : ' | Outdoor'}
          </p>
        )}
        {stations.length === 0 && !isLoadingData && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            No active stations found. Please create a station first.
          </p>
        )}
        {errors.stationId && (
          <p className="mt-1 text-sm text-red-500">{errors.stationId.message}</p>
        )}
      </div>

      {/* Date Taken */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Date Taken
        </label>
        <Controller
          name="dateTaken"
          control={control}
          render={({ field }) => (
            <input
              type="date"
              value={field.value ? field.value.toISOString().split('T')[0] : ''}
              onChange={(e) => field.onChange(new Date(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          )}
        />
        {errors.dateTaken && (
          <p className="mt-1 text-sm text-red-500">{errors.dateTaken.message}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Optional Details Section
// ============================================

interface BatchOptionalDetailsProps {
  register: UseFormRegister<BatchFormData>;
  errors: FieldErrors<BatchFormData>;
}

export function BatchOptionalDetails({
  register,
  errors,
}: BatchOptionalDetailsProps) {
  return (
    <details className="space-y-4">
      <summary className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
        Optional Details
      </summary>

      <div className="pt-3 space-y-4">
        {/* Rooting Medium */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Rooting Medium
          </label>
          <select
            {...register('rootingMedium')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {ROOTING_MEDIUMS.map((medium) => (
              <option key={medium.value} value={medium.value}>
                {medium.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rooting Hormone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Rooting Hormone
          </label>
          <input
            type="text"
            {...register('hormoneUsed')}
            placeholder="e.g., Clonex, Rootone, None"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Preparation Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Preparation Notes
          </label>
          <textarea
            {...register('preparationNotes')}
            rows={3}
            placeholder="Any special preparation, treatment, or observations..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.preparationNotes && (
            <p className="mt-1 text-sm text-red-500">{errors.preparationNotes.message}</p>
          )}
        </div>
      </div>
    </details>
  );
}
