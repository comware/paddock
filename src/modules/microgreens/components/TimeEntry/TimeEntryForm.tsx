/**
 * TimeEntryForm - Quick time logging with category buttons
 *
 * Designed for fast entry with +5, +15, +30 minute increments.
 * Shows today's totals per category with live updates.
 */

import { LoadingState } from '@/components/shared';
import { useEffect, useState } from 'react';
import { useTimeEntries, TIME_CATEGORIES, type TimeCategory } from '../../stores';
import { useSiteContext } from '../Sites/SiteContext';
import { TimeSuggestion } from './TimeSuggestion';

const QUICK_INCREMENTS = [5, 15, 30];

export function TimeEntryForm() {
  const {
    loadEntries,
    getTodaysEntryForSite,
    addTimeToCategory,
    isLoading,
  } = useTimeEntries();

  // Use site from context if available (inside SiteDetailLayout)
  const { siteId } = useSiteContext();

  const [activeCategory, setActiveCategory] = useState<TimeCategory | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Get today's entry for this site
  const todaysEntry = siteId ? getTodaysEntryForSite(siteId) : null;

  // Calculate today's total from entry
  const todaysTotal = todaysEntry
    ? TIME_CATEGORIES.reduce((sum, cat) => sum + ((todaysEntry[cat.value] as number) || 0), 0)
    : 0;

  const handleQuickAdd = async (category: TimeCategory, minutes: number) => {
    if (!siteId) return;
    setIsAdding(true);
    setActiveCategory(category);
    try {
      await addTimeToCategory(category, minutes, siteId);
    } finally {
      setIsAdding(false);
      setActiveCategory(null);
    }
  };

  const getCategoryValue = (category: TimeCategory): number => {
    if (!todaysEntry) return 0;
    return (todaysEntry[category] as number) || 0;
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <LoadingState />
    );
  }

  // No site selected - show prompt to select one
  if (!siteId) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📍</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No Site Selected
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Please select a site to log time for.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Log Time
          </h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {formatTime(todaysTotal)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Today's total
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tap a category, then tap time to add. Quick and simple.
        </p>
      </div>

      {/* Offer the day's time rather than asking for it. Renders nothing when there is
          no activity to estimate from, or when time is already logged. */}
      <TimeSuggestion siteId={siteId} alreadyLogged={todaysTotal > 0} />

      {/* Category Cards */}
      <div className="space-y-3">
        {TIME_CATEGORIES.map((cat) => {
          const currentValue = getCategoryValue(cat.value);
          const isActive = activeCategory === cat.value;

          return (
            <div
              key={cat.value}
              className={`card p-4 transition-all ${
                isActive ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Icon & Label */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {cat.label}
                    </div>
                    {currentValue > 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Today: {formatTime(currentValue)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex gap-2">
                  {QUICK_INCREMENTS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleQuickAdd(cat.value, mins)}
                      disabled={isAdding}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all
                        ${isAdding && isActive
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      +{mins}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress bar for today's time in this category */}
              {currentValue > 0 && (
                <div className="mt-3 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.min((currentValue / 120) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Entry Option */}
      <div className="card p-4">
        <CustomTimeEntry siteId={siteId} onAdd={addTimeToCategory} />
      </div>
    </div>
  );
}

// ============================================
// Custom Time Entry Subcomponent
// ============================================

interface CustomTimeEntryProps {
  siteId: string;
  onAdd: (category: TimeCategory, minutes: number, siteId?: string) => Promise<void>;
}

function CustomTimeEntry({ siteId, onAdd }: CustomTimeEntryProps) {
  const [category, setCategory] = useState<TimeCategory>('other');
  const [minutes, setMinutes] = useState<number>(15);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (minutes <= 0 || !siteId) return;
    setIsAdding(true);
    try {
      await onAdd(category, minutes, siteId);
      setMinutes(15); // Reset
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Custom Entry
      </h3>
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TimeCategory)}
          className="input flex-1 min-w-[150px]"
        >
          {TIME_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
            className="input w-20 text-center"
            min={1}
            max={480}
          />
          <span className="text-slate-500 dark:text-slate-400">min</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding || minutes <= 0}
          className="btn btn-primary"
        >
          {isAdding ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  );
}
