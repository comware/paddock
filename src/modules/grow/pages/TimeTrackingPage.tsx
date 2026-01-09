/**
 * TimeTrackingPage - Time logging with log and stats views
 */

import { useState } from 'react';
import { TimeEntryForm, TimeStats } from '../components/TimeEntry';

export function TimeTrackingPage() {
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
