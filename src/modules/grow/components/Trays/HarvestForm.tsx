/**
 * HarvestForm - Form for recording tray harvest
 *
 * Features:
 * - Harvest weight input with live yield ratio calculation
 * - Quality grade selector (A/B/C/F)
 * - Sellable toggle
 * - Problems and lessons learned fields
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useTrays, type TrayWithComputed } from '../../stores';

const harvestSchema = z.object({
  harvestWeight: z.number().min(1, 'Weight must be at least 1g').max(2000, 'Weight cannot exceed 2000g'),
  qualityGrade: z.enum(['A', 'B', 'C', 'F']),
  sellable: z.boolean(),
  problemsObserved: z.string(),
  lessonsLearned: z.string(),
});

type HarvestFormData = z.infer<typeof harvestSchema>;

interface HarvestFormProps {
  isOpen: boolean;
  onClose: () => void;
  tray: TrayWithComputed;
}

const gradeOptions = [
  { value: 'A', label: 'A', color: 'bg-green-500 hover:bg-green-600', description: 'Excellent' },
  { value: 'B', label: 'B', color: 'bg-yellow-500 hover:bg-yellow-600', description: 'Good' },
  { value: 'C', label: 'C', color: 'bg-orange-500 hover:bg-orange-600', description: 'Fair' },
  { value: 'F', label: 'F', color: 'bg-red-500 hover:bg-red-600', description: 'Failed' },
] as const;

export function HarvestForm({ isOpen, onClose, tray }: HarvestFormProps) {
  const { harvestTray } = useTrays();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HarvestFormData>({
    resolver: zodResolver(harvestSchema),
    defaultValues: {
      harvestWeight: 0,
      qualityGrade: 'A',
      sellable: true,
      problemsObserved: tray.problemsObserved || '',
      lessonsLearned: tray.lessonsLearned || '',
    },
  });

  const harvestWeight = watch('harvestWeight');
  const selectedGrade = watch('qualityGrade');

  // Calculate yield ratio in real-time
  const yieldRatio = harvestWeight > 0 && tray.seedWeight > 0
    ? (harvestWeight / tray.seedWeight).toFixed(1)
    : null;

  const onSubmit = async (data: HarvestFormData) => {
    try {
      await harvestTray(tray.id!, {
        harvestWeight: data.harvestWeight,
        qualityGrade: data.qualityGrade,
        sellable: data.sellable,
        problemsObserved: data.problemsObserved,
        lessonsLearned: data.lessonsLearned,
      });
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to record harvest:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Harvest Tray #${tray.trayNumber}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Tray Info Summary */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Variety:</span>
            <span className="font-medium">{tray.variety}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-600 dark:text-slate-400">Seed Weight:</span>
            <span className="font-medium">{tray.seedWeight}g</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-600 dark:text-slate-400">Days Growing:</span>
            <span className="font-medium">{tray.daysToHarvest ?? tray.daysInPhase} days</span>
          </div>
        </div>

        {/* Harvest Weight */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Harvest Weight (g)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              {...register('harvestWeight', { valueAsNumber: true })}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter harvest weight"
            />
            {yieldRatio && (
              <div className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                {yieldRatio}x yield
              </div>
            )}
          </div>
          {errors.harvestWeight && (
            <p className="mt-1 text-sm text-red-500">{errors.harvestWeight.message}</p>
          )}
        </div>

        {/* Quality Grade */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Quality Grade
          </label>
          <div className="flex gap-2">
            {gradeOptions.map((grade) => (
              <button
                key={grade.value}
                type="button"
                onClick={() => setValue('qualityGrade', grade.value)}
                className={`flex-1 py-3 rounded-lg text-white font-bold text-lg transition-all ${
                  grade.color
                } ${
                  selectedGrade === grade.value
                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-105'
                    : 'opacity-60'
                }`}
              >
                {grade.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 text-center">
            {gradeOptions.find(g => g.value === selectedGrade)?.description}
          </p>
        </div>

        {/* Sellable Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sellable"
            {...register('sellable')}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
          />
          <label
            htmlFor="sellable"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Sellable quality
          </label>
        </div>

        {/* Problems Observed */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Problems Observed
          </label>
          <textarea
            {...register('problemsObserved')}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Any issues during growth..."
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
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="What would you do differently..."
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
            className="flex-1 px-4 py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Record Harvest'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
