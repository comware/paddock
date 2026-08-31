/**
 * SiteDetailLayout - Layout wrapper for site-specific views
 *
 * Provides:
 * - Site context for all child routes
 * - Site header with name and weather
 * - Sub-navigation tabs
 * - Outlet for nested routes
 */

import { usePendingProposals } from '../../hooks';
import {
  LayoutDashboard,
  Sprout,
  NotebookPen,
  Timer,
  ChartLine,
  CalendarDays,
  MapPin,
  Home,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSites } from '../../stores';
import { useWeather } from '../../hooks/useWeather';
import { getWeatherEmoji } from '@/lib/weather';
import type { GrowSite } from '@/lib/db';
import { SiteContext, type SiteContextValue } from './SiteContext';

// ============================================
// SUB-NAVIGATION
// ============================================

/**
 * Everything a grower does for one growing space, in the order they do it: see the state,
 * work the trays, plan ahead, record the day, record the time, look back.
 *
 * Calendar and the variety scorecard used to live a level up, which split one job across
 * two navigation bars. The scorecard is now a tab inside Analytics, where it belongs.
 */
const navItems = [
  { path: '', label: 'Overview', Icon: LayoutDashboard },
  { path: 'trays', label: 'Trays', Icon: Sprout },
  { path: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { path: 'daily', label: 'Daily Log', Icon: NotebookPen },
  { path: 'time', label: 'Time', Icon: Timer },
  { path: 'analytics', label: 'Analytics', Icon: ChartLine },
];

function SiteSubNav({ siteId }: { siteId: string }) {
  const location = useLocation();
  const basePath = `/grow/site/${siteId}`;
  // Proposals awaiting a decision, surfaced on the tab that shows them.
  const pendingProposals = usePendingProposals();

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
            <item.Icon aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
            <span>{item.label}</span>
            {item.path === 'calendar' && pendingProposals > 0 && (
              <span
                aria-live="polite"
                className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold"
              >
                {pendingProposals}
                <span className="sr-only">
                  {' '}
                  {pendingProposals === 1
                    ? 'proposed plan awaiting your decision'
                    : 'proposed plans awaiting your decision'}
                </span>
              </span>
            )}
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
        {site.isIndoor ? (
          <Home aria-hidden="true" className="w-7 h-7 shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={1.75} />
        ) : (
          <MapPin aria-hidden="true" className="w-7 h-7 shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={1.75} />
        )}
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
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    );
  }

  // Site not found
  if (!site) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Growing space not found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This growing space doesn't exist, or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/grow')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to growing spaces
        </button>
      </div>
    );
  }

  return (
    <SiteContext.Provider value={contextValue}>
      <div className="space-y-4">
        {/*
          With one growing space there is no list to go back to - /grow redirects straight
          back here, so "Back to growing spaces" was a link that visibly did nothing.

          It becomes the way to add a second instead, which otherwise had no route at all
          once the list stopped rendering.
        */}
        <Link
          to={sites.length > 1 ? '/grow' : '/grow/sites/manage'}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {sites.length > 1 ? (
            <>
              <ArrowLeft aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
              <span>Back to growing spaces</span>
            </>
          ) : (
            <>
              <SlidersHorizontal aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
              <span>Manage growing spaces</span>
            </>
          )}
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
