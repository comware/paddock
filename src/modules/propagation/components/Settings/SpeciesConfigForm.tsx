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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useSpeciesConfigs } from '../../stores/useSpeciesConfigs';
import type { PropSpeciesConfig, PropagationMethod } from '../../types';

// ============================================
// PROPAGATION METHODS
// ============================================

const PROPAGATION_METHODS: Array<{
  value: PropagationMethod;
  label: string;
  category: string;
}> = [
  // Cuttings
  { value: 'cutting_softwood', label: 'Softwood Cutting', category: 'Cuttings' },
  { value: 'cutting_semi_hardwood', label: 'Semi-hardwood Cutting', category: 'Cuttings' },
  { value: 'cutting_hardwood', label: 'Hardwood Cutting', category: 'Cuttings' },
  { value: 'cutting_leaf', label: 'Leaf Cutting', category: 'Cuttings' },
  { value: 'cutting_root', label: 'Root Cutting', category: 'Cuttings' },
  // Division
  { value: 'division', label: 'Division', category: 'Division' },
  // Layering
  { value: 'layering_simple', label: 'Simple Layering', category: 'Layering' },
  { value: 'layering_air', label: 'Air Layering', category: 'Layering' },
  // Grafting
  { value: 'grafting_whip', label: 'Whip Grafting', category: 'Grafting' },
  { value: 'grafting_cleft', label: 'Cleft Grafting', category: 'Grafting' },
  { value: 'grafting_bud', label: 'Bud Grafting', category: 'Grafting' },
  // Seed
  { value: 'seed', label: 'Seed', category: 'Seed' },
];

// ============================================
// MONTH OPTIONS
// ============================================

const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

const speciesConfigSchema = z.object({
  species: z.string().min(1, 'Species name is required').max(100, 'Name too long'),
  scientificName: z.string().max(150, 'Scientific name too long').optional(),
  preferredMethod: z.enum([
    'cutting_softwood',
    'cutting_semi_hardwood',
    'cutting_hardwood',
    'cutting_leaf',
    'cutting_root',
    'division',
    'layering_simple',
    'layering_air',
    'grafting_whip',
    'grafting_cleft',
    'grafting_bud',
    'seed',
  ] as const).optional(),
  typicalRootingDays: z.number().min(1).max(365).optional().nullable(),
  typicalDaysToReady: z.number().min(1).max(730).optional().nullable(),
  maxDaysRooting: z.number().min(1).max(365).optional().nullable(),
  maxDaysPottedUp: z.number().min(1).max(365).optional().nullable(),
  maxDaysHardening: z.number().min(1).max(365).optional().nullable(),
  bestPropagationMonths: z.array(z.number().min(1).max(12)).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

type SpeciesConfigFormData = z.infer<typeof speciesConfigSchema>;

// ============================================
// PROPS
// ============================================

interface SpeciesConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (configId: string) => void;
  editConfig?: PropSpeciesConfig;
}

// ============================================
// COMPONENT
// ============================================

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
      species: '',
      scientificName: '',
      preferredMethod: undefined,
      typicalRootingDays: null,
      typicalDaysToReady: null,
      maxDaysRooting: null,
      maxDaysPottedUp: null,
      maxDaysHardening: null,
      bestPropagationMonths: [],
      notes: '',
    },
  });

  const selectedMethod = watch('preferredMethod');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (editConfig) {
        // Edit mode - populate with existing data
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
        // New config mode
        reset({
          species: '',
          scientificName: '',
          preferredMethod: undefined,
          typicalRootingDays: null,
          typicalDaysToReady: null,
          maxDaysRooting: null,
          maxDaysPottedUp: null,
          maxDaysHardening: null,
          bestPropagationMonths: [],
          notes: '',
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

  const selectAllMonths = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  const clearMonths = () => {
    setSelectedMonths([]);
  };

  const onSubmit = async (data: SpeciesConfigFormData) => {
    setSubmitError(null);

    try {
      // Clean up null/undefined values
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
      console.error('Failed to save species config:', error);
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

          {/* Species Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Common Name *
            </label>
            <input
              type="text"
              {...register('species')}
              placeholder="e.g., Rosemary, Lavender, Japanese Maple"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isEditMode} // Can't change species name after creation
            />
            {errors.species && (
              <p className="mt-1 text-sm text-red-500">{errors.species.message}</p>
            )}
            {isEditMode && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Species name cannot be changed after creation
              </p>
            )}
          </div>

          {/* Scientific Name */}
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
            {errors.scientificName && (
              <p className="mt-1 text-sm text-red-500">{errors.scientificName.message}</p>
            )}
          </div>
        </div>

        {/* Section: Propagation Defaults */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Propagation Defaults
          </h3>

          {/* Preferred Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Preferred Method <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROPAGATION_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    setValue('preferredMethod', selectedMethod === method.value ? undefined : method.value)
                  }
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

          {/* Typical Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Typical Rooting Days
              </label>
              <Controller
                name="typicalRootingDays"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 21"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Expected days to develop roots
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Days to Ready
              </label>
              <Controller
                name="typicalDaysToReady"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={1}
                    max={730}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 90"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Total days from taken to ready
              </p>
            </div>
          </div>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Days Rooting
              </label>
              <Controller
                name="maxDaysRooting"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 28"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Days Potted Up
              </label>
              <Controller
                name="maxDaysPottedUp"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 21"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Days Hardening
              </label>
              <Controller
                name="maxDaysHardening"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 21"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Section: Seasonality */}
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
                onClick={selectAllMonths}
                className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                All Year
              </button>
              <button
                type="button"
                onClick={clearMonths}
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
                onClick={() => toggleMonth(month.value)}
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
          <input type="hidden" {...register('bestPropagationMonths')} />
        </div>

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
            {errors.notes && (
              <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
            )}
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
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Configuration'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
