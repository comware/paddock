/**
 * Grow Module - Entry Point
 *
 * Microgreens experiment tracking module.
 * Handles tray management, daily logging, time tracking,
 * analytics, and Week 6 decision support.
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { SiteSelector } from './components/Sites';
import { useSites } from './stores';

const growNavItems: ModuleNavItem[] = [
  { name: 'Dashboard', path: '', icon: '📊' },
  { name: 'Trays', path: '/trays', icon: '🌱' },
  { name: 'Sites', path: '/sites', icon: '📍' },
  { name: 'Daily Log', path: '/daily', icon: '📝' },
  { name: 'Time', path: '/time', icon: '⏱️' },
  { name: 'Analytics', path: '/analytics', icon: '📈' },
  { name: 'Decision', path: '/decision', icon: '🎯' },
  { name: 'Guides', path: '/guides', icon: '📚' },
];

export default function GrowModule() {
  const { loadSites, sites } = useSites();

  // Load sites on module mount
  useEffect(() => {
    loadSites();
  }, [loadSites]);

  return (
    <>
      <ModuleNav items={growNavItems} basePath="/grow" />
      {/* Site Selector Bar (only shows if sites exist) */}
      {sites.length > 0 && (
        <div className="px-4 md:px-6 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto">
            <SiteSelector compact />
          </div>
        </div>
      )}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    </>
  );
}
