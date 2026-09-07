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
import { MapPin, ChartColumn, BookOpen } from 'lucide-react';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTrays, useVarieties } from './stores';
import { useSites } from '@/platform';
import { useTrayMigration, useLivePlantings } from './hooks';
import { growRoutes } from './routes';

// Site-centric navigation:
// - Sites overview is the landing page (index route)
// - Site-specific nav is handled by SiteDetailLayout's SiteSubNav
// - These are global/cross-site views
/**
 * Module navigation: where you are in microgreens, and the guides.
 *
 * Everything a grower does happens to one growing space, so the working navigation lives in
 * that space's own bar - including the calendar, which used to sit a level up and split one
 * job across two bars. The variety scorecard moved into Analytics, where it belongs.
 *
 * This bar used to disappear entirely with a single growing space, on the grounds that there
 * was nothing left to switch between. That was true, and it made microgreens the one module
 * with no bar under the top nav while the other two always had one - so the same row of the
 * screen meant different things depending on which module you were in.
 *
 * Guides gives it a reason to always be there, and it is the last item here as it is in every
 * module.
 */
function buildNavItems(siteCount: number): ModuleNavItem[] {
  const items: ModuleNavItem[] = [{ name: 'Spaces', path: '', Icon: MapPin }];

  // Only worth offering a cross-space comparison when there is more than one space.
  if (siteCount > 1) {
    items.push({ name: 'All spaces', path: '/analytics', Icon: ChartColumn });
  }

  items.push({ name: 'Guides', path: '/guides', Icon: BookOpen });
  return items;
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
      <ModuleNav items={navItems} basePath="/microgreens" />
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
      module="microgreens"
      showModuleNav
    >
      <GrowModuleContent />
    </ErrorBoundary>
  );
}
