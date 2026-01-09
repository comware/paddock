/**
 * Paddock Platform Routes
 *
 * Root routing configuration with lazy-loaded modules.
 * Landing page at / introduces the platform to new users.
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/Shell';
import { ComingSoon, ModuleLoader } from '@/components/shared';
import { growRoutes } from '@/modules/grow/routes';

// Lazy-loaded modules and pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const GrowModule = lazy(() => import('@/modules/grow'));
const SettingsModule = lazy(() => import('@/modules/settings'));

const routes: RouteObject[] = [
  // Landing page - standalone (outside AppShell)
  {
    path: '/',
    element: (
      <Suspense fallback={<ModuleLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },

  // Main app routes with AppShell layout
  {
    path: '/',
    element: <AppShell />,
    children: [
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
