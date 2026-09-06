/**
 * Vegetables Module - Entry Point
 *
 * Bed and succession tracking module.
 * Handles bed setup, planting successions, and harvests logged
 * over weeks.
 *
 * Wrapped in ErrorBoundary for module isolation.
 */

import { useRoutes } from 'react-router-dom';
import { LayoutDashboard, Grid2x2, Sprout, BookOpen } from 'lucide-react';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { vegetablesRoutes } from './routes';

// Navigation items for the vegetables module
const vegetablesNavItems: ModuleNavItem[] = [
  { name: 'Dashboard', path: '', Icon: LayoutDashboard },
  { name: 'Beds', path: '/beds', Icon: Grid2x2 },
  { name: 'Plantings', path: '/plantings', Icon: Sprout },
  { name: 'Guides', path: '/guides', Icon: BookOpen },
];

function VegetablesModuleContent() {
  // Render child routes internally — keeps route definitions inside the lazy boundary
  const routeElement = useRoutes(vegetablesRoutes);

  return (
    <>
      <ModuleNav items={vegetablesNavItems} basePath="/vegetables" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {routeElement}
        </div>
      </div>
    </>
  );
}

export default function VegetablesModule() {
  return (
    <ErrorBoundary
      section="Vegetables Module"
      module="vegetables"
      showModuleNav
    >
      <VegetablesModuleContent />
    </ErrorBoundary>
  );
}
