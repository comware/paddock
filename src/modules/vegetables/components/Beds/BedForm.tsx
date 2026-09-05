/**
 * BedForm - Modal for creating and editing growing beds.
 *
 * A bed is deliberately thin: name, dimensions, notes, and whether it is in use. siteId is
 * not a field here - it comes from the active site, because a bed always belongs to
 * wherever the grower is currently working.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useBeds } from '../../stores/useBeds';
import { useSites } from '@/platform';
import type { VegBed } from '@/lib/db';

// ============================================
// VALIDATION SCHEMA
// ============================================

const bedSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  lengthM: z.number().min(0.1, 'Must be greater than 0').max(1000, 'That seems too long').optional(),
  widthM: z.number().min(0.1, 'Must be greater than 0').max(1000, 'That seems too wide').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  isActive: z.boolean(),
});

type BedFormData = z.infer<typeof bedSchema>;

// ============================================
// PROPS
// ============================================

interface BedFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bedId: string) => void;
  editBed?: VegBed; // If provided, form is in edit mode
}

// ============================================
// COMPONENT
// ============================================

export function BedForm({ isOpen, onClose, onSuccess, editBed }: BedFormProps) {
  const { addBed, updateBed } = useBeds();
  const { getActiveSite, getDefaultSite, loadSites } = useSites();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!editBed;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BedFormData>({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      name: '',
      lengthM: undefined,
      widthM: undefined,
      notes: '',
      isActive: true,
    },
  });

  const lengthM = watch('lengthM');
  const widthM = watch('widthM');
  const area =
    typeof lengthM === 'number' && !Number.isNaN(lengthM) && typeof widthM === 'number' && !Number.isNaN(widthM)
      ? lengthM * widthM
      : undefined;

  // Load sites on mount so an active site is available.
  useEffect(() => {
    if (isOpen) {
      loadSites();
    }
  }, [isOpen, loadSites]);

  // Reset form when opening (with edit data if editing).
  useEffect(() => {
    if (isOpen && editBed) {
      reset({
        name: editBed.name,
        lengthM: editBed.lengthM,
        widthM: editBed.widthM,
        notes: editBed.notes || '',
        isActive: editBed.isActive,
      });
    } else if (isOpen && !editBed) {
      reset({
        name: '',
        lengthM: undefined,
        widthM: undefined,
        notes: '',
        isActive: true,
      });
    }
  }, [isOpen, editBed, reset]);

  const activeSite = getActiveSite() || getDefaultSite();

  const onSubmit = async (data: BedFormData) => {
    setSubmitError(null);

    try {
      if (isEditMode && editBed?.id) {
        await updateBed(editBed.id, {
          name: data.name.trim(),
          lengthM: data.lengthM,
          widthM: data.widthM,
          notes: data.notes?.trim() || undefined,
          isActive: data.isActive,
        });
        onSuccess?.(editBed.id);
      } else {
        if (!activeSite?.id) {
          setSubmitError('No active site. Set up a site before adding beds.');
          return;
        }

        const bedId = await addBed({
          siteId: activeSite.id,
          name: data.name.trim(),
          lengthM: data.lengthM,
          widthM: data.widthM,
          notes: data.notes?.trim() || undefined,
          isActive: data.isActive,
        });
        onSuccess?.(bedId);
      }

      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save bed:', error);
      setSubmitError((error as Error).message || 'Failed to save bed');
    }
  };

  const handleClose = () => {
    reset();
    setSubmitError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? `Edit Bed: ${editBed?.name}` : 'New Bed'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEditMode && !activeSite && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            No active site is set up yet. Set up a site before adding beds.
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="bed-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="bed-name"
            type="text"
            {...register('name')}
            placeholder="e.g., Bed 3, North tunnel 2"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bed-length" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Length (m)
            </label>
            <input
              id="bed-length"
              type="number"
              step="0.1"
              {...register('lengthM', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.lengthM && <p className="mt-1 text-sm text-red-500">{errors.lengthM.message}</p>}
          </div>
          <div>
            <label htmlFor="bed-width" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Width (m)
            </label>
            <input
              id="bed-width"
              type="number"
              step="0.1"
              {...register('widthM', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.widthM && <p className="mt-1 text-sm text-red-500">{errors.widthM.message}</p>}
          </div>
        </div>

        {/* Area hint - a market gardener thinks in bed metres, not multiplication */}
        {area !== undefined && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Area: <span className="font-medium text-slate-700 dark:text-slate-300">{area.toFixed(1)} m²</span>
          </p>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="bed-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            id="bed-notes"
            {...register('notes')}
            rows={3}
            placeholder="Soil notes, access, irrigation..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
        </label>

        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!isEditMode && !activeSite)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Bed'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
