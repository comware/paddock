/**
 * MotherPlantAcquisitionFields - Acquisition details form section
 *
 * Extracted from MotherPlantForm to reduce component size.
 * Handles acquisition method, date, source, and cost fields.
 */

import { Controller, type Control, type UseFormRegisterReturn, type FieldError } from 'react-hook-form';
import { ACQUISITION_METHODS, type MotherPlantFormData } from './motherPlantConstants';
import type { AcquisitionMethod } from '../../types';

interface MotherPlantAcquisitionFieldsProps {
  selectedMethod: AcquisitionMethod | undefined;
  onSelectMethod: (method: AcquisitionMethod) => void;
  methodRegistration: UseFormRegisterReturn;
  methodError?: FieldError;
  control: Control<MotherPlantFormData>;
  dateError?: FieldError;
  sourceRegistration: UseFormRegisterReturn;
  sourceError?: FieldError;
  costRegistration: UseFormRegisterReturn;
  costError?: FieldError;
}

export function MotherPlantAcquisitionFields({
  selectedMethod,
  onSelectMethod,
  methodRegistration,
  methodError,
  control,
  dateError,
  sourceRegistration,
  sourceError,
  costRegistration,
  costError,
}: MotherPlantAcquisitionFieldsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Acquisition Details
      </h3>

      {/* Acquisition Method */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          How did you acquire this plant? *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ACQUISITION_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => onSelectMethod(method.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                selectedMethod === method.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <div>{method.label}</div>
              <div className="text-xs opacity-75">{method.description}</div>
            </button>
          ))}
        </div>
        <input type="hidden" {...methodRegistration} />
        {methodError && <p className="mt-1 text-sm text-red-500">{methodError.message}</p>}
      </div>

      {/* Acquisition Date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Acquisition Date
        </label>
        <Controller
          name="acquisitionDate"
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
        {dateError && <p className="mt-1 text-sm text-red-500">{dateError.message}</p>}
      </div>

      {/* Acquisition Source */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Source <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          {...sourceRegistration}
          placeholder="e.g., 'Local nursery', 'Friend's garden', 'Bunnings'"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {sourceError && <p className="mt-1 text-sm text-red-500">{sourceError.message}</p>}
      </div>

      {/* Acquisition Cost */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Cost <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-slate-400">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            {...costRegistration}
            placeholder="0.00"
            className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        {costError && <p className="mt-1 text-sm text-red-500">{costError.message}</p>}
      </div>
    </div>
  );
}
