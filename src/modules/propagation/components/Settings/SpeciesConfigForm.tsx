/**
 * SpeciesConfigForm - Form for creating/editing species-specific propagation defaults
 *
 * Features:
 * - Set default propagation method per species
 * - Configure typical timing values (days in each stage)
 * - Set overdue warning thresholds
 * - Define best propagation months (seasonality)
 * - Zod validation
 *
 * Follows the SupplyForm pattern from the propagation module.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui';
import { useSpeciesConfigs } from '../../stores/useSpeciesConfigs';
import type { PropSpeciesConfig } from '../../types';
import {
  PROPAGATION_METHODS,
  speciesConfigSchema,
  type SpeciesConfigFormData,
} from './speciesConfigConstants';
import { SpeciesConfigTimingFields } from './SpeciesConfigTimingFields';
import { SpeciesConfigSeasonality } from './SpeciesConfigSeasonality';

interface SpeciesConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (configId: string) => void;
  editConfig?: PropSpeciesConfig;
}

export function SpeciesConfigForm({
  isOpen,
  onClose,
  onSuccess,
  editConfig,
}: SpeciesConfigFormProps) {
  const { addConfig, updateConfig } = useSpeciesConfigs();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const isEditMode = !!editConfig;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SpeciesConfigFormData>({
    resolver: zodResolver(speciesConfigSchema),
    defaultValues: {
      species: '', scientificName: '', preferredMethod: undefined,
      typicalRootingDays: null, typicalDaysToReady: null,
      maxDaysRooting: null, maxDaysPottedUp: null, maxDaysHardening: null,
      bestPropagationMonths: [], notes: '',
    },
  });

  const selectedMethod = watch('preferredMethod');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (editConfig) {
        reset({
          species: editConfig.species,
          scientificName: editConfig.scientificName || '',
          preferredMethod: editConfig.preferredMethod,
          typicalRootingDays: editConfig.typicalRootingDays ?? null,
          typicalDaysToReady: editConfig.typicalDaysToReady ?? null,
          maxDaysRooting: editConfig.maxDaysRooting ?? null,
          maxDaysPottedUp: editConfig.maxDaysPottedUp ?? null,
          maxDaysHardening: editConfig.maxDaysHardening ?? null,
          bestPropagationMonths: editConfig.bestPropagationMonths || [],
          notes: editConfig.notes || '',
        });
        setSelectedMonths(editConfig.bestPropagationMonths || []);
      } else {
        reset({
          species: '', scientificName: '', preferredMethod: undefined,
          typicalRootingDays: null, typicalDaysToReady: null,
          maxDaysRooting: null, maxDaysPottedUp: null, maxDaysHardening: null,
          bestPropagationMonths: [], notes: '',
        });
        setSelectedMonths([]);
      }
      setSubmitError(null);
    }
  }, [isOpen, editConfig, reset]);

  // Sync months with form
  useEffect(() => {
    setValue('bestPropagationMonths', selectedMonths);
  }, [selectedMonths, setValue]);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    );
  };

  const onSubmit = async (data: SpeciesConfigFormData) => {
    setSubmitError(null);
    try {
      const cleanedData = {
        species: data.species.trim(),
        scientificName: data.scientificName?.trim() || undefined,
        preferredMethod: data.preferredMethod || undefined,
        typicalRootingDays: data.typicalRootingDays ?? undefined,
        typicalDaysToReady: data.typicalDaysToReady ?? undefined,
        maxDaysRooting: data.maxDaysRooting ?? undefined,
        maxDaysPottedUp: data.maxDaysPottedUp ?? undefined,
        maxDaysHardening: data.maxDaysHardening ?? undefined,
        bestPropagationMonths: data.bestPropagationMonths?.length ? data.bestPropagationMonths : undefined,
        notes: data.notes?.trim() || undefined,
      };

      if (isEditMode && editConfig?.id) {
        await updateConfig(editConfig.id, cleanedData);
        onSuccess?.(editConfig.id);
      } else {
        const configId = await addConfig(cleanedData);
        onSuccess?.(configId);
      }
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save species config:', error);
      setSubmitError((error as Error).message || 'Failed to save configuration');
    }
  };

  const handleClose = () => {
    reset();
    setSelectedMonths([]);
    setSubmitError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? `Edit: ${editConfig?.species}` : 'New Species Configuration'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section: Species Identification */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Species Information
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Common Name *
            </label>
            <input
              type="text"
              {...register('species')}
              placeholder="e.g., Rosemary, Lavender, Japanese Maple"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isEditMode}
            />
            {errors.species && <p className="mt-1 text-sm text-red-500">{errors.species.message}</p>}
            {isEditMode && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Species name cannot be changed after creation
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Scientific Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              {...register('scientificName')}
              placeholder="e.g., Rosmarinus officinalis"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent italic"
            />
            {errors.scientificName && <p className="mt-1 text-sm text-red-500">{errors.scientificName.message}</p>}
          </div>
        </div>

        {/* Section: Propagation Defaults */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Propagation Defaults
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Preferred Method <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROPAGATION_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setValue('preferredMethod', selectedMethod === method.value ? undefined : method.value)}
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
            <input type="hidden" {...register('preferredMethod')} />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This method will be pre-selected when creating batches for this species
            </p>
          </div>

          <SpeciesConfigTimingFields control={control} />
        </div>

        <SpeciesConfigSeasonality
          selectedMonths={selectedMonths}
          onToggleMonth={toggleMonth}
          onSelectAll={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
          onClear={() => setSelectedMonths([])}
          registration={register('bestPropagationMonths')}
        />

        {/* Section: Notes */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any special propagation tips, preferred conditions, or observations..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
            {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
          </div>
        </div>

        {/* Error Display */}
        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Configuration'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
