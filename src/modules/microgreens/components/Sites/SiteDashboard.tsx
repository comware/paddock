/**
 * SiteDashboard - Site-specific overview dashboard
 *
 * Shows:
 * - Key metrics for this site
 * - Action needed alerts
 * - Quick actions
 * - Recent activity
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSiteContext } from './SiteContext';
import { useTrays, useTimeEntries, useObservations, type TrayWithComputed } from '../../stores';
import { Sprout, CircleCheck, Scale, Timer } from 'lucide-react';
import { StatCard, StatCardGrid } from '@/components/shared';
import { UpcomingWork } from './UpcomingWork';
import { GettingStarted } from './GettingStarted';
import { NewTrayForm } from '../Trays/NewTrayForm';
import { HarvestForm } from '../Trays/HarvestForm';
import { format, addDays, isAfter, startOfDay } from 'date-fns';


// ============================================
// ACTION ITEM
// ============================================

interface ActionItemProps {
  icon: string;
  title: string;
  count: number;
  actionLabel: string;
  onClick: () => void;
  variant: 'warning' | 'success';
}

function ActionItem({ icon, title, count, actionLabel, onClick, variant }: ActionItemProps) {
  const bgClass = variant === 'warning'
    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';

  const textClass = variant === 'warning'
    ? 'text-orange-700 dark:text-orange-300'
    : 'text-green-700 dark:text-green-300';

  const btnClass = variant === 'warning'
    ? 'bg-orange-500 hover:bg-orange-600'
    : 'bg-green-500 hover:bg-green-600';

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${bgClass}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className={`font-medium ${textClass}`}>{title}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">{count} tray{count !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${btnClass}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ============================================
// SITE DASHBOARD
// ============================================

export function SiteDashboard() {
  const navigate = useNavigate();
  const { site, siteId } = useSiteContext();
  const { trays } = useTrays();
  const { getThisWeeksTotalForSite } = useTimeEntries();
  const { getTodaysObservationForSite } = useObservations();

  const [isNewTrayOpen, setIsNewTrayOpen] = useState(false);
  const [harvestingTray, setHarvestingTray] = useState<TrayWithComputed | null>(null);

  // Filter trays for this site
  const siteTrays = useMemo(() => {
    return trays.filter((t) => t.siteId === siteId);
  }, [trays, siteId]);

  // Compute metrics
  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const activeBlackout = siteTrays.filter((t) => t.status === 'blackout');
    const activeLight = siteTrays.filter((t) => t.status === 'light');
    const harvested = siteTrays.filter((t) => t.status === 'harvested');

    // Ready for light
    const readyForLight = activeBlackout.filter((t) => {
      const lightDate = addDays(new Date(t.dateSown), t.blackoutDays);
      return isAfter(today, lightDate);
    });

    // Ready to harvest (7+ days in light)
    const readyToHarvest = activeLight.filter((t) => t.daysInPhase >= 7);

    // Success rate
    const successCount = harvested.filter(
      (t) => t.qualityGrade === 'A' || t.qualityGrade === 'B'
    ).length;
    const successRate = harvested.length > 0
      ? Math.round((successCount / harvested.length) * 100)
      : 0;

    // Average yield ratio
    const withYield = harvested.filter((t) => t.yieldRatio !== null);
    const avgYield = withYield.length > 0
      ? Math.round((withYield.reduce((a, t) => a + (t.yieldRatio || 0), 0) / withYield.length) * 10) / 10
      : null;

    return {
      totalActive: activeBlackout.length + activeLight.length,
      blackoutCount: activeBlackout.length,
      lightCount: activeLight.length,
      harvestedCount: harvested.length,
      readyForLight,
      readyToHarvest,
      successRate,
      avgYield,
    };
  }, [siteTrays]);

  // Time this week
  const timeThisWeek = getThisWeeksTotalForSite(siteId);
  const hoursThisWeek = Math.round((timeThisWeek / 60) * 10) / 10;

  // Today's observation
  const todaysObservation = getTodaysObservationForSite(siteId);

  // Recent harvests
  const recentHarvests = useMemo(() => {
    return siteTrays
      .filter((t) => t.status === 'harvested' && t.dateHarvested)
      .sort((a, b) => new Date(b.dateHarvested!).getTime() - new Date(a.dateHarvested!).getTime())
      .slice(0, 3);
  }, [siteTrays]);

  if (!site) return null;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <StatCardGrid>
        <StatCard
          Icon={Sprout}
          value={metrics.totalActive}
          label="Active Trays"
          subValue={`${metrics.blackoutCount} blackout • ${metrics.lightCount} light`}
        />
        <StatCard
          Icon={CircleCheck}
          value={`${metrics.successRate}%`}
          label="Success Rate"
          subValue={`${metrics.harvestedCount} harvested`}
        />
        <StatCard
          Icon={Scale}
          value={metrics.avgYield ? `${metrics.avgYield}x` : '—'}
          label="Avg Yield"
          subValue="harvest/seed ratio"
        />
        <StatCard
          Icon={Timer}
          value={`${hoursThisWeek}h`}
          label="This Week"
          subValue="time logged"
        />
      </StatCardGrid>

      {/* Action Needed */}
      {(metrics.readyForLight.length > 0 || metrics.readyToHarvest.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Action Needed</h2>
          {metrics.readyForLight.length > 0 && (
            <ActionItem
              icon="💡"
              title="Ready for light"
              count={metrics.readyForLight.length}
              actionLabel="View Trays"
              onClick={() => navigate(`/grow/site/${siteId}/trays?status=blackout`)}
              variant="warning"
            />
          )}
          {metrics.readyToHarvest.length > 0 && (
            <ActionItem
              icon="🌿"
              title="Ready to harvest"
              count={metrics.readyToHarvest.length}
              actionLabel="Harvest Now"
              onClick={() => {
                const tray = metrics.readyToHarvest[0];
                if (tray) setHarvestingTray(tray);
              }}
              variant="success"
            />
          )}
        </div>
      )}

      {/* Until something has been sown, every panel below reads zero and none of them
          says what to do about it. Disappears for good once the first tray exists. */}
      {siteTrays.length === 0 && (
        <GettingStarted siteId={siteId} onNewTray={() => setIsNewTrayOpen(true)} />
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setIsNewTrayOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
        >
          + New tray
        </button>
      </div>

      {/* What this site needs next, first.
          'Quick Actions' used to sit here: four generic buttons - New Tray, Log Day, Log
          Time, Harvest - competing with a list below that names the specific tray and the
          specific sowing. 'Harvest' could only take the grower to a filtered list to
          search; 'Coming up' knows which tray. Only starting a tray from scratch was not
          covered, and that is now a button on the header. */}
      {/* What this site needs next. Placed above Today because it is the thing a grower
          opens the dashboard to find out. */}
      <UpcomingWork siteId={siteId} trays={siteTrays} />

      {/* Today's Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Today</h2>
        {todaysObservation ? (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Mood: <span className="font-medium text-slate-900 dark:text-white">{todaysObservation.moodEnergy}/10</span>
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Harvested: <span className="font-medium text-slate-900 dark:text-white">{todaysObservation.traysHarvestedToday}</span>
              </span>
            </div>
            {todaysObservation.tomorrowPriority && (
              <div className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Priority: </span>
                <span className="text-slate-700 dark:text-slate-300">{todaysObservation.tomorrowPriority}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No observation logged yet.{' '}
            <button
              onClick={() => navigate(`/grow/site/${siteId}/daily`)}
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Log your day →
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentHarvests.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Recent Harvests</h2>
          <div className="space-y-2">
            {recentHarvests.map((tray) => (
              <div
                key={tray.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    tray.qualityGrade === 'A' ? 'bg-green-500' :
                    tray.qualityGrade === 'B' ? 'bg-yellow-500' :
                    tray.qualityGrade === 'C' ? 'bg-orange-500' : 'bg-red-500'
                  }`}>
                    {tray.qualityGrade}
                  </span>
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {tray.label || `#${tray.trayNumber}`}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 mx-2">•</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{tray.variety}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {tray.dateHarvested && format(new Date(tray.dateHarvested), 'MMM d')}
                  {tray.harvestWeight && ` • ${tray.harvestWeight}g`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms */}
      <NewTrayForm isOpen={isNewTrayOpen} onClose={() => setIsNewTrayOpen(false)} />
      {harvestingTray && (
        <HarvestForm
          isOpen={!!harvestingTray}
          onClose={() => setHarvestingTray(null)}
          tray={harvestingTray}
        />
      )}
    </div>
  );
}
