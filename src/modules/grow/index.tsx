/**
 * Grow Module - Entry Point
 *
 * Microgreens experiment tracking module.
 * Handles tray management, daily logging, time tracking,
 * analytics, and Week 6 decision support.
 *
 * Wrapped in ErrorBoundary for module isolation.
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSites, useTrays } from './stores';
import { useTrayMigration } from './hooks';

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

  return (
    <>
      <ModuleNav items={growNavItems} basePath="/grow" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
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
