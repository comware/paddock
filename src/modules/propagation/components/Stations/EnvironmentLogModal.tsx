/**
 * EnvironmentLogModal - Quick environmental logging for stations
 *
 * Allows users to log temperature and humidity readings for a station.
 * Defaults date/time to now, with optional notes field.
 *
 * Following the modal patterns from BatchList.tsx.
 */

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Modal } from '@/components/ui';
import { propDb } from '@/lib/db';
import type { PropStation, PropStationLog } from '../../types';

// ============================================
// VALIDATION SCHEMA
// ============================================

const logSchema = z.object({
  temperature: z.number().min(-40, 'Temperature too low').max(60, 'Temperature too high').optional(),
  humidity: z.number().min(0, 'Humidity must be 0-100').max(100, 'Humidity must be 0-100').optional(),
  date: z.date(),
  notes: z.string().max(500, 'Notes too long').optional(),
}).refine(
  (data) => data.temperature !== undefined || data.humidity !== undefined,
  {
    message: 'Enter at least temperature or humidity',
    path: ['temperature'],
  }
);

type LogFormData = z.infer<typeof logSchema>;

// ============================================
// PROPS
// ============================================

interface EnvironmentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: PropStation | null;
  onSuccess?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function EnvironmentLogModal({
  isOpen,
  onClose,
  station,
  onSuccess,
}: EnvironmentLogModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      temperature: undefined,
      humidity: undefined,
      date: new Date(),
      notes: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        temperature: undefined,
        humidity: undefined,
        date: new Date(),
        notes: '',
      });
      setSubmitError(null);
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: LogFormData) => {
    if (!station?.id) {
      setSubmitError('No station selected');
      return;
    }

    setSubmitError(null);

    try {
      const log: Omit<PropStationLog, 'id'> = {
        stationId: station.id,
        date: data.date,
        temperature: data.temperature,
        humidity: data.humidity,
        notes: data.notes?.trim() || undefined,
        createdAt: new Date(),
      };

      await propDb.stationLogs.add(log as PropStationLog);

      onSuccess?.();
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to log environment:', error);
      setSubmitError((error as Error).message || 'Failed to save log');
    }
  };

  const handleClose = () => {
    reset();
    setSubmitError(null);
    onClose();
  };

  if (!station) {
    return null;
  }

  // Show target ranges for reference
  const hasTargets =
    station.targetTempMin !== undefined ||
    station.targetHumidityMin !== undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Log Environment: ${station.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Target Ranges Reference */}
        {hasTargets && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
              Target Ranges
            </p>
            <div className="flex gap-4 text-sm text-blue-700 dark:text-blue-300">
              {station.targetTempMin !== undefined && station.targetTempMax !== undefined && (
                <span>Temp: {station.targetTempMin}-{station.targetTempMax}C</span>
              )}
              {station.targetHumidityMin !== undefined && station.targetHumidityMax !== undefined && (
                <span>Humidity: {station.targetHumidityMin}-{station.targetHumidityMax}%</span>
              )}
            </div>
          </div>
        )}

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Temperature (C)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('temperature', { valueAsNumber: true })}
            placeholder="e.g., 22.5"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.temperature && (
            <p className="mt-1 text-sm text-red-500">{errors.temperature.message}</p>
          )}
        </div>

        {/* Humidity */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Humidity (%)
          </label>
          <input
            type="number"
            step="1"
            {...register('humidity', { valueAsNumber: true })}
            placeholder="e.g., 85"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.humidity && (
            <p className="mt-1 text-sm text-red-500">{errors.humidity.message}</p>
          )}
        </div>

        {/* Date/Time */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Date & Time
          </label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <input
                type="datetime-local"
                value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => field.onChange(new Date(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            )}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Any observations about conditions..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
          )}
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
            {isSubmitting ? 'Saving...' : 'Log Reading'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
