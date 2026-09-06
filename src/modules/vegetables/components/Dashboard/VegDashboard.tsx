/**
 * VegDashboard - the vegetables module's landing page.
 *
 * Answers what a market gardener wants on walking in on a Saturday morning: what needs
 * picking, what beds are free, and what happened lately. Not a wall of statistics - three
 * panels, each one a decision or a fact someone can act on.
 *
 * Recent picks reads vegDb.harvests directly rather than looping useHarvests.loadForPlanting
 * across the site's plantings. loadForPlanting REPLACES the store's `harvests` array on every
 * call rather than merging into it (see useHarvests.ts), so calling it once per planting
 * would leave only the last planting's harvests in state - the other plantings' picks would
 * vanish, not compose. Reading the table directly is the honest option; looping the store
 * would silently corrupt it for whatever else on screen depends on it.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBeds } from '../../stores/useBeds';
import { usePlantings } from '../../stores/usePlantings';
import { useSites } from '@/platform';
import { vegDb, withId, type VegHarvest, type VegPlanting } from '@/lib/db';
import { Grid2x2, Sprout, ShoppingBasket, Scale } from 'lucide-react';
import { EmptyState, StatCard, StatCardGrid } from '@/components/shared';

const RECENT_PICKS_LIMIT = 10;

const STATUS_LABELS: Record<VegPlanting['status'], string> = {
  planned: 'Planned',
  growing: 'Growing',
  harvesting: 'Harvesting',
  finished: 'Finished',
  failed: 'Failed',
};

const STATUS_STYLES: Record<VegPlanting['status'], string> = {
  planned: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  growing: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  harvesting: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  finished: 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

// Whole-calendar-day difference, in UTC, so a comparison never drifts across a daylight
// saving change - the same technique harvestTotals.ts and PlantingCard use.
function daysBetween(from: Date, to: Date): number {
  const toUtcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

function overdueLabel(expected: Date, now: Date): string {
  const days = daysBetween(expected, now);
  if (days <= 0) return 'expected today';
  if (days === 1) return 'expected 1 day ago';
  return `expected ${days} days ago`;
}

/**
 * The page title, kept outside the empty-state early returns.
 *
 * The dashboard used to return a bare EmptyState when a site had no beds, which took the
 * heading with it - so the one screen a new grower lands on was the only screen in the app
 * with no title at all. The frame keeps the page identifiable whether or not it has
 * anything in it yet.
 */
function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      {children}
    </div>
  );
}

