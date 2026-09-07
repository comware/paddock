/**
 * AnalyticsPage - Analytics with variety and trends views
 */

import { PageHeader } from '@/components/shared';
import { useState } from 'react';
import {
  VarietyComparison,
  TrendCharts,
  TimingAccuracy,
  WeatherOutcome,
} from '../components/Analytics';
import { Scorecard } from '../components/Decision';

type View = 'timing' | 'weather' | 'variety' | 'trends' | 'scorecard';

const VIEWS: Array<{ id: View; label: string }> = [
  // Timing leads: how long things actually take here is the figure worth planning
  // against, and the one the app is uniquely placed to know.
  { id: 'timing', label: 'Timing' },
  { id: 'weather', label: 'Weather' },
  { id: 'variety', label: 'By Variety' },
  { id: 'trends', label: 'Trends' },
  // Was a top-level 'Decision' tab. It compares varieties and recommends what to grow,
  // which is analytics - the separate tab was an artefact of the six-week experiment.
  { id: 'scorecard', label: 'Scorecard' },
];

/**
 * Rendered in two places: on its own at /microgreens/analytics, and inside a growing space,
 * where SiteDetailLayout has already titled the page with the space's name. Only the
 * standalone one supplies a title - two <h1>s on a page is worse than none.
 */
export function AnalyticsPage({ withinSite = false }: { withinSite?: boolean }) {
  const [view, setView] = useState<View>('timing');

  return (
    <div className="space-y-4">
      {!withinSite && (
        <PageHeader
          title="All spaces"
          description="Every growing space compared, rather than one at a time."
        />
      )}

      {/*
        * Tabs styled like the module bar and the growing-space tabs: a tinted active pill,
        * not a solid green fill. This was the app's third idiom for the same control.
        */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {VIEWS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            aria-pressed={view === tab.id}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              view === tab.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'timing' && <TimingAccuracy />}
      {view === 'weather' && <WeatherOutcome />}
      {view === 'variety' && <VarietyComparison />}
      {view === 'trends' && <TrendCharts />}
      {view === 'scorecard' && <Scorecard />}
    </div>
  );
}
