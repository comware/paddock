/**
 * useWeather - React hook for weather data
 *
 * Fetches and caches weather data for a site.
 * Automatically refetches every 30 minutes.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentWeather, type WeatherData } from '@/lib/weather';
import type { GrowSite } from '@/lib/db';

interface UseWeatherResult {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastFetched: Date | null;
}

/**
 * Hook to fetch and manage weather data for a site.
 *
 * @param site The site to fetch weather for (or null)
 * @returns Weather data, loading state, error, and refetch function
 */
export function useWeather(site: GrowSite | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchWeather = useCallback(async () => {
    // Skip if no site or weather not enabled or indoor site
    if (!site || !site.weatherEnabled || site.isIndoor) {
      setWeather(null);
      setError(null);
      return;
    }

    // Skip if location not set
    if (!site.latitude || !site.longitude) {
      setError('Site location not configured');
      setWeather(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getCurrentWeather(
        site.latitude,
        site.longitude,
        site.timezone,
        site.id!
      );
      setWeather(data);
      setLastFetched(data.fetchedAt);
    } catch (err) {
      setError((err as Error).message);
      setWeather(null);
    } finally {
      setIsLoading(false);
    }
  }, [site?.id, site?.weatherEnabled, site?.isIndoor, site?.latitude, site?.longitude, site?.timezone]);

  // Fetch on mount and when site changes
  useEffect(() => {
    fetchWeather();

    // Refresh every 30 minutes if site has weather enabled
    if (site?.weatherEnabled && !site?.isIndoor) {
      const interval = setInterval(fetchWeather, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchWeather, site?.weatherEnabled, site?.isIndoor]);

  return {
    weather,
    isLoading,
    error,
    refetch: fetchWeather,
    lastFetched,
  };
}
