/**
 * Weather Service - Open-Meteo Integration
 *
 * Fetches current weather data from the free Open-Meteo API.
 * Includes in-memory caching to avoid excessive API calls.
 *
 * API Documentation: https://open-meteo.com/en/docs
 */

export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage (0-100)
  conditions: string; // Human-readable condition (e.g., "Clear", "Cloudy")
  weatherCode: number; // WMO weather code
  fetchedAt: Date;
}

/**
 * WMO Weather Code mappings
 * See: https://open-meteo.com/en/docs#weathervariables
 */
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Showers',
  81: 'Moderate Showers',
  82: 'Violent Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Slight Hail',
  99: 'Thunderstorm with Heavy Hail',
};

// Cache configuration
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: WeatherData;
  siteId: string;
  expiresAt: number;
}

// In-memory cache (keyed by siteId)
const weatherCache = new Map<string, CacheEntry>();

/**
 * Get weather condition string from WMO code
 */
export function getWeatherCondition(code: number): string {
  return WEATHER_CODES[code] || 'Unknown';
}

/**
 * Get emoji for weather condition
 */
export function getWeatherEmoji(conditions: string): string {
  const lower = conditions.toLowerCase();
  if (lower.includes('thunder')) return '⛈️';
  if (lower.includes('snow') || lower.includes('hail')) return '❄️';
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return '🌧️';
  if (lower.includes('fog')) return '🌫️';
  if (lower.includes('overcast')) return '☁️';
  if (lower.includes('cloudy')) return '⛅';
  if (lower.includes('clear')) return '☀️';
  return '🌡️';
}

/**
 * Fetch current weather from Open-Meteo API
 *
 * @param latitude Site latitude
 * @param longitude Site longitude
 * @param timezone Site timezone (e.g., "Australia/Sydney")
 * @param siteId Site ID for caching
 * @returns Weather data
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
  timezone: string,
  siteId: string
): Promise<WeatherData> {
  // Check cache first
  const cached = weatherCache.get(siteId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code');
  url.searchParams.set('timezone', timezone);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error('Invalid weather API response: missing current data');
  }

  const weatherCode = data.current.weather_code ?? 0;
  const weather: WeatherData = {
    temperature: Math.round(data.current.temperature_2m * 10) / 10,
    humidity: Math.round(data.current.relative_humidity_2m),
    conditions: getWeatherCondition(weatherCode),
    weatherCode,
    fetchedAt: new Date(),
  };

  // Update cache
  weatherCache.set(siteId, {
    data: weather,
    siteId,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  });

  return weather;
}

/**
 * Clear weather cache for a specific site or all sites
 */
export function clearWeatherCache(siteId?: string): void {
  if (siteId) {
    weatherCache.delete(siteId);
  } else {
    weatherCache.clear();
  }
}

/**
 * Check if cache is valid for a site
 */
export function isCacheValid(siteId: string): boolean {
  const cached = weatherCache.get(siteId);
  return !!cached && Date.now() < cached.expiresAt;
}

/**
 * Get cache age in minutes for a site
 */
export function getCacheAgeMinutes(siteId: string): number | null {
  const cached = weatherCache.get(siteId);
  if (!cached) return null;
  return Math.round((Date.now() - cached.data.fetchedAt.getTime()) / 60000);
}
