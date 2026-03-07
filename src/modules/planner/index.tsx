/**
 * Planner Module - Entry Point
 *
 * Crop calendar module for scheduling and tracking farming activities.
 * Integrates events from Grow (trays) and Propagation (batches) modules.
 *
 * Wrapped in ErrorBoundary for module isolation.
 */

import { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import { ModuleNav, type ModuleNavItem } from '@/components/Shell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePlannerStore } from './stores/usePlannerStore';
import { plannerRoutes } from './routes';

// Navigation items for the planner module
const plannerNavItems: ModuleNavItem[] = [
  { name: 'Calendar', path: '', icon: '📅' },           // Calendar (landing)
  // Future nav items:
  // { name: 'Events', path: '/events', icon: '📋' },   // Event list
  // { name: 'Upcoming', path: '/upcoming', icon: '⏰' }, // Upcoming events
];

function PlannerModuleContent() {
  const { loadEvents } = usePlannerStore();

  // Load events on module mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Render child routes internally — keeps route definitions inside the lazy boundary
  const routeElement = useRoutes(plannerRoutes);

  return (
    <>
      <ModuleNav items={plannerNavItems} basePath="/planner" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {routeElement}
        </div>
      </div>
    </>
  );
}

export default function PlannerModule() {
  return (
    <ErrorBoundary
      section="Planner Module"
      module="planner"
      showModuleNav
    >
      <PlannerModuleContent />
    </ErrorBoundary>
  );
}
