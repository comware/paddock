/**
 * MotherPlantAdditionalDetails - Collapsible additional details section
 *
 * Extracted from MotherPlantForm to reduce component size.
 * Handles location, estimated age, notes, and photo upload placeholder.
 */

import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';

interface MotherPlantAdditionalDetailsProps {
  locationRegistration: UseFormRegisterReturn;
  locationError?: FieldError;
  estimatedAgeRegistration: UseFormRegisterReturn;
  estimatedAgeError?: FieldError;
  notesRegistration: UseFormRegisterReturn;
  notesError?: FieldError;
}

export function MotherPlantAdditionalDetails({
  locationRegistration,
  locationError,
  estimatedAgeRegistration,
  estimatedAgeError,
  notesRegistration,
  notesError,
}: MotherPlantAdditionalDetailsProps) {
  return (
    <details className="space-y-4">
      <summary className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
        Additional Details
      </summary>

      <div className="pt-3 space-y-4">
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Location
          </label>
          <input
            type="text"
            {...locationRegistration}
            placeholder="e.g., 'Back garden, near shed', 'Greenhouse bench 3'"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {locationError && <p className="mt-1 text-sm text-red-500">{locationError.message}</p>}
        </div>

        {/* Estimated Age */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Estimated Age (months)
          </label>
          <input
            type="number"
            min="0"
            {...estimatedAgeRegistration}
            placeholder="e.g., 24"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Approximate age when acquired
          </p>
          {estimatedAgeError && <p className="mt-1 text-sm text-red-500">{estimatedAgeError.message}</p>}
        </div>

        {/* Propagation Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            {...notesRegistration}
            rows={3}
            placeholder="Any notes about this plant, its propagation preferences, or history..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {notesError && <p className="mt-1 text-sm text-red-500">{notesError.message}</p>}
        </div>

        {/* Photo Upload Placeholder */}
        <div className="p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
          <div className="text-slate-400 dark:text-slate-500 text-sm">
            Photo upload coming soon
          </div>
        </div>
      </div>
    </details>
  );
}
