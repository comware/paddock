/**
 * RecentActivity - Dashboard widget showing recent stage transitions
 *
 * Displays the last N stage transitions with compact timestamps
 * and links to affected batches.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propDb, toKey } from '@/lib/db';
import type { PropStageTransition } from '../../types';
import { STAGE_DISPLAY_NAMES, STAGE_COLORS } from '../../utils/stageHelpers';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  /** Maximum number of activities to show */
  maxItems?: number;
}

interface ActivityItem extends PropStageTransition {
  batchNumber?: string;
  species?: string;
}

export function RecentActivity({ maxItems = 10 }: RecentActivityProps) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecentActivity() {
      try {
        // Get recent stage transitions
        const transitions = await propDb.stageTransitions
          .orderBy('transitionDate')
          .reverse()
          .limit(maxItems)
          .toArray();

        // Enrich with batch info
        const enriched: ActivityItem[] = [];
        for (const transition of transitions) {
          if (transition.batchId) {
            // transition.batchId is a foreign key looking up the row it points at,
            // so it goes through toKey. See src/lib/db/keys.ts.
            const batch = await propDb.batches.get(toKey(transition.batchId));
            enriched.push({
              ...transition,
              batchNumber: batch?.batchNumber,
              species: batch?.species,
            });
          } else {
            enriched.push(transition);
          }
        }

        setActivities(enriched);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load recent activity:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRecentActivity();
  }, [maxItems]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">📝</span>
          <p className="text-slate-500 dark:text-slate-400">
            No activity yet. Stage transitions will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm" aria-live="polite">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Recent Activity
      </h2>

      <div className="space-y-2">
        {activities.map((activity) => {
          const toColors = STAGE_COLORS[activity.toStage];
          const fromColors = activity.fromStage ? STAGE_COLORS[activity.fromStage] : null;

          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              onClick={() =>
                activity.batchId && navigate(`/propagation/batches/${activity.batchId}`)
              }
            >
              {/* Stage transition icon */}
              <div className="shrink-0">
                {activity.toStage === 'failed' ? (
                  <span className="text-lg">❌</span>
                ) : activity.toStage === 'graduated' ? (
                  <span className="text-lg">🎓</span>
                ) : (
                  <span className="text-lg">→</span>
                )}
              </div>

              {/* Activity content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 dark:text-white">
                  <span className="font-medium">
                    {activity.batchNumber || 'Unknown batch'}
                  </span>
                  {activity.species && (
                    <span className="text-slate-500 dark:text-slate-400 ml-1">
                      ({activity.species})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {activity.fromStage && fromColors && (
                    <>
                      <span className={`${fromColors.text}`}>
                        {STAGE_DISPLAY_NAMES[activity.fromStage]}
                      </span>
                      <span className="text-slate-400">→</span>
                    </>
                  )}
                  <span className={`font-medium ${toColors.text}`}>
                    {STAGE_DISPLAY_NAMES[activity.toStage]}
                  </span>
                  {activity.quantityBefore !== undefined &&
                    activity.quantityAfter !== undefined &&
                    activity.quantityBefore !== activity.quantityAfter && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        ({activity.quantityAfter}/{activity.quantityBefore} survived)
                      </span>
                    )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                {formatDistanceToNow(new Date(activity.transitionDate), {
                  addSuffix: true,
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
