/**
 * SiteCard - Individual site display component
 *
 * Shows site info with weather preview and quick actions.
 */

import type { GrowSite } from '@/lib/db';
import { useWeather } from '../../hooks/useWeather';
import { getWeatherEmoji } from '@/lib/weather';

interface SiteCardProps {
  site: GrowSite;
  isActive?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

export function SiteCard({
  site,
  isActive = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: SiteCardProps) {
  const { weather, isLoading: weatherLoading, error: weatherError } = useWeather(site);

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{site.isIndoor ? '🏠' : '📍'}</span>
          <span className="font-bold text-slate-900 dark:text-white">{site.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {site.isDefault && (
            <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
              Default
            </span>
          )}
          {isActive && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {site.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{site.description}</p>
      )}

      {/* Weather Display */}
      {site.weatherEnabled && !site.isIndoor ? (
        <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          {weatherLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading weather...</div>
          ) : weatherError ? (
            <div className="text-sm text-red-500 dark:text-red-400">Weather unavailable</div>
          ) : weather ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getWeatherEmoji(weather.conditions)}</span>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {weather.temperature}°C
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {weather.humidity}% humidity • {weather.conditions}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">No weather data</div>
          )}
        </div>
      ) : site.isIndoor ? (
        <div className="mb-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span>🏠</span>
            <span>Indoor site - weather disabled</span>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
          <div className="text-sm text-slate-500 dark:text-slate-400">Weather disabled</div>
        </div>
      )}

      {/* Location Info */}
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {site.latitude !== 0 && site.longitude !== 0 ? (
          <span>
            📍 {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
          </span>
        ) : (
          <span>📍 Location not set</span>
        )}
        <span className="mx-2">•</span>
        <span>{site.timezone}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
        {!site.isDefault && onSetDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault();
            }}
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Set Default
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            Edit
          </button>
        )}
        {onDelete && !site.isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
