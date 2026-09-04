/**
 * DailyLogPage - Daily logging with form and history views
 */

import { useState } from 'react';
import { DailyLogForm, LogHistory } from '../components/DailyLog';

export function DailyLogPage() {
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
