/**
 * NewTrayForm - Form for adding a new tray
 *
 * Features:
 * - Auto-increment tray number
 * - Variety selector with smart defaults
 * - Quick seed weight buttons
 * - Pre-soak toggle
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useTrays, useVarieties, useMediums } from '../../stores';
import { useSites } from '@/platform';
import { useEffect } from 'react';
import { useSiteContext } from '../Sites/SiteContext';

const traySchema = z.object({
  label: z.string().optional(),
  variety: z.string().min(1, 'Please select a variety'),
  seedWeight: z.number().min(1, 'Weight must be at least 1g').max(500, 'Weight cannot exceed 500g'),
  growingMedium: z.string().min(1, 'Please select a growing medium'),
  preSoaked: z.boolean(),
  blackoutDays: z.number().min(1).max(10),
});

type TrayFormData = z.infer<typeof traySchema>;

interface NewTrayFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickWeights = [50, 80, 100, 120];

export function NewTrayForm({ isOpen, onClose }: NewTrayFormProps) {
  const { addTray, getNextTrayNumber } = useTrays();
  const { varieties, loadVarieties, isLoading: varietiesLoading } = useVarieties();
  const { mediums, loadMediums, isLoading: mediumsLoading } = useMediums();
  const { getActiveSite, getDefaultSite, ensureDefaultSite } = useSites();

  // Use site from context if available (inside SiteDetailLayout)
  const { site: contextSite } = useSiteContext();

  const nextTrayNumber = getNextTrayNumber();
  // Prefer context site, then active site, then default site
  const activeSite = contextSite || getActiveSite() || getDefaultSite();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrayFormData>({
    resolver: zodResolver(traySchema),
    defaultValues: {
      label: '',
      variety: '',
      seedWeight: 80,
      growingMedium: 'coco_coir',
      preSoaked: false,
      blackoutDays: 4,
    },
  });

  const selectedVariety = watch('variety');
  const currentWeight = watch('seedWeight');

  // Load varieties and mediums on mount
  useEffect(() => {
    loadVarieties();
    loadMediums();
  }, [loadVarieties, loadMediums]);

  // Update defaults when variety changes
  useEffect(() => {
    if (selectedVariety) {
      const variety = varieties.find((v) => v.name === selectedVariety);
      if (variety) {
        setValue('preSoaked', variety.preSoakRequired);
        setValue('blackoutDays', variety.defaultBlackoutDays);
      }
    }
  }, [selectedVariety, varieties, setValue]);

  const onSubmit = async (data: TrayFormData) => {
    try {
      // Ensure we have a site to assign the tray to
      const site = activeSite || await ensureDefaultSite();

      await addTray({
        trayNumber: nextTrayNumber,
        label: data.label || undefined, // Only set if user provided a custom label
        siteId: site.id, // Associate with site (guaranteed to exist)
        variety: data.variety,
        dateSown: new Date(),
        seedWeight: data.seedWeight,
        growingMedium: data.growingMedium,
        preSoaked: data.preSoaked,
        blackoutDays: data.blackoutDays,
        problemsObserved: '',
        lessonsLearned: '',
      });
      reset();
      onClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to add tray:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`New Tray #${nextTrayNumber}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Custom Label */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Custom Label <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            {...register('label')}
            placeholder={`Tray #${nextTrayNumber}`}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Leave blank to use default numbering
          </p>
        </div>

        {/* Variety */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Variety
          </label>
          <select
            {...register('variety')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={varietiesLoading}
          >
            <option value="">Select variety...</option>
            {varieties.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
          {errors.variety && (
            <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>
          )}
        </div>

        {/* Seed Weight */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Seed Weight (g)
          </label>
          <div className="flex gap-2 mb-2">
            {quickWeights.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setValue('seedWeight', w)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentWeight === w
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {w}g
              </button>
            ))}
          </div>
          <input
            type="number"
            {...register('seedWeight', { valueAsNumber: true })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.seedWeight && (
            <p className="mt-1 text-sm text-red-500">{errors.seedWeight.message}</p>
          )}
        </div>

        {/* Growing Medium */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Growing Medium
          </label>
          <select
            {...register('growingMedium')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={mediumsLoading}
          >
            {mediums.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pre-soaked */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="preSoaked"
            {...register('preSoaked')}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
          />
          <label
            htmlFor="preSoaked"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Seeds pre-soaked
          </label>
        </div>

        {/* Blackout Days */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Blackout Days
          </label>
          <input
            type="number"
            {...register('blackoutDays', { valueAsNumber: true })}
            min={1}
            max={10}
            className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Tray'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
