/**
 * Grow Module - Entry Point
 *
 * Microgreens experiment tracking module.
 * Handles tray management, daily logging, time tracking,
 * analytics, and Week 6 decision support.
 *
 * Wrapped in ErrorBoundary for module isolation.
 */

import { useEffect, useMemo } from 'react';
import { useRoutes } from 'react-router-dom';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSites, useTrays } from './stores';
import { useTrayMigration, usePendingProposals, useLivePlantings } from './hooks';
import { growRoutes } from './routes';

// Site-centric navigation:
// - Sites overview is the landing page (index route)
// - Site-specific nav is handled by SiteDetailLayout's SiteSubNav
// - These are global/cross-site views
const growNavItems: ModuleNavItem[] = [
  { name: 'Sites', path: '', icon: '📍' },              // Sites overview (landing)
  { name: 'Calendar', path: '/calendar', icon: '📅' },   // Planting calendar
  { name: 'Analytics', path: '/analytics', icon: '📊' }, // Cross-site analytics
  { name: 'Decision', path: '/decision', icon: '🎯' },   // Week 6 decision
  { name: 'Guides', path: '/guides', icon: '📚' },       // Reference material
];

function GrowModuleContent() {
  const { loadSites } = useSites();
  const { loadTrays } = useTrays();

  // Load sites and trays on module mount
  useEffect(() => {
    loadSites();
    loadTrays();
  }, [loadSites, loadTrays]);

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
      growNavItems.map((item) =>
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
    [pendingProposals],
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
