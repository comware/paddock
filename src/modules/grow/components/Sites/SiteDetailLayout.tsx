/**
 * SiteDetailLayout - Layout wrapper for site-specific views
 *
 * Provides:
 * - Site context for all child routes
 * - Site header with name and weather
 * - Sub-navigation tabs
 * - Outlet for nested routes
 */

import { createContext, useContext, useEffect, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSites } from '../../stores';
import { useWeather } from '../../hooks/useWeather';
import { getWeatherEmoji } from '@/lib/weather';
import type { GrowSite } from '@/lib/db';

// ============================================
// SITE CONTEXT
// ============================================

interface SiteContextValue {
  site: GrowSite | null;
  siteId: string;
  isLoading: boolean;
}

const SiteContext = createContext<SiteContextValue>({
  site: null,
  siteId: '',
  isLoading: true,
});

export function useSiteContext() {
  return useContext(SiteContext);
}

// ============================================
// SUB-NAVIGATION
// ============================================

const navItems = [
  { path: '', label: 'Overview', icon: '📊' },
  { path: 'trays', label: 'Trays', icon: '🌱' },
  { path: 'daily', label: 'Daily Log', icon: '📝' },
  { path: 'time', label: 'Time', icon: '⏱️' },
  { path: 'analytics', label: 'Analytics', icon: '📈' },
];

function SiteSubNav({ siteId }: { siteId: string }) {
  const location = useLocation();
  const basePath = `/grow/site/${siteId}`;

  // Determine active tab
  const currentPath = location.pathname.replace(basePath, '').replace(/^\//, '');

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {navItems.map((item) => {
        const isActive = item.path === ''
          ? currentPath === ''
          : currentPath.startsWith(item.path);

        return (
          <Link
            key={item.path}
            to={item.path === '' ? basePath : `${basePath}/${item.path}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ============================================
// SITE HEADER
// ============================================

function SiteHeader({ site }: { site: GrowSite }) {
  const { weather, isLoading: weatherLoading } = useWeather(site);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{site.isIndoor ? '🏠' : '📍'}</span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{site.name}</h1>
          {site.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{site.description}</p>
          )}
        </div>
      </div>

      {/* Weather Display */}
      {!site.isIndoor && site.weatherEnabled && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          {weatherLoading ? (
            <span className="text-sm text-slate-500">Loading...</span>
          ) : weather ? (
            <>
              <span className="text-2xl">{getWeatherEmoji(weather.conditions)}</span>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {weather.temperature}°C
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {weather.humidity}% • {weather.conditions}
                </div>
              </div>
            </>
          ) : (
            <span className="text-sm text-slate-500">No weather data</span>
          )}
        </div>
      )}
      {site.isIndoor && (
        <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400">
          Indoor Site
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN LAYOUT
// ============================================

export function SiteDetailLayout() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { sites, isLoading, loadSites, setActiveSite } = useSites();

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Find the current site
  const site = useMemo(() => {
    return sites.find((s) => s.id === siteId) || null;
  }, [sites, siteId]);

  // Set this site as active when viewing
  useEffect(() => {
    if (siteId) {
      setActiveSite(siteId);
    }
  }, [siteId, setActiveSite]);

  // Context value
  const contextValue = useMemo<SiteContextValue>(() => ({
    site,
    siteId: siteId || '',
    isLoading,
  }), [site, siteId, isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading site...</div>
      </div>
    );
  }

  // Site not found
  if (!site) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Site Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This site doesn't exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/grow')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to Sites
        </button>
      </div>
    );
  }

  return (
    <SiteContext.Provider value={contextValue}>
      <div className="space-y-4">
        {/* Back Link */}
        <Link
          to="/grow"
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Sites</span>
        </Link>

        {/* Site Header */}
        <SiteHeader site={site} />

        {/* Sub Navigation */}
        <SiteSubNav siteId={siteId!} />

        {/* Content Area */}
        <div className="mt-4">
          <Outlet />
        </div>
      </div>
    </SiteContext.Provider>
  );
}
