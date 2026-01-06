/**
 * NewSiteForm - Form for creating a new site
 *
 * Features:
 * - Auto-detect location via browser geolocation
 * - Manual lat/lng entry option
 * - Indoor site toggle (disables weather)
 * - Weather enable/disable toggle
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useSites } from '../../stores';
import { getCurrentPosition, getTimezone } from '@/lib/weather';

const siteSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  address: z.string().max(200, 'Address too long').optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'Timezone is required'),
  isIndoor: z.boolean(),
  weatherEnabled: z.boolean(),
  isDefault: z.boolean(),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface NewSiteFormProps {
  isOpen: boolean;
  onClose: () => void;
}

// Nominatim geocoding service (OpenStreetMap - free, no API key)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const encoded = encodeURIComponent(address);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
    {
      headers: {
        'User-Agent': 'Paddock-Microgreens-App/1.0',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Geocoding service unavailable');
  }

  const results = await response.json();
  if (results.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

// Reverse geocoding - get address from coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    {
      headers: {
        'User-Agent': 'Paddock-Microgreens-App/1.0',
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.display_name || null;
}

export function NewSiteForm({ isOpen, onClose }: NewSiteFormProps) {
  const { addSite, sites } = useSites();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const isFirstSite = sites.length === 0;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      latitude: 0,
      longitude: 0,
      timezone: getTimezone(),
      isIndoor: false,
      weatherEnabled: true,
      isDefault: isFirstSite,
    },
  });

  const isIndoor = watch('isIndoor');
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const address = watch('address');

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);
    setGeocodeError(null);

    try {
      const position = await getCurrentPosition();
      const lat = Math.round(position.latitude * 10000) / 10000;
      const lng = Math.round(position.longitude * 10000) / 10000;

      setValue('latitude', lat);
      setValue('longitude', lng);
      setValue('timezone', getTimezone());

      // Try to reverse geocode to get address
      try {
        const detectedAddress = await reverseGeocode(lat, lng);
        if (detectedAddress) {
          setValue('address', detectedAddress);
        }
      } catch {
        // Reverse geocode is optional, don't fail if it doesn't work
      }
    } catch (error) {
      setLocationError((error as Error).message);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!address || address.trim().length === 0) {
      setGeocodeError('Please enter an address first');
      return;
    }

    setIsGeocodingAddress(true);
    setGeocodeError(null);
    setLocationError(null);

    try {
      const result = await geocodeAddress(address);
      if (result) {
        setValue('latitude', Math.round(result.lat * 10000) / 10000);
        setValue('longitude', Math.round(result.lng * 10000) / 10000);
        // Update address with the standardized display name
        setValue('address', result.displayName);
      } else {
        setGeocodeError('Address not found. Try being more specific.');
      }
    } catch (error) {
      setGeocodeError((error as Error).message);
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const onSubmit = async (data: SiteFormData) => {
    try {
      // Indoor sites have weather disabled
      if (data.isIndoor) {
        data.weatherEnabled = false;
      }

      await addSite({
        name: data.name,
        description: data.description || undefined,
        address: data.address || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isIndoor: data.isIndoor,
        weatherEnabled: data.weatherEnabled,
        isDefault: data.isDefault,
      });
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to add site:', error);
    }
  };

  const handleClose = () => {
    reset();
    setLocationError(null);
    setGeocodeError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Site">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Site Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Site Name *
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g., Home Greenhouse, Farm Site A"
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
            placeholder="Optional description of this site"
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
            {/* Address Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  {...register('address')}
                  placeholder="123 Farm Road, Melbourne VIC 3000"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleGeocodeAddress}
                  disabled={isGeocodingAddress || !address}
                  className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isGeocodingAddress ? '...' : '🔍 Lookup'}
                </button>
              </div>
              {geocodeError && (
                <p className="mt-1 text-sm text-red-500">{geocodeError}</p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter address and click Lookup to set coordinates
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-600"></div>
              <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-600"></div>
            </div>

            {/* Auto-detect Button */}
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Use Current Location
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

            {/* Coordinates Display */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  {...register('latitude', { valueAsNumber: true })}
                  placeholder="-33.8688"
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
                  placeholder="151.2093"
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

        {/* Weather Toggle (only for outdoor sites) */}
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
        {!isFirstSite && (
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
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Site'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
