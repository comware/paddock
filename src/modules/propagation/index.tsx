/**
 * Propagation Module - Entry Point
 *
 * Propagation batch tracking module.
 * Handles batch creation, monitoring, and management
 * for plant propagation activities.
 */

import { Outlet } from 'react-router-dom';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';

// Navigation items for the propagation module
const propagationNavItems: ModuleNavItem[] = [
  { name: 'Dashboard', path: '', icon: '📊' },       // Dashboard (landing)
  { name: 'Batches', path: '/batches', icon: '📋' }, // Batch list
];

export default function PropagationModule() {
  return (
    <>
      <ModuleNav items={propagationNavItems} basePath="/propagation" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    </>
  );
}
