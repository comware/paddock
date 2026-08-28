/**
 * Grow Module Routes
 *
 * Site-centric routing structure:
 * - /grow → Sites overview (landing)
 * - /grow/site/:siteId → Site detail with nested routes
 * - /grow/analytics → Cross-site analytics
 * - /grow/decision → variety scorecard
 * - /grow/guides → Reference material
 */

import type { RouteObject } from 'react-router-dom';
import { TrayList } from './components/Trays';
import { SiteList, SitesOverview, SiteDetailLayout, SiteDashboard } from './components/Sites';
import { DefaultSiteRedirect } from './components/Sites';
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
      // Calendar is site-scoped in the navigation now, so the module-level tab can go.
      // The /grow/calendar route below stays as an alias: links, bookmarks and anything
      // an agent has been told about must keep working.
      { path: 'calendar', element: <PlantingCalendar /> },
    ],
  },

  // Site management page
  { path: 'sites/manage', element: <SiteList /> },

  // Global views (cross-site)
  { path: 'calendar', element: <PlantingCalendar /> },
  { path: 'analytics', element: <AnalyticsPage /> },
  { path: 'decision', element: <DecisionPage /> },
  { path: 'guides', element: <GuideLibrary /> },

  // Site-less aliases, kept for links, bookmarks and the mobile navigation.
  //
  // These used to render the page without a greenhouse: /grow/time showed "No Site
  // Selected", and the others silently worked across every greenhouse at once. They
  // redirect into the default greenhouse now, which is what an alias should do. The
  // fallback renders only when there is no greenhouse to redirect into.
  {
    path: 'trays',
    element: <DefaultSiteRedirect to="trays" fallback={<TrayList />} />,
  },
  // TrayList never read the :id parameter, so this always rendered the plain list -
  // outside a greenhouse, where it had almost nothing to show. The planner and the
  // welcome modal both link here. Redirect to the greenhouse's tray list, which is what
  // the link was reaching for.
  {
    path: 'trays/:id',
    element: <DefaultSiteRedirect to="trays" fallback={<TrayList />} />,
  },
  {
    path: 'daily',
    element: <DefaultSiteRedirect to="daily" fallback={<DailyLogPage />} />,
  },
  {
    path: 'time',
    element: <DefaultSiteRedirect to="time" fallback={<TimeTrackingPage />} />,
  },
  { path: 'sites', element: <SiteList /> },
];
