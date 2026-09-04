/**
 * Grow Module - Entry Point
 *
 * Microgreens experiment tracking module.
 * Handles tray management, daily logging, time tracking,
 * analytics, and variety comparison.
 *
 * Wrapped in ErrorBoundary for module isolation.
 */

import { useEffect, useMemo } from 'react';
import { useRoutes } from 'react-router-dom';
import { MapPin, ChartColumn } from 'lucide-react';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSites, useTrays, useVarieties } from './stores';
import { useTrayMigration, useLivePlantings } from './hooks';
import { growRoutes } from './routes';

// Site-centric navigation:
// - Sites overview is the landing page (index route)
// - Site-specific nav is handled by SiteDetailLayout's SiteSubNav
// - These are global/cross-site views
/**
 * Module navigation exists only to move between growing spaces.
 *
 * Everything a grower does happens to one growing space, so it all lives in that
 * growing space's own navigation - including the calendar, which used to sit a level up and
 * split one job across two bars. The variety scorecard moved into Analytics, where it
 * belongs.
 *
 * With a single growing space there is nothing left to switch between, so this bar does not
 * render at all: one level of navigation instead of two, for the common case.
 */
function buildNavItems(siteCount: number): ModuleNavItem[] {
  if (siteCount <= 1) return [];

  return [
    { name: 'Spaces', path: '', Icon: MapPin },
    { name: 'All spaces', path: '/analytics', Icon: ChartColumn },
  ];
}

function GrowModuleContent() {
  const { sites, loadSites } = useSites();
  const { loadTrays } = useTrays();
  const { loadVarieties } = useVarieties();

  // Load sites, trays and varieties on module mount.
  //
  // Varieties were loaded only by the pages that happened to need them for a form, so
  // anything reading the store on a different route saw an empty list and silently
  // degraded: the Timing tab showed no configured days-to-harvest to compare against,
  // and Coming up dropped harvest reminders entirely. Whether either worked depended on
  // which page the grower had visited first.
  useEffect(() => {
    loadSites();
    loadTrays();
    loadVarieties();
  }, [loadSites, loadTrays, loadVarieties]);

  // Run migration for orphan trays (those without a site)
  // Safe to call every mount - only migrates if orphan trays exist
  useTrayMigration();

  // Keep the plantings store in step with the database for every view in this module,
  // including writes made by an agent while the grower is looking at another page.
  useLivePlantings();

  const navItems = useMemo(() => buildNavItems(sites.length), [sites.length]);

  // Render child routes internally — keeps route definitions inside the lazy boundary
  const routeElement = useRoutes(growRoutes);

  return (
    <>
      {navItems.length > 0 && <ModuleNav items={navItems} basePath="/microgreens" />}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {routeElement}
        </div>
      </div>
    </>
  );
}

export default function GrowModule() {
  return (
    <ErrorBoundary
      section="Microgreens Module"
      module="grow"
      showModuleNav
    >
      <GrowModuleContent />
    </ErrorBoundary>
  );
}
