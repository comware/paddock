/**
 * BatchBasicInfo - Species search and variety fields for NewBatchForm.
 *
 * Extracted from NewBatchForm.tsx for code health.
 */

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { PropSpeciesConfig } from '../../types';
import { PROPAGATION_METHODS, type BatchFormData } from './batchFormConstants';

interface BatchBasicInfoProps {
  speciesSearch: string;
  onSpeciesSearchChange: (value: string) => void;
  showSpeciesDropdown: boolean;
  onShowSpeciesDropdown: (show: boolean) => void;
  filteredSpecies: string[];
  onSpeciesSelect: (species: string) => void;
  selectedSpeciesConfig: PropSpeciesConfig | null;
  isInSeason: boolean;
  isLoadingData: boolean;
  register: UseFormRegister<BatchFormData>;
  errors: FieldErrors<BatchFormData>;
}

export function BatchBasicInfo({
  speciesSearch,
  onSpeciesSearchChange,
  showSpeciesDropdown,
  onShowSpeciesDropdown,
  filteredSpecies,
  onSpeciesSelect,
  selectedSpeciesConfig,
  isInSeason,
  isLoadingData,
  register,
  errors,
}: BatchBasicInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Plant Information
      </h3>

      {/* Species - Searchable */}
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Species *
        </label>
        <input
          type="text"
          value={speciesSearch}
          onChange={(e) => onSpeciesSearchChange(e.target.value)}
          onFocus={() => onShowSpeciesDropdown(true)}
          onBlur={() => {
            // Delay to allow click on dropdown
            setTimeout(() => onShowSpeciesDropdown(false), 200);
          }}
          placeholder="Search or type species name..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoadingData}
        />
        {/* Hidden field for validation */}
        <input type="hidden" {...register('species')} />

        {/* Dropdown */}
        {showSpeciesDropdown && filteredSpecies.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredSpecies.map((species) => (
              <button
                key={species}
                type="button"
                onClick={() => onSpeciesSelect(species)}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
              >
                {species}
              </button>
            ))}
            {speciesSearch && !filteredSpecies.includes(speciesSearch) && (
              <button
                type="button"
                onClick={() => onSpeciesSelect(speciesSearch)}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-primary-600 dark:text-primary-400 font-medium border-t border-slate-200 dark:border-slate-600"
              >
                + Add "{speciesSearch}" as new species
              </button>
            )}
          </div>
        )}
        {errors.species && (
          <p className="mt-1 text-sm text-red-500">{errors.species.message}</p>
        )}

        {/* Species Config Hint */}
        {selectedSpeciesConfig && (
          <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {selectedSpeciesConfig.species} defaults:
              </span>
              {selectedSpeciesConfig.preferredMethod && (
                <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs">
                  {PROPAGATION_METHODS.find(m => m.value === selectedSpeciesConfig.preferredMethod)?.label || selectedSpeciesConfig.preferredMethod}
                </span>
              )}
              {selectedSpeciesConfig.typicalRootingDays && (
                <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs">
                  ~{selectedSpeciesConfig.typicalRootingDays}d rooting
                </span>
              )}
              {!isInSeason && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs">
                  Not optimal season
                </span>
              )}
              {isInSeason && selectedSpeciesConfig.bestPropagationMonths?.length && (
                <span className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs">
                  In season
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Variety */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Variety <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          {...register('variety')}
          placeholder="e.g., 'Tuscan Blue', 'Pink Pearl'"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {errors.variety && (
          <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>
        )}
      </div>
    </div>
  );
}
