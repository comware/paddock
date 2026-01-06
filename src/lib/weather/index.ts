/**
 * Weather Module
 *
 * Exports weather service and geolocation utilities.
 */

export {
  getCurrentWeather,
  clearWeatherCache,
  isCacheValid,
  getCacheAgeMinutes,
  getWeatherCondition,
  getWeatherEmoji,
  type WeatherData,
} from './weatherService';

export {
  getCurrentPosition,
  getTimezone,
  type GeoPosition,
} from './geolocation';
