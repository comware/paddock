/**
 * PlantingCard - Individual planting display.
 *
 * Shows crop/variety, the bed it lives in, status, and days since sowing or transplanting.
 * For a planting that is (or was) being picked, it shows the picked totals - rendering
 * EVERY unit it was picked in, never combining them. A planting picked in both kilos and
 * bunches has two honest numbers; showing only the first would be a quiet lie about a
 * number someone will act on.
 */

import { useBeds } from '../../stores/useBeds';
import { useHarvests } from '../../stores/useHarvests';
import type { VegPlanting } from '@/lib/db';

interface PlantingCardProps {
  planting: VegPlanting;
  onClick?: (id: string) => void;
}

const STATUS_STYLES: Record<VegPlanting['status'], string> = {
  planned: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  growing: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  harvesting: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  finished: 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const STATUS_LABELS: Record<VegPlanting['status'], string> = {
  planned: 'Planned',
  growing: 'Growing',
  harvesting: 'Harvesting',
  finished: 'Finished',
  failed: 'Failed',
};

function daysSince(date: Date): number {
  const toUtcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((toUtcDay(new Date()) - toUtcDay(new Date(date))) / 86_400_000);
}

export function PlantingCard({ planting, onClick }: PlantingCardProps) {
  const { beds } = useBeds();
  const { summaryFor } = useHarvests();

  const bed = beds.find((b) => b.id === planting.bedId);
  const showsHarvestTotals = planting.status === 'harvesting' || planting.status === 'finished';
  const summary = showsHarvestTotals && planting.id ? summaryFor(planting.id) : undefined;

  const anchorDate = planting.method === 'transplanted' ? planting.dateTransplanted : planting.dateSown;
  const anchorLabel = planting.method === 'transplanted' ? 'transplanted' : 'sown';

  const unitEntries = summary ? (Object.entries(summary.totals) as [string, number][]) : [];

  return (
    <div
      className="rounded-xl p-4 shadow-sm border-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => planting.id && onClick?.(planting.id)}
    >
      {/* Header: crop / variety and status */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-900 dark:text-white truncate">{planting.crop}</div>
          {planting.variety && (
            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{planting.variety}</div>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[planting.status]}`}>
          {STATUS_LABELS[planting.status]}
        </span>
      </div>

      {/* Bed */}
      <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
        {bed ? bed.name : 'Unknown bed'}
        {planting.bedPortion && <span className="text-slate-400 dark:text-slate-500"> ({planting.bedPortion})</span>}
      </div>

      {/* Days since sowing/transplanting */}
      {anchorDate && (
        <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
          {daysSince(anchorDate)} day{daysSince(anchorDate) === 1 ? '' : 's'} since {anchorLabel}
        </div>
      )}

      {/* Picked totals - every unit rendered, never combined */}
      {summary && unitEntries.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {unitEntries.map(([unit, amount]) => (
            <span
              key={unit}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
            >
              {`${amount} ${unit}`}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {planting.notes && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{planting.notes}</p>
      )}
    </div>
  );
}
