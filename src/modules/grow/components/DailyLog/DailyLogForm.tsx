/**
 * DailyLogForm - Main daily observation entry form
 *
 * One entry per day per site - auto-saves and updates existing entry if present.
 * Auto-populates tray counts from current tray state.
 * Auto-populates weather from site's weather API when available.
 *
 * When rendered inside SiteDetailLayout, uses site context.
 * Otherwise falls back to active site for backwards compatibility.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoodSlider } from './MoodSlider';
import { DaySummary } from './DaySummary';
import {
  useObservations,
  useTrays,
  useSites,
  useVarieties,
  usePlannedPlantings,
} from '../../stores';
import { deriveDaySummary, summariseActions } from '../../utils';
import { useWeather } from '../../hooks/useWeather';
import { getWeatherEmoji } from '@/lib/weather';
import { useSiteContext } from '../Sites/SiteContext';

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
  const { getTodaysObservationForSite, saveObservation, loadObservations, isLoading } = useObservations();
  const { trays } = useTrays();
  const { varieties } = useVarieties();
  const { plantings } = usePlannedPlantings();
  const { getActiveSite, loadSites } = useSites();

  // Use site from context if available (inside SiteDetailLayout), fall back to active site
  const siteContext = useSiteContext();
  const activeSite = siteContext.site || getActiveSite();
  const siteId = siteContext.siteId || activeSite?.id;

  const { weather, isLoading: weatherLoading } = useWeather(activeSite);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [weatherSource, setWeatherSource] = useState<'manual' | 'api'>('manual');

  // Everything the app can work out for itself: tray counts, what changed today, and
  // what is overdue. The grower used to type the first of those while the correct answer
  // was displayed underneath the field.
  const summary = useMemo(
    () => deriveDaySummary({ trays, plantings, varieties, siteId }),
    [trays, plantings, varieties, siteId],
  );

  const blackoutCount = summary.counts.blackout;
  const lightCount = summary.counts.light;
  const harvestedCount = summary.counts.harvestedToday;

  // Get today's observation for this site
  const todaysEntry = siteId ? getTodaysObservationForSite(siteId) : null;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      temperature: undefined,
      humidity: undefined,
      traysBlackout: blackoutCount,
      traysLight: lightCount,
      traysHarvestedToday: harvestedCount,
      problemsSpotted: '',
      actionsTaken: '',
      moodEnergy: 5,
      keyLearning: '',
      tomorrowPriority: '',
    },
  });

  // Load data on mount
  useEffect(() => {
    loadObservations();
    loadSites();
  }, [loadObservations, loadSites]);

  // Reset form when today's entry loads or tray counts change
  useEffect(() => {
    if (todaysEntry) {
      reset({
        temperature: todaysEntry.temperature ?? undefined,
        humidity: todaysEntry.humidity ?? undefined,
        // Counts are always current rather than whatever was true when the entry was
        // first saved - they are observations of state, not something typed once.
        traysBlackout: blackoutCount,
        traysLight: lightCount,
        traysHarvestedToday: harvestedCount,
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
        traysHarvestedToday: harvestedCount,
        problemsSpotted: '',
        actionsTaken: '',
        moodEnergy: 5,
        keyLearning: '',
        tomorrowPriority: '',
      });
    }
  }, [todaysEntry?.id, blackoutCount, lightCount, harvestedCount, reset]);

  // Auto-populate weather when available (only for new entries or entries without weather)
  useEffect(() => {
    if (weather && !todaysEntry?.temperature && !todaysEntry?.humidity) {
      setValue('temperature', weather.temperature);
      setValue('humidity', weather.humidity);
      setWeatherSource('api');
    }
  }, [weather, todaysEntry?.temperature, todaysEntry?.humidity, setValue]);

  // Track when existing entry has API weather
  useEffect(() => {
    if (todaysEntry?.weatherSource) {
      setWeatherSource(todaysEntry.weatherSource);
    }
  }, [todaysEntry?.weatherSource]);


  // Mark as manual when user changes values
  const handleWeatherFieldChange = () => {
    if (weatherSource === 'api') {
      setWeatherSource('manual');
    }
  };

  // Apply weather from API
  const handleApplyWeather = () => {
    if (weather) {
      setValue('temperature', weather.temperature, { shouldDirty: true });
      setValue('humidity', weather.humidity, { shouldDirty: true });
      setWeatherSource('api');
    }
  };

  const onSubmit = async (data: DailyLogFormData) => {
    if (!siteId) {
      if (import.meta.env.DEV) console.error('No site selected');
      return;
    }
    setIsSaving(true);
    try {
      await saveObservation({ ...data, siteId });
      setLastSaved(new Date());
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save observation:', error);
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

  // No site selected - show prompt to select one
  if (!siteId) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📍</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No Site Selected
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Please select a site to log observations for.
        </p>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            Environment
          </h3>
          {/* Weather source indicator and fetch button */}
          <div className="flex items-center gap-2">
            {weatherSource === 'api' && (
              <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                via Weather API
              </span>
            )}
            {weather && activeSite?.weatherEnabled && !activeSite?.isIndoor && (
              <button
                type="button"
                onClick={handleApplyWeather}
                className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1"
              >
                {getWeatherEmoji(weather.conditions)} Apply {weather.temperature}°C
              </button>
            )}
            {weatherLoading && (
              <span className="text-xs text-slate-500 dark:text-slate-400">Loading weather...</span>
            )}
          </div>
        </div>

        {/* Show current API weather if available */}
        {weather && activeSite?.weatherEnabled && !activeSite?.isIndoor && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getWeatherEmoji(weather.conditions)}</span>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Current: {weather.temperature}°C, {weather.humidity}% humidity
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {weather.conditions} • {activeSite.name}
                </div>
              </div>
            </div>
          </div>
        )}

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
                onChange: handleWeatherFieldChange,
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
                onChange: handleWeatherFieldChange,
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

      {/* What the app already knows. Replaces three fields the grower used to type. */}
      <DaySummary
        summary={summary}
        actionsAlreadyFilled={Boolean(watch('actionsTaken'))}
        onUseAsActions={() =>
          setValue('actionsTaken', summariseActions(summary), { shouldDirty: true })
        }
      />

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
