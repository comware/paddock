/**
 * EditTrayForm - Form for editing an existing tray
 *
 * Features:
 * - Edit all tray fields
 * - Delete tray option
 * - Mark as failed option
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useTrays, useVarieties, useMediums, useTrayComments, type TrayWithComputed } from '../../stores';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { TrayComments } from './TrayComments';

const editTraySchema = z.object({
  variety: z.string().min(1, 'Please select a variety'),
  seedWeight: z.number().min(1, 'Weight must be at least 1g').max(500, 'Weight cannot exceed 500g'),
  growingMedium: z.string().min(1, 'Please select a growing medium'),
  preSoaked: z.boolean(),
  blackoutDays: z.number().min(1).max(10),
  dateSown: z.string().min(1, 'Please select a date'),
  germinationRate: z.number().min(0).max(100).optional(),
  problemsObserved: z.string(),
  lessonsLearned: z.string(),
});

type EditTrayFormData = z.infer<typeof editTraySchema>;

interface EditTrayFormProps {
  isOpen: boolean;
  onClose: () => void;
  tray: TrayWithComputed;
}

const quickWeights = [50, 80, 100, 120];

export function EditTrayForm({ isOpen, onClose, tray }: EditTrayFormProps) {
  const { updateTray, deleteTray, markFailed, moveToLight, moveToBlackout } = useTrays();
  const { varieties, isLoading: varietiesLoading } = useVarieties();
  const { mediums, loadMediums, isLoading: mediumsLoading } = useMediums();
  const { clearComments } = useTrayComments();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFailedConfirm, setShowFailedConfirm] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditTrayFormData>({
    resolver: zodResolver(editTraySchema),
    defaultValues: {
      variety: tray.variety,
      seedWeight: tray.seedWeight,
      growingMedium: tray.growingMedium,
      preSoaked: tray.preSoaked,
      blackoutDays: tray.blackoutDays,
      dateSown: format(tray.dateSown, 'yyyy-MM-dd'),
      germinationRate: tray.germinationRate || undefined,
      problemsObserved: tray.problemsObserved || '',
      lessonsLearned: tray.lessonsLearned || '',
    },
  });

  const currentWeight = watch('seedWeight');

  // Load mediums on mount
  useEffect(() => {
    loadMediums();
  }, [loadMediums]);

  // Reset form when tray changes
  useEffect(() => {
    reset({
      variety: tray.variety,
      seedWeight: tray.seedWeight,
      growingMedium: tray.growingMedium,
      preSoaked: tray.preSoaked,
      blackoutDays: tray.blackoutDays,
      dateSown: format(tray.dateSown, 'yyyy-MM-dd'),
      germinationRate: tray.germinationRate || undefined,
      problemsObserved: tray.problemsObserved || '',
      lessonsLearned: tray.lessonsLearned || '',
    });
  }, [tray, reset]);

  const onSubmit = async (data: EditTrayFormData) => {
    try {
      await updateTray(tray.id!, {
        variety: data.variety,
        seedWeight: data.seedWeight,
        growingMedium: data.growingMedium,
        preSoaked: data.preSoaked,
        blackoutDays: data.blackoutDays,
        dateSown: new Date(data.dateSown),
        germinationRate: data.germinationRate,
        problemsObserved: data.problemsObserved,
        lessonsLearned: data.lessonsLearned,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to update tray:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTray(tray.id!);
      handleClose();
    } catch (error) {
      console.error('Failed to delete tray:', error);
    }
  };

  const handleMarkFailed = async () => {
    try {
      await markFailed(tray.id!, 'Marked as failed by user');
      handleClose();
    } catch (error) {
      console.error('Failed to mark tray as failed:', error);
    }
  };

  const handleStatusChange = async (newStatus: 'blackout' | 'light') => {
    setIsStatusChanging(true);
    try {
      if (newStatus === 'blackout') {
        await moveToBlackout(tray.id!);
      } else {
        await moveToLight(tray.id!);
      }
    } catch (error) {
      console.error('Failed to change tray status:', error);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleClose = () => {
    clearComments();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit Tray #${tray.trayNumber}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Status Section */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              tray.status === 'blackout' ? 'bg-slate-700 text-white' :
              tray.status === 'light' ? 'bg-yellow-200 text-yellow-800' :
              tray.status === 'harvested' ? 'bg-green-200 text-green-800' :
              'bg-red-200 text-red-800'
            }`}>
              {tray.status.charAt(0).toUpperCase() + tray.status.slice(1)}
            </span>
            {tray.dateToLight && (
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                Moved to light: {format(tray.dateToLight, 'MMM d')}
              </span>
            )}
          </div>

          {/* Status Toggle - only for blackout or light trays */}
          {(tray.status === 'blackout' || tray.status === 'light') && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('blackout')}
                disabled={tray.status === 'blackout' || isStatusChanging}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tray.status === 'blackout'
                    ? 'bg-slate-700 text-white cursor-default'
                    : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50'
                }`}
              >
                Blackout
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('light')}
                disabled={tray.status === 'light' || isStatusChanging}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tray.status === 'light'
                    ? 'bg-yellow-200 text-yellow-800 cursor-default'
                    : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50'
                }`}
              >
                Light
              </button>
            </div>
          )}
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

        {/* Date Sown */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Date Sown
          </label>
          <input
            type="date"
            {...register('dateSown')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.dateSown && (
            <p className="mt-1 text-sm text-red-500">{errors.dateSown.message}</p>
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
                onClick={() => setValue('seedWeight', w, { shouldDirty: true })}
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

        {/* Pre-soaked & Blackout Days Row */}
        <div className="grid grid-cols-2 gap-4">
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
              Pre-soaked
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Blackout Days
            </label>
            <input
              type="number"
              {...register('blackoutDays', { valueAsNumber: true })}
              min={1}
              max={10}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Germination Rate (if moved to light) */}
        {tray.dateToLight && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Germination Rate (%)
            </label>
            <input
              type="number"
              {...register('germinationRate', { valueAsNumber: true })}
              min={0}
              max={100}
              placeholder="e.g., 85"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Problems Observed */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Problems Observed
          </label>
          <textarea
            {...register('problemsObserved')}
            rows={2}
            placeholder="Any issues noticed..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Lessons Learned */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Lessons Learned
          </label>
          <textarea
            {...register('lessonsLearned')}
            rows={2}
            placeholder="What would you do differently..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Comments Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Comments
          </label>
          <TrayComments trayId={tray.id!} />
        </div>

        {/* Danger Zone */}
        {tray.status !== 'harvested' && tray.status !== 'failed' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Danger Zone</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFailedConfirm(true)}
                className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Mark as Failed
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete Tray
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Dialogs */}
        {showDeleteConfirm && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Are you sure you want to delete Tray #{tray.trayNumber}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showFailedConfirm && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Mark Tray #{tray.trayNumber} as failed? This will end tracking for this tray.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMarkFailed}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Yes, Mark Failed
              </button>
              <button
                type="button"
                onClick={() => setShowFailedConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
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
            disabled={isSubmitting || !isDirty}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
