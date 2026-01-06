/**
 * Grow Module Routes
 *
 * Defines the routing structure for the Grow module.
 */

import { useState } from 'react';
import type { RouteObject } from 'react-router-dom';
import { GrowDashboard } from './components/Dashboard';
import { TrayList } from './components/Trays';
import { SiteList } from './components/Sites';
import { DailyLogForm, LogHistory } from './components/DailyLog';
import { TimeEntryForm, TimeStats } from './components/TimeEntry';
import { VarietyComparison, TrendCharts } from './components/Analytics';
import { Scorecard } from './components/Decision';
import { GuideLibrary } from './components/Guides';

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
  { index: true, element: <GrowDashboard /> },
  { path: 'trays', element: <TrayList /> },
  { path: 'trays/:id', element: <TrayList /> },
  { path: 'sites', element: <SiteList /> },
  { path: 'daily', element: <DailyLogPage /> },
  { path: 'time', element: <TimeTrackingPage /> },
  { path: 'analytics', element: <AnalyticsPage /> },
  { path: 'decision', element: <DecisionPage /> },
  { path: 'guides', element: <GuideLibrary /> },
];
