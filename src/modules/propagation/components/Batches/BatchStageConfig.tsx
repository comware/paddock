/**
 * BatchStageConfig - Method selector and mother plant linkage for NewBatchForm.
 *
 * Extracted from NewBatchForm.tsx for code health.
 */

import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import type { PropagationMethod, PropMotherPlant } from '../../types';
import { METHODS_BY_CATEGORY, type BatchFormData } from './batchFormConstants';

interface BatchStageConfigProps {
  selectedMethod: PropagationMethod | undefined;
  filteredMotherPlants: PropMotherPlant[];
  isLoadingData: boolean;
  register: UseFormRegister<BatchFormData>;
  setValue: UseFormSetValue<BatchFormData>;
  errors: FieldErrors<BatchFormData>;
}

export function BatchStageConfig({
  selectedMethod,
  filteredMotherPlants,
  isLoadingData,
  register,
  setValue,
  errors,
}: BatchStageConfigProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Propagation Method
      </h3>

      {/* Method Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Method *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(METHODS_BY_CATEGORY).map(([category, methods]) => (
            <div key={category} className="col-span-2 sm:col-span-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 mt-2 first:mt-0">
                {category}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {methods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setValue('method', method.value)}
                    title={method.description}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      selectedMethod === method.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Hidden field for validation */}
        <input type="hidden" {...register('method')} />
        {errors.method && (
          <p className="mt-1 text-sm text-red-500">{errors.method.message}</p>
        )}
      </div>

      {/* Mother Plant (optional) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Mother Plant <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <select
          {...register('motherPlantId')}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoadingData}
        >
          <option value="">Not from registered mother plant</option>
          {filteredMotherPlants.map((mp) => (
            <option key={mp.id} value={mp.id}>
              {mp.label} ({mp.species}{mp.variety ? ` - ${mp.variety}` : ''})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Link to a registered mother plant for tracking lineage
        </p>
      </div>
    </div>
  );
}
