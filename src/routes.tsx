/**
 * Paddock Platform Routes
 *
 * Root routing configuration with lazy-loaded modules.
 */

import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from '@/components/Shell';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { growRoutes } from '@/modules/grow/routes';

// Lazy-loaded modules
const GrowModule = lazy(() => import('@/modules/grow'));
const SettingsModule = lazy(() => import('@/modules/settings'));

// Loading fallback
function ModuleLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse">🌱</div>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Loading...</p>
      </div>
    </div>
  );
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      // Default redirect to Grow module
      { index: true, element: <Navigate to="/grow" replace /> },

      // Grow module
      {
        path: 'grow',
        element: (
          <Suspense fallback={<ModuleLoader />}>
            <GrowModule />
          </Suspense>
        ),
        children: growRoutes,
      },

      // Future modules (placeholders)
      {
        path: 'sales/*',
        element: <ComingSoon module="Sales" />,
      },
      {
        path: 'markets/*',
        element: <ComingSoon module="Markets" />,
      },
      {
        path: 'crm/*',
        element: <ComingSoon module="CRM" />,
      },
      {
        path: 'finance/*',
        element: <ComingSoon module="Finance" />,
      },
      {
        path: 'planner/*',
        element: <ComingSoon module="Planner" />,
      },

      // Platform settings
      {
        path: 'settings/*',
        element: (
          <Suspense fallback={<ModuleLoader />}>
            <SettingsModule />
          </Suspense>
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
