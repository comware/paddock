/**
 * ExperimentConfig - Experiment settings configuration
 *
 * Configure start date and target values for the experiment.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useExperiment } from '@/modules/microgreens/stores';

const experimentSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  targetTrays: z.number().min(1).max(100),
  targetSuccessRate: z.number().min(1).max(100),
  targetHoursPerWeek: z.number().min(1).max(40),
});

type ExperimentFormData = z.infer<typeof experimentSchema>;

export function ExperimentConfig() {
  const { experiment, loadExperiment, saveExperiment, isLoading } = useExperiment();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ExperimentFormData>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      targetTrays: 20,
      targetSuccessRate: 80,
      targetHoursPerWeek: 9,
    },
  });

  useEffect(() => {
    loadExperiment();
  }, [loadExperiment]);

  useEffect(() => {
    if (experiment) {
      reset({
        startDate: format(new Date(experiment.startDate), 'yyyy-MM-dd'),
        targetTrays: experiment.targetTrays,
        targetSuccessRate: experiment.targetSuccessRate,
        targetHoursPerWeek: experiment.targetHoursPerWeek,
      });
    }
  }, [experiment, reset]);

  const onSubmit = async (data: ExperimentFormData) => {
    setIsSaving(true);
    setMessage(null);

    try {
      await saveExperiment({
        startDate: new Date(data.startDate),
        targetTrays: data.targetTrays,
        targetSuccessRate: data.targetSuccessRate,
        targetHoursPerWeek: data.targetHoursPerWeek,
      });
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4" />
          <div className="space-y-4">
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Experiment Configuration
      </h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Experiment Start Date
          </label>
          <input
            type="date"
            {...register('startDate')}
            className="input w-full"
          />
          {errors.startDate && (
            <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Week calculations are based on this date
          </p>
        </div>

        {/* Target Trays */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Target Trays to Complete
          </label>
          <input
            type="number"
            {...register('targetTrays', { valueAsNumber: true })}
            className="input w-full"
            min={1}
            max={100}
          />
          {errors.targetTrays && (
            <p className="text-red-500 text-xs mt-1">{errors.targetTrays.message}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Minimum trays to harvest during the experiment (default: 20)
          </p>
        </div>

        {/* Target Success Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Target Success Rate (%)
          </label>
          <input
            type="number"
            {...register('targetSuccessRate', { valueAsNumber: true })}
            className="input w-full"
            min={1}
            max={100}
          />
          {errors.targetSuccessRate && (
            <p className="text-red-500 text-xs mt-1">{errors.targetSuccessRate.message}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Percentage of trays that should be A/B/C grade (default: 80%)
          </p>
        </div>

        {/* Target Hours Per Week */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Target Hours Per Week
          </label>
          <input
            type="number"
            {...register('targetHoursPerWeek', { valueAsNumber: true })}
            className="input w-full"
            min={1}
            max={40}
          />
          {errors.targetHoursPerWeek && (
            <p className="text-red-500 text-xs mt-1">{errors.targetHoursPerWeek.message}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maximum hours per week to stay sustainable (default: 9)
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="btn btn-primary w-full"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </section>
  );
}
