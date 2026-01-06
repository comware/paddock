/**
 * EditSiteForm - Form for editing an existing site
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useSites } from '../../stores';
import { getCurrentPosition, getTimezone } from '@/lib/weather';
import type { GrowSite } from '@/lib/db';

const siteSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'Timezone is required'),
  isIndoor: z.boolean(),
  weatherEnabled: z.boolean(),
  isDefault: z.boolean(),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface EditSiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  site: GrowSite | null;
}

export function EditSiteForm({ isOpen, onClose, site }: EditSiteFormProps) {
  const { updateSite } = useSites();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      description: '',
      latitude: 0,
      longitude: 0,
      timezone: getTimezone(),
      isIndoor: false,
      weatherEnabled: true,
      isDefault: false,
    },
  });

  // Reset form when site changes
  useEffect(() => {
    if (site) {
      reset({
        name: site.name,
        description: site.description || '',
        latitude: site.latitude,
        longitude: site.longitude,
        timezone: site.timezone,
        isIndoor: site.isIndoor,
        weatherEnabled: site.weatherEnabled,
        isDefault: site.isDefault,
      });
    }
  }, [site, reset]);

  const isIndoor = watch('isIndoor');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    try {
      const position = await getCurrentPosition();
      setValue('latitude', Math.round(position.latitude * 10000) / 10000, { shouldDirty: true });
      setValue('longitude', Math.round(position.longitude * 10000) / 10000, { shouldDirty: true });
    } catch (error) {
      setLocationError((error as Error).message);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const onSubmit = async (data: SiteFormData) => {
    if (!site?.id) return;

    try {
      // Indoor sites have weather disabled
      if (data.isIndoor) {
        data.weatherEnabled = false;
      }

      await updateSite(site.id, {
        name: data.name,
        description: data.description || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isIndoor: data.isIndoor,
        weatherEnabled: data.weatherEnabled,
        isDefault: data.isDefault,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update site:', error);
    }
  };

  const handleClose = () => {
    setLocationError(null);
    onClose();
  };

  if (!site) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit ${site.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Site Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Site Name *
          </label>
          <input
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Indoor Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
          <div>
            <div className="font-medium text-slate-900 dark:text-white">Indoor Site</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Weather fetching disabled for indoor sites
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register('isIndoor')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>

        {/* Location Section */}
        {!isIndoor && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Location
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
              >
                {isDetectingLocation ? 'Detecting...' : '📍 Auto-detect'}
              </button>
            </div>

            {locationError && (
              <p className="text-sm text-red-500">{locationError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  {...register('latitude', { valueAsNumber: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  {...register('longitude', { valueAsNumber: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {latitude !== 0 && longitude !== 0 && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View on Google Maps →
              </a>
            )}
          </div>
        )}

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Timezone
          </label>
          <input
            type="text"
            {...register('timezone')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Weather Toggle */}
        {!isIndoor && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Enable Weather</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Auto-fetch temperature and humidity
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('weatherEnabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        )}

        {/* Default Site Toggle */}
        {!site.isDefault && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Set as Default</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                New trays will be assigned to this site
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('isDefault')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
