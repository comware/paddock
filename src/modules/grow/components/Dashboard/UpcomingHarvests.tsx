/**
 * UpcomingHarvests - Dashboard widget showing harvests for the next 7 days
 *
 * Displays upcoming harvests grouped by date, with overdue trays highlighted.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrays, useVarieties, useSites } from '../../stores';
import {
  getUpcomingHarvests,
  groupHarvestsByDate,
  getHarvestBadgeClasses,
  type HarvestsByDate,
} from '../../utils';

interface UpcomingHarvestsProps {
  /** Number of days to look ahead (default 7) */
  daysAhead?: number;
  /** Maximum items to show per date group */
  maxPerGroup?: number;
}

export function UpcomingHarvests({ daysAhead = 7, maxPerGroup = 3 }: UpcomingHarvestsProps) {
  const navigate = useNavigate();
  const { trays } = useTrays();
  const { getVariety } = useVarieties();
  const { sites } = useSites();

  // Calculate upcoming harvests
  const harvestGroups = useMemo((): HarvestsByDate[] => {
    // Filter to only active trays
    const activeTrays = trays.filter(
      (t) => t.status === 'blackout' || t.status === 'light'
    );

    const upcoming = getUpcomingHarvests(activeTrays, getVariety, daysAhead);
    return groupHarvestsByDate(upcoming);
  }, [trays, getVariety, daysAhead]);

  // Calculate totals
  const totalUpcoming = harvestGroups.reduce((sum, g) => sum + g.harvests.length, 0);
  const overdueCount = harvestGroups.find((g) => g.dateLabel === 'Overdue')?.harvests.length ?? 0;

  // Get site name helper
  const getSiteName = (siteId: string | undefined) => {
    if (!siteId) return null;
    return sites.find((s) => s.id === siteId)?.name;
  };

  if (totalUpcoming === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Upcoming Harvests
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Next {daysAhead} days
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-center py-8">
          No harvests expected in the next {daysAhead} days.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Upcoming Harvests
          </h2>
          {overdueCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium animate-pulse">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/grow/trays')}
          className="text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          View All →
        </button>
      </div>

      {/* Harvest Groups */}
      <div className="space-y-4">
        {harvestGroups.map((group) => (
          <div key={group.dateLabel} className="space-y-2">
            {/* Date Header */}
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  group.dateLabel === 'Overdue'
                    ? 'text-red-600 dark:text-red-400'
                    : group.dateLabel === 'Today'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {group.dateLabel}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({group.harvests.length} tray{group.harvests.length !== 1 ? 's' : ''})
              </span>
            </div>

            {/* Harvest Items */}
            <div className="space-y-2">
              {group.harvests.slice(0, maxPerGroup).map((harvest) => {
                const siteName = getSiteName(harvest.siteId);
                return (
                  <div
                    key={harvest.trayId}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                      group.dateLabel === 'Overdue'
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                        : group.dateLabel === 'Today'
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                    }`}
                    onClick={() => navigate(`/grow/trays/${harvest.trayId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🌿</span>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {harvest.trayLabel || `#${harvest.trayNumber}`} - {harvest.variety}
                        </div>
                        {siteName && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {siteName}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getHarvestBadgeClasses(harvest.status)}`}
                    >
                      {harvest.daysRemaining < 0
                        ? `${Math.abs(harvest.daysRemaining)}d overdue`
                        : harvest.daysRemaining === 0
                        ? 'Today'
                        : `${harvest.daysRemaining}d`}
                    </span>
                  </div>
                );
              })}

              {/* Show more link if truncated */}
              {group.harvests.length > maxPerGroup && (
                <button
                  onClick={() => navigate('/grow/trays')}
                  className="w-full py-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
                >
                  +{group.harvests.length - maxPerGroup} more
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {totalUpcoming} harvest{totalUpcoming !== 1 ? 's' : ''} in next {daysAhead} days
          </span>
          {overdueCount > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              {overdueCount} need attention
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
