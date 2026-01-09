/**
 * AnalyticsPage - Analytics with variety and trends views
 */

import { useState } from 'react';
import { VarietyComparison, TrendCharts } from '../components/Analytics';

export function AnalyticsPage() {
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
