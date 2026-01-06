/**
 * SiteSelector - Dropdown for quick site switching
 *
 * Used in the module header for easy access to site selection.
 */

import { useState, useRef, useEffect } from 'react';
import { useSites } from '../../stores';
import { useWeather } from '../../hooks/useWeather';
import { getWeatherEmoji } from '@/lib/weather';

interface SiteSelectorProps {
  compact?: boolean;
}

export function SiteSelector({ compact = false }: SiteSelectorProps) {
  const { sites, activeSiteId, getActiveSite, setActiveSite, isLoading } = useSites();
  const activeSite = getActiveSite();
  const { weather } = useWeather(activeSite);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || sites.length === 0) {
    return null;
  }

  // Only show selector if multiple sites exist
  if (sites.length === 1 && compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span>{activeSite?.isIndoor ? '🏠' : '📍'}</span>
        <span>{activeSite?.name}</span>
        {weather && (
          <>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{getWeatherEmoji(weather.conditions)}</span>
            <span>{weather.temperature}°C</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg transition-colors ${
          compact
            ? 'px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
            : 'px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <span>{activeSite?.isIndoor ? '🏠' : '📍'}</span>
        <span className="font-medium text-slate-900 dark:text-white">
          {activeSite?.name || 'Select Site'}
        </span>
        {weather && (
          <>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-sm">
              {getWeatherEmoji(weather.conditions)} {weather.temperature}°C
            </span>
          </>
        )}
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
              Select Site
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sites.map((site) => (
              <SiteSelectorItem
                key={site.id}
                site={site}
                isActive={site.id === activeSiteId}
                onClick={() => {
                  setActiveSite(site.id!);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SiteSelectorItemProps {
  site: {
    id?: string;
    name: string;
    isIndoor: boolean;
    isDefault: boolean;
    weatherEnabled: boolean;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  isActive: boolean;
  onClick: () => void;
}

function SiteSelectorItem({ site, isActive, onClick }: SiteSelectorItemProps) {
  // Create a minimal site object for useWeather
  const siteForWeather = {
    id: site.id,
    name: site.name,
    isIndoor: site.isIndoor,
    weatherEnabled: site.weatherEnabled,
    latitude: site.latitude,
    longitude: site.longitude,
    timezone: site.timezone,
  } as import('@/lib/db').GrowSite;

  const { weather } = useWeather(siteForWeather);

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
        isActive ? 'bg-primary-50 dark:bg-primary-900/20' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{site.isIndoor ? '🏠' : '📍'}</span>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{site.name}</div>
            {weather && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {getWeatherEmoji(weather.conditions)} {weather.temperature}°C • {weather.humidity}%
              </div>
            )}
            {!weather && site.isIndoor && (
              <div className="text-xs text-slate-500 dark:text-slate-400">Indoor</div>
            )}
            {!weather && !site.isIndoor && !site.weatherEnabled && (
              <div className="text-xs text-slate-500 dark:text-slate-400">Weather disabled</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {site.isDefault && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs">
              Default
            </span>
          )}
          {isActive && (
            <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
