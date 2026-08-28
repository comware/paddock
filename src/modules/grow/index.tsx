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
import { MapPin, CalendarDays, ChartColumn, Target } from 'lucide-react';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSites, useTrays, useVarieties } from './stores';
import { useTrayMigration, usePendingProposals, useLivePlantings } from './hooks';
import { growRoutes } from './routes';

// Site-centric navigation:
// - Sites overview is the landing page (index route)
// - Site-specific nav is handled by SiteDetailLayout's SiteSubNav
// - These are global/cross-site views
/**
 * Module navigation, built for the install rather than the product.
 *
 * 'Guides' lives in the top navigation already, so it is not repeated here. The
 * greenhouse list and cross-site analytics only mean anything with more than one
 * greenhouse - with a single one they were a page listing it, and a chart identical to
 * the one a click away inside it.
 *
 * 'Decision' was an artefact of the original six-week experiment framing and told a
 * grower nothing about what the page does.
 */
function buildNavItems(siteCount: number): ModuleNavItem[] {
  const items: ModuleNavItem[] = [];

  if (siteCount > 1) {
    items.push({ name: 'Greenhouses', path: '', Icon: MapPin });
  }

  items.push({ name: 'Calendar', path: '/calendar', Icon: CalendarDays });

  if (siteCount > 1) {
    items.push({ name: 'All greenhouses', path: '/analytics', Icon: ChartColumn });
  }

  items.push({ name: 'Compare varieties', path: '/decision', Icon: Target });

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

  // Surface agent-staged proposals wherever the grower happens to be in the module.
  // Without this a proposal is only discoverable by opening the calendar and noticing it.
  const pendingProposals = usePendingProposals();

  const navItems = useMemo(
    () =>
      buildNavItems(sites.length).map((item) =>
        item.path === '/calendar'
          ? {
              ...item,
              badge: pendingProposals,
              badgeLabel:
                pendingProposals === 1
                  ? 'proposed plan awaiting your decision'
                  : 'proposed plans awaiting your decision',
            }
          : item,
      ),
    [pendingProposals, sites.length],
  );

  // Render child routes internally — keeps route definitions inside the lazy boundary
  const routeElement = useRoutes(growRoutes);

  return (
    <>
      <ModuleNav items={navItems} basePath="/grow" />
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
      section="Grow Module"
      module="grow"
      showModuleNav
    >
      <GrowModuleContent />
    </ErrorBoundary>
  );
}
