/**
 * DailyLogForm - Main daily observation entry form
 *
 * One entry per day - auto-saves and updates existing entry if present.
 * Auto-populates tray counts from current tray state.
 */

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoodSlider } from './MoodSlider';
import { useObservations, useTrays } from '../../stores';

// ============================================
// SCHEMA
// ============================================

const dailyLogSchema = z.object({
  temperature: z.number().min(-20).max(60).optional(),
  humidity: z.number().min(0).max(100).optional(),
  traysBlackout: z.number().min(0),
  traysLight: z.number().min(0),
  traysHarvestedToday: z.number().min(0),
  problemsSpotted: z.string().max(1000),
  actionsTaken: z.string().max(1000),
  moodEnergy: z.number().min(1).max(10),
  keyLearning: z.string().max(500),
  tomorrowPriority: z.string().max(500),
});

type DailyLogFormData = z.infer<typeof dailyLogSchema>;

// ============================================
// COMPONENT
// ============================================

export function DailyLogForm() {
  const { getTodaysObservation, saveObservation, loadObservations, isLoading } = useObservations();
  const { trays } = useTrays();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Calculate current tray counts from store
  const blackoutCount = trays.filter((t) => t.status === 'blackout').length;
  const lightCount = trays.filter((t) => t.status === 'light').length;

  const todaysEntry = getTodaysObservation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      temperature: undefined,
      humidity: undefined,
      traysBlackout: blackoutCount,
      traysLight: lightCount,
      traysHarvestedToday: 0,
      problemsSpotted: '',
      actionsTaken: '',
      moodEnergy: 5,
      keyLearning: '',
      tomorrowPriority: '',
    },
  });

  // Load observations on mount
  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  // Reset form when today's entry loads or tray counts change
  useEffect(() => {
    if (todaysEntry) {
      reset({
        temperature: todaysEntry.temperature ?? undefined,
        humidity: todaysEntry.humidity ?? undefined,
        traysBlackout: todaysEntry.traysBlackout ?? blackoutCount,
        traysLight: todaysEntry.traysLight ?? lightCount,
        traysHarvestedToday: todaysEntry.traysHarvestedToday ?? 0,
        problemsSpotted: todaysEntry.problemsSpotted ?? '',
        actionsTaken: todaysEntry.actionsTaken ?? '',
        moodEnergy: todaysEntry.moodEnergy ?? 5,
        keyLearning: todaysEntry.keyLearning ?? '',
        tomorrowPriority: todaysEntry.tomorrowPriority ?? '',
      });
      setLastSaved(todaysEntry.updatedAt ? new Date(todaysEntry.updatedAt) : null);
    } else {
      // New entry - populate with current tray counts
      reset({
        traysBlackout: blackoutCount,
        traysLight: lightCount,
        traysHarvestedToday: 0,
        problemsSpotted: '',
        actionsTaken: '',
        moodEnergy: 5,
        keyLearning: '',
        tomorrowPriority: '',
      });
    }
  }, [todaysEntry?.id, blackoutCount, lightCount, reset]);

  const onSubmit = async (data: DailyLogFormData) => {
    setIsSaving(true);
    try {
      await saveObservation(data);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save observation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header with save status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Today's Log
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('en-AU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {lastSaved && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Mood & Energy - Most important, at the top */}
      <div className="card p-6">
        <Controller
          name="moodEnergy"
          control={control}
          render={({ field }) => (
            <MoodSlider
              value={field.value}
              onChange={field.onChange}
              label="How are you feeling today?"
            />
          )}
        />
      </div>

      {/* Environment Conditions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Environment
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Temperature (°C)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('temperature', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
              className="input w-full"
              placeholder="e.g. 22.5"
            />
            {errors.temperature && (
              <p className="text-red-500 text-xs mt-1">{errors.temperature.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Humidity (%)
            </label>
            <input
              type="number"
              {...register('humidity', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
              className="input w-full"
              placeholder="e.g. 65"
            />
            {errors.humidity && (
              <p className="text-red-500 text-xs mt-1">{errors.humidity.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tray Counts */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Tray Counts
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              In Blackout
            </label>
            <input
              type="number"
              {...register('traysBlackout', { valueAsNumber: true })}
              className="input w-full"
              min={0}
            />
            <p className="text-xs text-slate-500 mt-1">Current: {blackoutCount}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              In Light
            </label>
            <input
              type="number"
              {...register('traysLight', { valueAsNumber: true })}
              className="input w-full"
              min={0}
            />
            <p className="text-xs text-slate-500 mt-1">Current: {lightCount}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Harvested Today
            </label>
            <input
              type="number"
              {...register('traysHarvestedToday', { valueAsNumber: true })}
              className="input w-full"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Problems & Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Issues & Responses
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Problems Spotted
            </label>
            <textarea
              {...register('problemsSpotted')}
              className="input w-full h-24 resize-none"
              placeholder="Any issues noticed today? Mold, pests, yellowing, slow growth..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Actions Taken
            </label>
            <textarea
              {...register('actionsTaken')}
              className="input w-full h-24 resize-none"
              placeholder="What did you do about it? Adjusted watering, moved trays..."
            />
          </div>
        </div>
      </div>

      {/* Reflection */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Reflection
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Key Learning
            </label>
            <input
              type="text"
              {...register('keyLearning')}
              className="input w-full"
              placeholder="One thing you learned or noticed today..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tomorrow's Priority
            </label>
            <input
              type="text"
              {...register('tomorrowPriority')}
              className="input w-full"
              placeholder="Most important thing to do tomorrow..."
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving || !isDirty}
          className="btn btn-primary"
        >
          {isSaving ? 'Saving...' : todaysEntry ? 'Update Log' : 'Save Log'}
        </button>
      </div>
    </form>
  );
}
