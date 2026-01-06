/**
 * Grow Module - Entry Point
 *
 * Microgreens experiment tracking module.
 * Handles tray management, daily logging, time tracking,
 * analytics, and Week 6 decision support.
 */

import { Outlet } from 'react-router-dom';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';

const growNavItems: ModuleNavItem[] = [
  { name: 'Dashboard', path: '', icon: '📊' },
  { name: 'Trays', path: '/trays', icon: '🌱' },
  { name: 'Daily Log', path: '/daily', icon: '📝' },
  { name: 'Time', path: '/time', icon: '⏱️' },
  { name: 'Analytics', path: '/analytics', icon: '📈' },
  { name: 'Decision', path: '/decision', icon: '🎯' },
];

export default function GrowModule() {
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
