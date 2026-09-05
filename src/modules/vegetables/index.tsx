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
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { vegetablesRoutes } from './routes';

// Navigation items for the vegetables module
const vegetablesNavItems: ModuleNavItem[] = [
  { name: 'Dashboard', path: '', icon: '📊' },        // Dashboard (landing)
  { name: 'Beds', path: '/beds', icon: '🛏️' },        // Bed list
  { name: 'Plantings', path: '/plantings', icon: '🥕' }, // Planting list
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