export function VegDashboard() {
  const navigate = useNavigate();
  const { beds, loadBeds, activeBeds, bedsBySite } = useBeds();
  const { loadPlantings, plantingsBySite, plantingsInBed } = usePlantings();
  const { activeSiteId, loadSites } = useSites();

  const [recentHarvests, setRecentHarvests] = useState<VegHarvest[]>([]);

  useEffect(() => {
    loadSites();
    loadBeds();
    loadPlantings();
  }, [loadSites, loadBeds, loadPlantings]);

  // No memoization against a store selector here - beds/plantings are subscribed to
  // directly above, so these plain computed values recompute on every store write.
  const siteBeds = activeSiteId ? bedsBySite(activeSiteId) : [];
  const sitePlantings = activeSiteId ? plantingsBySite(activeSiteId) : [];
  const siteActiveBeds = activeSiteId ? activeBeds().filter((bed) => bed.siteId === activeSiteId) : [];

  // A stable key for the effect below: the id list, not the array reference, which
  // changes every render regardless of whether the underlying plantings actually changed.
  const sitePlantingIdsKey = sitePlantings.map((p) => p.id as string).join(',');

  useEffect(() => {
    let cancelled = false;

    async function loadRecentPicks() {
      if (!sitePlantingIdsKey) {
        setRecentHarvests([]);
        return;
      }
      const idSet = new Set(sitePlantingIdsKey.split(','));
      const rows = await vegDb.harvests.toArray();
      const relevant = rows
        .map(withId)
        .filter((h) => idSet.has(h.plantingId))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, RECENT_PICKS_LIMIT);
      if (!cancelled) setRecentHarvests(relevant);
    }

    loadRecentPicks();
    return () => {
      cancelled = true;
    };
  }, [sitePlantingIdsKey]);

  if (siteBeds.length === 0) {
    return (
      <DashboardFrame>
        <EmptyState
          icon="🌱"
          title="No beds yet"
          description="Add your first bed to start tracking what's growing where."
          action={{ label: 'Add a bed', onClick: () => navigate('/vegetables/beds') }}
        />
      </DashboardFrame>
    );
  }

  if (sitePlantings.length === 0) {
    return (
      <DashboardFrame>
        <EmptyState
          icon="🥬"
          title="No plantings yet"
          description="Your beds are ready. Sow or transplant something into one to start tracking it."
        />
      </DashboardFrame>
    );
  }

  const now = new Date();

  // Ready panel: everything currently being picked, plus everything whose expected first
  // harvest has passed but hasn't started yet. Finished and failed plantings are done, not
  // ready - they don't belong here even if they once had an overdue expected date.
  const readyItems = sitePlantings
    .filter((p) => {
      if (p.status === 'harvesting') return true;
      if (p.status === 'finished' || p.status === 'failed') return false;
      return !!p.expectedFirstHarvest && p.expectedFirstHarvest.getTime() <= now.getTime();
    })
    .sort((a, b) => {
      const aTime = a.expectedFirstHarvest ? a.expectedFirstHarvest.getTime() : now.getTime();
      const bTime = b.expectedFirstHarvest ? b.expectedFirstHarvest.getTime() : now.getTime();
      return aTime - bTime;
    });

  // Beds in use vs free: an active bed counts as "in use" if it holds a planting that's
  // growing or harvesting right now. Anything else - empty, or holding only planned,
  // finished, or failed plantings - is free.
  const bedsInUse = siteActiveBeds.filter((bed) =>
    plantingsInBed(bed.id as string).some((p) => p.status === 'growing' || p.status === 'harvesting')
  );
  const freeBedCount = siteActiveBeds.length - bedsInUse.length;

  const plantingById = new Map(sitePlantings.map((p) => [p.id, p]));

  const activePlantings = sitePlantings.filter(
    (p) => p.status === 'growing' || p.status === 'harvesting'
  );

  return (
    <DashboardFrame>
      <StatCardGrid>
        <StatCard
          Icon={Grid2x2}
          value={bedsInUse.length}
          label="Beds In Use"
          subValue={`${freeBedCount} free of ${siteActiveBeds.length}`}
          testId="beds-in-use"
        />
        <StatCard
          Icon={Sprout}
          value={activePlantings.length}
          label="Active Plantings"
          subValue="growing or being picked"
        />
        <StatCard
          Icon={ShoppingBasket}
          value={readyItems.length}
          label="Ready to Pick"
          subValue="at or past first harvest"
        />
        <StatCard
          Icon={Scale}
          value={recentHarvests.length}
          label="Recent Picks"
          subValue={`last ${RECENT_PICKS_LIMIT} logged`}
        />
      </StatCardGrid>

      {/* Ready or nearly ready */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ready or nearly ready</h2>
        {readyItems.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing is overdue and nothing is currently being picked.
          </p>
        ) : (
          <ul className="space-y-2">
            {readyItems.map((planting) => {
              const bed = beds.find((b) => b.id === planting.bedId);
              return (
                <li key={planting.id}>
                  <Link
                    to={`/vegetables/plantings/${planting.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{planting.crop}</span>
                      {planting.variety && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">{planting.variety}</span>
                      )}
                      {bed && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">- {bed.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {planting.status !== 'harvesting' && planting.expectedFirstHarvest && (
                        <span className="text-sm text-amber-700 dark:text-amber-300">
                          {overdueLabel(planting.expectedFirstHarvest, now)}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[planting.status]}`}
                      >
                        {STATUS_LABELS[planting.status]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent picks */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-4" data-testid="recent-picks-panel">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent picks</h2>
          {recentHarvests.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No picks logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentHarvests.map((harvest) => {
                const planting = plantingById.get(harvest.plantingId);
                return (
                  <li
                    key={harvest.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {new Date(harvest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex-1 px-2 text-slate-900 dark:text-white">
                      {planting ? planting.crop : 'Unknown planting'}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {harvest.quantity} {harvest.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardFrame>
  );
}
