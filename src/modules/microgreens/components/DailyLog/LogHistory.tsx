/**
 * LogHistory - Displays recent daily observation entries
 *
 * Shows mood trend, key learnings, and allows viewing past entries.
 */

import { LoadingState } from '@/components/shared';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { useObservations } from '../../stores';

// Mood emoji lookup
const moodEmoji: Record<number, string> = {
  1: '😫', 2: '😩', 3: '😔', 4: '😕', 5: '😐',
  6: '🙂', 7: '😊', 8: '😄', 9: '🤩', 10: '🔥',
};

export function LogHistory() {
  const { observations, loadObservations, isLoading, getAverageMood } = useObservations();

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  const recentLogs = observations.slice(0, 14); // Last 2 weeks
  const avgMood = getAverageMood(7);

  if (isLoading) {
    return (
      <LoadingState />
    );
  }

  if (recentLogs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">📝</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
          No logs yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Start logging your daily observations to track your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl mb-1">
            {avgMood ? moodEmoji[Math.round(avgMood)] : '—'}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Avg Mood (7d)</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {avgMood?.toFixed(1) ?? '—'}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl mb-1">📅</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total Logs</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {observations.length}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl mb-1">🎯</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">This Week</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {observations.filter((o) => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(o.date) >= weekAgo;
            }).length}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl mb-1">💡</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Learnings</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {observations.filter((o) => o.keyLearning).length}
          </div>
        </div>
      </div>

      {/* Log Entries */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Recent Entries
        </h3>
        {recentLogs.map((log) => (
          <div
            key={log.id}
            className="card p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Date & Mood */}
              <div className="flex-shrink-0 text-center w-16">
                <div className="text-2xl">
                  {log.moodEnergy ? moodEmoji[log.moodEnergy] : '📝'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {format(new Date(log.date), 'MMM d')}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {format(new Date(log.date), 'EEEE')}
                  </span>
                  {log.moodEnergy && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Mood: {log.moodEnergy}/10
                    </span>
                  )}
                </div>

                {/* Environment snapshot */}
                {(log.temperature || log.humidity || log.traysBlackout || log.traysLight) && (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {log.temperature && (
                      <span>🌡️ {log.temperature}°C</span>
                    )}
                    {log.humidity && (
                      <span>💧 {log.humidity}%</span>
                    )}
                    {(log.traysBlackout !== undefined && log.traysBlackout > 0) && (
                      <span>🌑 {log.traysBlackout} blackout</span>
                    )}
                    {(log.traysLight !== undefined && log.traysLight > 0) && (
                      <span>☀️ {log.traysLight} light</span>
                    )}
                  </div>
                )}

                {/* Problems */}
                {log.problemsSpotted && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                    ⚠️ {log.problemsSpotted}
                  </p>
                )}

                {/* Key Learning */}
                {log.keyLearning && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    💡 {log.keyLearning}
                  </p>
                )}

                {/* Tomorrow's priority */}
                {log.tomorrowPriority && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    → {log.tomorrowPriority}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
