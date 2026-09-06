/**
 * HarvestLogModal - Modal for logging or editing one pick against a planting.
 *
 * Three behaviours this modal must surface rather than re-implement (see useHarvests):
 *
 * - A pick against a `finished` planting REOPENS it to `harvesting`. logHarvest signals
 *   this via `lastReopenedPlantingId`, and this modal closes normally but tells the caller
 *   via `onLogged({ reopened: true })` so the detail screen can say so plainly.
 * - A pick against a `failed` planting is REFUSED - logHarvest throws and sets the store's
 *   error. The modal shows that error, stays open, and does NOT reset the form: the values
 *   someone just typed are what they will need to log the pick against the right planting.
 * - Editing an existing pick goes through `updateHarvest`, which never changes a planting's
 *   status - only a new pick can reopen or be refused.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useHarvests } from '../../stores/useHarvests';
import type { VegHarvest } from '@/lib/db';

// ============================================
// VALIDATION SCHEMA
// ============================================

const harvestSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  quantity: z.number().positive('Quantity is required'),
  unit: z.enum(['kg', 'g', 'bunches', 'count']),
  qualityGrade: z.union([z.enum(['A', 'B', 'C']), z.literal('')]).optional(),
  sellable: z.boolean(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

type HarvestFormData = z.infer<typeof harvestSchema>;

// ============================================
// PROPS
// ============================================

interface HarvestLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantingId: string;
  editHarvest?: VegHarvest; // If provided, the modal edits this pick instead of logging a new one
  onLogged?: (result: { reopened: boolean }) => void;
}

// ============================================
// HELPERS
// ============================================

function toDateInputValue(date: Date): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function emptyDefaults(): HarvestFormData {
  return {
    date: toDateInputValue(new Date()),
    quantity: 0,
    unit: 'kg',
    qualityGrade: '',
    sellable: true,
    notes: '',
  };
}

// ============================================
// COMPONENT
// ============================================

export function HarvestLogModal({ isOpen, onClose, plantingId, editHarvest, onLogged }: HarvestLogModalProps) {
  const { logHarvest, updateHarvest } = useHarvests();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!editHarvest;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HarvestFormData>({
    resolver: zodResolver(harvestSchema),
    defaultValues: emptyDefaults(),
  });

  // Reset the form only when the modal opens (or what it edits changes) - never as a side
  // effect of a failed submit, so a refused entry keeps what was typed.
  useEffect(() => {
    if (!isOpen) return;

    if (editHarvest) {
      reset({
        date: toDateInputValue(editHarvest.date),
        quantity: editHarvest.quantity,
        unit: editHarvest.unit,
        qualityGrade: editHarvest.qualityGrade || '',
        sellable: editHarvest.sellable,
        notes: editHarvest.notes || '',
      });
    } else {
      reset(emptyDefaults());
    }
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editHarvest?.id]);

  const onSubmit = async (data: HarvestFormData) => {
    setSubmitError(null);

    const payload = {
      plantingId,
      date: new Date(data.date),
      quantity: data.quantity,
      unit: data.unit,
      qualityGrade: data.qualityGrade || undefined,
      sellable: data.sellable,
      notes: data.notes?.trim() || undefined,
    };

    try {
      if (editHarvest?.id) {
        await updateHarvest(editHarvest.id, payload);
        onLogged?.({ reopened: false });
      } else {
        await logHarvest(payload);
        const reopened = useHarvests.getState().lastReopenedPlantingId === plantingId;
        onLogged?.({ reopened });
      }
    } catch (error) {
      // logHarvest (and updateHarvest) throw after recording the message on the store's
      // `error` field - read it back so the same wording is shown here as anywhere else
      // that surfaces store errors, falling back to the thrown message if it is absent.
      setSubmitError(useHarvests.getState().error || (error as Error).message || 'Failed to save pick');
      return;
    }

    handleClose();
  };

  const handleClose = () => {
    reset(emptyDefaults());
    setSubmitError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Edit pick' : 'Log a pick'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Date */}
        <div>
          <label htmlFor="harvest-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="harvest-date"
            type="date"
            {...register('date')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}
        </div>

        {/* Quantity / Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="harvest-quantity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              id="harvest-quantity"
              type="number"
              step="0.01"
              {...register('quantity', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
          </div>
          <div>
            <label htmlFor="harvest-unit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unit
            </label>
            <select
              id="harvest-unit"
              {...register('unit')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="bunches">bunches</option>
              <option value="count">count</option>
            </select>
          </div>
        </div>

        {/* Quality grade */}
        <div>
          <label htmlFor="harvest-quality" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Quality grade
          </label>
          <select
            id="harvest-quality"
            {...register('qualityGrade')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">None</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>

        {/* Sellable */}
        <div className="flex items-center gap-2">
          <input
            id="harvest-sellable"
            type="checkbox"
            {...register('sellable')}
            className="rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="harvest-sellable" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Sellable
          </label>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="harvest-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            id="harvest-notes"
            {...register('notes')}
            rows={3}
            placeholder="Anything worth remembering about this pick..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
        </div>

        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
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
            disabled={isSubmitting}
            className="btn btn-primary text-sm"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Log Pick'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
