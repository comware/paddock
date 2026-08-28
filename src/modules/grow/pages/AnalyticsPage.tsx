/**
 * AnalyticsPage - Analytics with variety and trends views
 */

import { useState } from 'react';
import { VarietyComparison, TrendCharts, TimingAccuracy } from '../components/Analytics';

type View = 'timing' | 'variety' | 'trends';

const VIEWS: Array<{ id: View; label: string }> = [
  // Timing leads: how long things actually take here is the figure worth planning
  // against, and the one the app is uniquely placed to know.
  { id: 'timing', label: 'Timing' },
  { id: 'variety', label: 'By Variety' },
  { id: 'trends', label: 'Trends' },
];

export function AnalyticsPage() {
  const [view, setView] = useState<View>('timing');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        {VIEWS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            aria-pressed={view === tab.id}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'timing' && <TimingAccuracy />}
      {view === 'variety' && <VarietyComparison />}
      {view === 'trends' && <TrendCharts />}
    </div>
  );
}
