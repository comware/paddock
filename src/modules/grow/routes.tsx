/**
 * Grow Module Routes
 *
 * Site-centric routing structure:
 * - /grow → Sites overview (landing)
 * - /grow/site/:siteId → Site detail with nested routes
 * - /grow/analytics → Cross-site analytics
 * - /grow/decision → Week 6 decision
 * - /grow/guides → Reference material
 */

import type { RouteObject } from 'react-router-dom';
import { TrayList } from './components/Trays';
import { SiteList, SitesOverview, SiteDetailLayout, SiteDashboard } from './components/Sites';
import { GuideLibrary } from './components/Guides';
import { PlantingCalendar } from './components/Calendar';
import { DailyLogPage, TimeTrackingPage, AnalyticsPage, DecisionPage } from './pages';

export const growRoutes: RouteObject[] = [
  // Sites overview as landing page
  { index: true, element: <SitesOverview /> },

  // Site detail with nested routes
  {
    path: 'site/:siteId',
    element: <SiteDetailLayout />,
    children: [
      { index: true, element: <SiteDashboard /> },
      { path: 'trays', element: <TrayList /> },
      { path: 'trays/:id', element: <TrayList /> },
      { path: 'daily', element: <DailyLogPage /> },
      { path: 'time', element: <TimeTrackingPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
    ],
  },

  // Site management page
  { path: 'sites/manage', element: <SiteList /> },

  // Global views (cross-site)
  { path: 'calendar', element: <PlantingCalendar /> },
  { path: 'analytics', element: <AnalyticsPage /> },
  { path: 'decision', element: <DecisionPage /> },
  { path: 'guides', element: <GuideLibrary /> },

  // Legacy routes - redirect to site-centric equivalents
  // These can be removed after migration period
  { path: 'trays', element: <TrayList /> },
  { path: 'daily', element: <DailyLogPage /> },
  { path: 'time', element: <TimeTrackingPage /> },
  { path: 'sites', element: <SiteList /> },
];
