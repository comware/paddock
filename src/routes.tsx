/**
 * Paddock Platform Routes
 *
 * Root routing configuration with lazy-loaded modules.
 * Landing page at / introduces the platform to new users.
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { GrowRedirect } from '@/components/GrowRedirect';
import { AppShell } from '@/components/Shell';
import { ComingSoon, ModuleLoader } from '@/components/shared';
import { RootLayout } from '@/components/Shell';

// Lazy-loaded modules and pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const MicrogreensModule = lazy(() => import('@/modules/microgreens'));
const PropagationModule = lazy(() => import('@/modules/propagation'));
const VegetablesModule = lazy(() => import('@/modules/vegetables'));
const SettingsModule = lazy(() => import('@/modules/settings'));


const routes: RouteObject[] = [
  // Root wrapper - provides router context for WelcomeModal
  {
    element: <RootLayout />,
    children: [
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
          // Microgreens module (formerly "grow") — wildcard delegates sub-routing to module
          {
            path: 'microgreens/*',
            element: (
              <Suspense fallback={<ModuleLoader />}>
                <MicrogreensModule />
              </Suspense>
            ),
          },

          // Redirect the old /grow path, preserving sub-path/query/hash
          { path: 'grow/*', element: <GrowRedirect /> },

          // Propagation module — wildcard delegates sub-routing to module
          {
            path: 'propagation/*',
            element: (
              <Suspense fallback={<ModuleLoader />}>
                <PropagationModule />
              </Suspense>
            ),
          },

          // Vegetables module — wildcard delegates sub-routing to module
          {
            path: 'vegetables/*',
            element: (
              <Suspense fallback={<ModuleLoader />}>
                <VegetablesModule />
              </Suspense>
            ),
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
          /*
           * /planner redirects rather than rendering.
           *
           * The planner module is a second, unfinished calendar. Nothing linked to it - not
           * the top nav, not the mobile nav, not the module list in Settings - so it could
           * not be reached, enabled or turned off, and being unreachable it had quietly
           * rotted: no heading of any kind, unreadable in dark mode, and 35 tap targets
           * under 32px. The calendar growers actually use is the one in a growing space,
           * which shares no code with it.
           *
           * The module's files are still in the tree. Deleting them is a bigger decision
           * than removing a broken route, and this stops anyone landing on it meanwhile.
           */
          { path: 'planner/*', element: <Navigate to="/microgreens/calendar" replace /> },

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
    ],
  },
];

export const router = createBrowserRouter(routes);
