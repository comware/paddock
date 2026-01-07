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

import { useState } from 'react';
import type { RouteObject } from 'react-router-dom';
import { TrayList } from './components/Trays';
import { SiteList, SitesOverview, SiteDetailLayout, SiteDashboard } from './components/Sites';
import { DailyLogForm, LogHistory } from './components/DailyLog';
import { TimeEntryForm, TimeStats } from './components/TimeEntry';
import { VarietyComparison, TrendCharts } from './components/Analytics';
import { Scorecard } from './components/Decision';
import { GuideLibrary } from './components/Guides';
import { PlantingCalendar } from './components/Calendar';

// ============================================
// DAILY LOG PAGE
// ============================================

function DailyLogPage() {
  const [view, setView] = useState<'form' | 'history'>('form');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('form')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            view === 'form'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Today's Log
        </button>
        <button
          type="button"
          onClick={() => setView('history')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            view === 'history'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      {view === 'form' ? <DailyLogForm /> : <LogHistory />}
    </div>
  );
}

// ============================================
// TIME TRACKING PAGE
// ============================================

function TimeTrackingPage() {
  const [view, setView] = useState<'log' | 'stats'>('log');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('log')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            view === 'log'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Log Time
        </button>
        <button
          type="button"
          onClick={() => setView('stats')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            view === 'stats'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Weekly Stats
        </button>
      </div>

      {/* Content */}
      {view === 'log' ? <TimeEntryForm /> : <TimeStats />}
    </div>
  );
}

// ============================================
// ANALYTICS PAGE
// ============================================

function AnalyticsPage() {
  const [view, setView] = useState<'variety' | 'trends'>('variety');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('variety')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            view === 'variety'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          By Variety
        </button>
        <button
          type="button"
          onClick={() => setView('trends')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            view === 'trends'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Trends
        </button>
      </div>

      {/* Content */}
      {view === 'variety' ? <VarietyComparison /> : <TrendCharts />}
    </div>
  );
}

// ============================================
// DECISION PAGE
// ============================================

function DecisionPage() {
  return <Scorecard />;
}

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
