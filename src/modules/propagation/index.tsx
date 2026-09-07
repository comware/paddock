/**
 * Propagation Module - Entry Point
 *
 * Propagation batch tracking module.
 * Handles batch creation, monitoring, and management
 * for plant propagation activities.
 *
 * Wrapped in ErrorBoundary for module isolation.
 */

import { useRoutes } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Sprout,
  ChartLine,
  Settings,
} from 'lucide-react';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { propagationRoutes } from './routes';

// Navigation items for the propagation module
const propagationNavItems: ModuleNavItem[] = [
  { name: 'Dashboard', path: '', Icon: LayoutDashboard },
  { name: 'Batches', path: '/batches', Icon: ClipboardList },
  { name: 'Mother Plants', path: '/mother-plants', Icon: Sprout },
  { name: 'Analytics', path: '/analytics', Icon: ChartLine },
  { name: 'Settings', path: '/settings', Icon: Settings },
  // Guides last, in every module. It is reference material rather than somewhere you work,
  // so it sits at the end rather than second, where it used to push Batches down the row.
  { name: 'Guides', path: '/guides', Icon: BookOpen },
];

function PropagationModuleContent() {
  // Render child routes internally — keeps route definitions inside the lazy boundary
  const routeElement = useRoutes(propagationRoutes);

  return (
    <>
      <ModuleNav items={propagationNavItems} basePath="/propagation" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {routeElement}
        </div>
      </div>
    </>
  );
}

export default function PropagationModule() {
  return (
    <ErrorBoundary
      section="Propagation Module"
      module="propagation"
      showModuleNav
    >
      <PropagationModuleContent />
    </ErrorBoundary>
  );
}
