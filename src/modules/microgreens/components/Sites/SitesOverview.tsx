/**
 * SitesOverview - Landing page for site-centric navigation
 *
 * Shows all sites as cards with:
 * - Weather preview
 * - Active tray counts
 * - "Needs attention" indicators
 * - Click to drill down to site detail
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  Sprout,
  Moon,
  Lightbulb,
  TriangleAlert,
  CircleCheck,
  Inbox,
  Plus,
  ChartColumn,
  Target,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { useTrays } from '../../stores';
import { useSites, useWeather } from '@/platform';
import { getWeatherEmoji } from '@/lib/weather';
import { NewSiteForm } from './NewSiteForm';
import type { GrowSite } from '@/lib/db';
import type { TrayWithComputed } from '../../stores';
import { addDays, isAfter, startOfDay } from 'date-fns';

interface SiteMetrics {
  activeBlackout: number;
  activeLight: number;
  readyForLight: number;
  readyToHarvest: number;
  needsAttention: number;
}

function computeSiteMetrics(trays: TrayWithComputed[], siteId: string): SiteMetrics {
  const siteTrays = trays.filter((t) => t.siteId === siteId);
  const today = startOfDay(new Date());

  const activeBlackout = siteTrays.filter((t) => t.status === 'blackout').length;
  const activeLight = siteTrays.filter((t) => t.status === 'light').length;

  // Calculate ready for light (blackout phase complete)
  const readyForLight = siteTrays.filter((t) => {
    if (t.status !== 'blackout') return false;
    const lightDate = addDays(new Date(t.dateSown), t.blackoutDays);
    return isAfter(today, lightDate);
  }).length;

  // Calculate ready to harvest (7+ days in light)
  const readyToHarvest = siteTrays.filter((t) => {
    if (t.status !== 'light') return false;
    return t.daysInPhase >= 7;
  }).length;

  return {
    activeBlackout,
    activeLight,
    readyForLight,
    readyToHarvest,
    needsAttention: readyForLight + readyToHarvest,
  };
}

// Enhanced Site Card for Overview
interface SiteOverviewCardProps {
  site: GrowSite;
  metrics: SiteMetrics;
  onClick: () => void;
}

function SiteOverviewCard({ site, metrics, onClick }: SiteOverviewCardProps) {
  const { weather, isLoading: weatherLoading } = useWeather(site);
  const totalActive = metrics.activeBlackout + metrics.activeLight;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
        metrics.needsAttention > 0
          ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {site.isIndoor ? (
            <Home aria-hidden="true" className="w-6 h-6 shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={1.75} />
          ) : (
            <MapPin aria-hidden="true" className="w-6 h-6 shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={1.75} />
          )}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{site.name}</h3>
            {site.isDefault && (
              <span className="text-xs text-primary-600 dark:text-primary-400">Default</span>
            )}
          </div>
        </div>

        {/* Weather Badge */}
        {!site.isIndoor && site.weatherEnabled && (
          <div className="text-right">
            {weatherLoading ? (
              <div className="text-xs text-slate-400">...</div>
            ) : weather ? (
              <div className="flex items-center gap-1">
                <span className="text-xl">{getWeatherEmoji(weather.conditions)}</span>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {weather.temperature}°C
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {weather.humidity}%
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {site.isIndoor && (
          <span className="text-xs text-slate-500 dark:text-slate-400">Indoor</span>
        )}
      </div>

      {/* Tray Stats */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1">
          <Sprout aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {totalActive} active
          </span>
        </div>
        {metrics.activeBlackout > 0 && (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Moon aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
            <span>{metrics.activeBlackout}<span className="sr-only"> in blackout</span></span>
          </div>
        )}
        {metrics.activeLight > 0 && (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Lightbulb aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
            <span>{metrics.activeLight}<span className="sr-only"> under light</span></span>
          </div>
        )}
      </div>

      {/* Attention Badge */}
      {metrics.needsAttention > 0 ? (
        <div className="px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium flex items-center gap-2">
          <TriangleAlert aria-hidden="true" className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>
            {metrics.needsAttention} need{metrics.needsAttention > 1 ? '' : 's'} attention
          </span>
          {metrics.readyForLight > 0 && (
            <span className="text-xs opacity-75">({metrics.readyForLight} → light)</span>
          )}
          {metrics.readyToHarvest > 0 && (
            <span className="text-xs opacity-75">({metrics.readyToHarvest} → harvest)</span>
          )}
        </div>
      ) : totalActive > 0 ? (
        <div className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium flex items-center gap-2">
          <CircleCheck aria-hidden="true" className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>All good</span>
        </div>
      ) : (
        <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2">
          <Inbox aria-hidden="true" className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>No active trays</span>
        </div>
      )}
    </div>
  );
}

export function SitesOverview() {
  const navigate = useNavigate();
  const { sites, isLoading: sitesLoading, loadSites } = useSites();
  const { trays, isLoading: traysLoading, loadTrays } = useTrays();
  const [isNewSiteOpen, setIsNewSiteOpen] = useState(false);

  useEffect(() => {
    loadSites();
    loadTrays();
  }, [loadSites, loadTrays]);

  // A list of one is a speed bump, not a choice. Most growers have a single growing space
  // and were made to click through a page listing it before reaching anything.
  //
  // replace: true so the back button leaves the module rather than bouncing off this
  // redirect.
  useEffect(() => {
    if (!sitesLoading && sites.length === 1 && sites[0].id) {
      navigate(`/microgreens/site/${sites[0].id}`, { replace: true });
    }
  }, [sitesLoading, sites, navigate]);

  // Compute metrics for all sites
  const siteMetrics = useMemo(() => {
    const metrics = new Map<string, SiteMetrics>();
    for (const site of sites) {
      if (site.id) {
        metrics.set(site.id, computeSiteMetrics(trays, site.id));
      }
    }
    return metrics;
  }, [sites, trays]);

  // Note: Removed auto-redirect for single site - users should always be able to
  // access the Sites Overview to add more sites or see global actions

  const isLoading = sitesLoading || traysLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  // Calculate total needs attention across all sites
  const totalNeedsAttention = Array.from(siteMetrics.values()).reduce(
    (sum, m) => sum + m.needsAttention,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your growing spaces</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {sites.length} space{sites.length !== 1 ? 's' : ''}
            {totalNeedsAttention > 0 && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                • {totalNeedsAttention} need attention
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsNewSiteOpen(true)}
          className="btn btn-primary"
        >
          <Plus aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          <span>Add a space</span>
        </button>
      </div>

      {/* Empty State */}
      {sites.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
          <MapPin aria-hidden="true" className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to Paddock Microgreens
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Start by adding your first growing space. Each one tracks its own trays,
            observations and weather.
          </p>
          <button
            onClick={() => setIsNewSiteOpen(true)}
            className="btn btn-primary btn-lg"
          >
            Add a growing space
          </button>
        </div>
      ) : (
        <>
          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteOverviewCard
                key={site.id}
                site={site}
                metrics={siteMetrics.get(site.id!) || {
                  activeBlackout: 0,
                  activeLight: 0,
                  readyForLight: 0,
                  readyToHarvest: 0,
                  needsAttention: 0,
                }}
                onClick={() => navigate(`/microgreens/site/${site.id}`)}
              />
            ))}
          </div>

          {/* Global Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/microgreens/analytics')}
              className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-left"
            >
              <ChartColumn aria-hidden="true" className="w-6 h-6 mb-2 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
              <span className="font-medium text-slate-900 dark:text-white">All spaces</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Compare every growing space</span>
            </button>
            <button
              onClick={() => navigate('/microgreens/analytics')}
              className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-left"
            >
              <Target aria-hidden="true" className="w-6 h-6 mb-2 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
              <span className="font-medium text-slate-900 dark:text-white">Compare varieties</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Evaluate progress</span>
            </button>
            <button
              onClick={() => navigate('/microgreens/guides')}
              className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-left"
            >
              <BookOpen aria-hidden="true" className="w-6 h-6 mb-2 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
              <span className="font-medium text-slate-900 dark:text-white">Growing Guides</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Reference material</span>
            </button>
            <button
              onClick={() => navigate('/microgreens/sites/manage')}
              className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-left"
            >
              <SlidersHorizontal aria-hidden="true" className="w-6 h-6 mb-2 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
              <span className="font-medium text-slate-900 dark:text-white">Manage spaces</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Edit & configure</span>
            </button>
          </div>
        </>
      )}

      {/* New Site Form */}
      <NewSiteForm isOpen={isNewSiteOpen} onClose={() => setIsNewSiteOpen(false)} />
    </div>
  );
}
