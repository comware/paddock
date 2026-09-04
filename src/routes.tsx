/**
 * Paddock Platform Routes
 *
 * Root routing configuration with lazy-loaded modules.
 * Landing page at / introduces the platform to new users.
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/Shell';
import { ComingSoon, ModuleLoader } from '@/components/shared';
import { WelcomeModal } from '@/components/onboarding';

// Lazy-loaded modules and pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const MicrogreensModule = lazy(() => import('@/modules/microgreens'));
const PropagationModule = lazy(() => import('@/modules/propagation'));
const PlannerModule = lazy(() => import('@/modules/planner'));
const SettingsModule = lazy(() => import('@/modules/settings'));

/**
 * Paddock's grow module became microgreens when vegetables arrived as a sibling rather
 * than something feeding it. Links, bookmarks, keyboard shortcuts and the WebMCP tool
 * descriptions all still say /grow, so redirect rather than 404 - the module's own routes
 * file already keeps aliases for the same reason.
 */
function GrowRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={pathname.replace(/^\/grow/, '/microgreens') + search + hash} replace />;
}

// Root layout wrapper that provides router context for components like WelcomeModal
function RootLayout() {
  return (
    <>
      <WelcomeModal />
      <Outlet />
    </>
  );
}

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
          // Planner module — wildcard delegates sub-routing to module
          {
            path: 'planner/*',
            element: (
              <Suspense fallback={<ModuleLoader />}>
                <PlannerModule />
              </Suspense>
            ),
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
    ],
  },
];

export const router = createBrowserRouter(routes);
