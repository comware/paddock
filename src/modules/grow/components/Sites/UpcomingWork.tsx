/**
 * UpcomingWork - what this site needs next
 *
 * The site dashboard was entirely retrospective: trays in flight, success rate, recent
 * harvests. That was adequate while every planned sowing was something the grower had
 * typed in themselves and therefore remembered.
 *
 * Once an agent can schedule work, the plan is no longer in the grower's head. The next
 * thing to do has to be on the page.
 *
 * Merges three sources into one dated list: scheduled sowings, trays due out of blackout,
 * and trays due to harvest - because on any given morning those are the same question.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { GrowPlannedPlanting } from '@/lib/db';
import { useToastStore } from '@/stores/useToastStore';
import { WorkDetail, type WorkSubject } from '../Calendar/WorkDetail';
import {
  usePlannedPlantings,
  useVarieties,
  useTrays,
  type TrayWithComputed,
} from '../../stores';

interface UpcomingWorkProps {
  siteId: string;
  trays: TrayWithComputed[];
  /** How many entries to show before linking to the calendar. */
  limit?: number;
}

type WorkKind = 'sow' | 'light' | 'harvest';

interface WorkItem {
  id: string;
  date: Date;
  kind: WorkKind;
  title: string;
  detail?: string;
  /** Set for scheduled sowings - opens the same detail dialog as the calendar. */
  plantingId?: string;
  /** Set for tray work - jumps to the tray list. */
  trayId?: string;
}

const KIND_STYLE: Record<WorkKind, { icon: string; chip: string }> = {
  sow: {
    icon: '🌱',
    chip: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
  },
  light: {
    icon: '💡',
    chip: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200',
  },
  harvest: {
    icon: '🌿',
    chip: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
  },
};

/** "Today", "Tomorrow", "In 4 days", "Overdue by 2 days". */
function whenLabel(date: Date, today: Date): string {
  const days = differenceInCalendarDays(date, today);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  return `In ${days} days`;
}

export function UpcomingWork({ siteId, trays, limit = 5 }: UpcomingWorkProps) {
  const navigate = useNavigate();
  const { plantings, convertToTray, updatePlanting } = usePlannedPlantings();
  const { getVariety, varieties } = useVarieties();
  const { addTray, moveToLight, moveToBlackout, deleteTray, getNextTrayNumber } = useTrays();
  const addToast = useToastStore((state) => state.add);
  const addToastWithUndo = useToastStore((state) => state.addWithUndo);
  const [subject, setSubject] = useState<WorkSubject | null>(null);

  /**
   * Turn a scheduled sowing into a real tray.
   *
   * This link did not exist anywhere in the app: a plan could be made, approved, and
   * displayed, but never acted on - leaving the sowing permanently due and the grower
   * retyping into New Tray what the plan already held.
   *
   * Seed weight and medium come from the last tray of that variety, since that is what
   * this grower has settled on. Where there is no history the tray is still created; the
   * grower can fill those in on the tray itself.
   */
  const handleSowNow = async (planting: GrowPlannedPlanting) => {
    const config = getVariety(planting.variety);
    const previous = [...trays]
      .filter((t) => t.variety === planting.variety)
      .sort((a, b) => new Date(b.dateSown).getTime() - new Date(a.dateSown).getTime())[0];

    try {
      const trayId = await addTray({
        siteId: planting.siteId ?? siteId,
        trayNumber: getNextTrayNumber(),
        variety: planting.variety,
        dateSown: new Date(),
        seedWeight: previous?.seedWeight ?? 0,
        growingMedium: previous?.growingMedium ?? 'coco_coir',
        preSoaked: config?.preSoakRequired ?? false,
        blackoutDays: config?.defaultBlackoutDays ?? 4,
        problemsObserved: '',
        lessonsLearned: '',
      });

      await convertToTray(planting.id!, trayId);
      setSubject(null);

      addToastWithUndo(
        `Sown — ${planting.quantity}x ${planting.variety}`,
        async () => {
          // Put both halves back: remove the tray that was created, and return the
          // sowing to the schedule it came from.
          await deleteTray(trayId);
          await updatePlanting(planting.id!, {
            status: 'planned',
            convertedTrayId: undefined,
          });
        },
      );
    } catch {
      addToast('Could not create that tray. Nothing was changed.', 'error');
    }
  };

  const handleMoveToLight = async (trayId: string) => {
    try {
      await moveToLight(trayId);
      setSubject(null);
      addToastWithUndo('Moved to light', () => moveToBlackout(trayId));
    } catch {
      addToast('Could not move that tray.', 'error');
    }
  };

  const today = startOfDay(new Date());

  const proposalsPending = useMemo(() => {
    const ids = new Set<string>();
    for (const p of plantings) {
      if (p.status === 'proposed' && p.proposalId) ids.add(p.proposalId);
    }
    return ids.size;
  }, [plantings]);

  const items = useMemo(() => {
    const out: WorkItem[] = [];

    // Scheduled sowings. Proposals are deliberately excluded - they are not work until
    // someone has agreed to them.
    for (const p of plantings) {
      if (p.status !== 'planned') continue;
      if (p.siteId && p.siteId !== siteId) continue;

      out.push({
        id: `sow-${p.id}`,
        date: startOfDay(new Date(p.plannedSowDate)),
        kind: 'sow',
        title: `Sow ${p.quantity} ${p.quantity === 1 ? 'tray' : 'trays'} of ${p.variety}`,
        detail: `ready ${format(new Date(p.targetHarvestDate), 'd MMM')}`,
        plantingId: p.id,
      });
    }

    for (const tray of trays) {
      if (tray.dateHarvested) continue;

      const sown = startOfDay(new Date(tray.dateSown));
      const config = getVariety(tray.variety);

      // Out of blackout, if it has not happened yet.
      if (tray.status === 'blackout' && tray.blackoutDays) {
        out.push({
          id: `light-${tray.id}`,
          date: addDays(sown, tray.blackoutDays),
          kind: 'light',
          title: `Move tray #${tray.trayNumber} to light`,
          detail: tray.variety,
          trayId: tray.id,
        });
      }

      // Expected harvest, using the variety's configured timing.
      const days = config?.typicalDaysToHarvest;
      if (days) {
        out.push({
          id: `harvest-${tray.id}`,
          date: addDays(sown, days),
          kind: 'harvest',
          title: `Harvest tray #${tray.trayNumber}`,
          detail: tray.variety,
          trayId: tray.id,
        });
      }
    }

    return out
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .filter((item) => differenceInCalendarDays(item.date, today) >= -7);
  }, [plantings, trays, siteId, getVariety, today]);

  const shown = items.slice(0, limit);

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Coming up</h2>
        <button
          onClick={() => navigate('/grow/calendar')}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Planting calendar →
        </button>
      </div>

      {proposalsPending > 0 && (
        <button
          onClick={() => navigate('/grow/calendar')}
          className="w-full mb-3 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          <span aria-hidden="true" className="text-lg">🤖</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-amber-900 dark:text-amber-100">
              {proposalsPending} proposed{' '}
              {proposalsPending === 1 ? 'plan' : 'plans'} awaiting your decision
            </span>
            <span className="block text-xs text-amber-800 dark:text-amber-200">
              Staged by an assistant. Nothing is scheduled until you approve.
            </span>
          </span>
          <span aria-hidden="true" className="text-amber-700 dark:text-amber-300">→</span>
        </button>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-400">
          Nothing scheduled.{' '}
          <button
            onClick={() => navigate('/grow/calendar')}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Plan some sowings →
          </button>
        </div>
      ) : (
        <ul className="rounded-xl bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {shown.map((item) => {
            const overdue = differenceInCalendarDays(item.date, today) < 0;
            const style = KIND_STYLE[item.kind];

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Everything opens the same dialog. A sowing and a tray waiting to be
                    // harvested are different records, but from the grower's side they
                    // are the same question - so they behave the same way.
                    if (item.plantingId) {
                      const planting = plantings.find((p) => p.id === item.plantingId);
                      if (planting) setSubject({ kind: 'planting', planting });
                    } else if (item.trayId) {
                      const tray = trays.find((t) => t.id === item.trayId);
                      if (tray) {
                        setSubject({
                          kind: 'tray',
                          tray,
                          focus: item.kind === 'harvest' ? 'harvest' : 'light',
                        });
                      }
                    }
                  }}
                  aria-label={`${item.title}, ${whenLabel(item.date, today).toLowerCase()} on ${format(item.date, 'd MMMM')}. Show details.`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${style.chip}`}
                  >
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.title}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-medium ${
                        overdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {whenLabel(item.date, today)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {format(item.date, 'EEE d MMM')}
                    </p>
                  </div>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <WorkDetail
        subject={subject}
        variety={
          subject
            ? varieties.find(
                (v) =>
                  v.name ===
                  (subject.kind === 'planting'
                    ? subject.planting.variety
                    : subject.tray.variety),
              )
            : undefined
        }
        trays={trays}
        onSowNow={handleSowNow}
        onMoveToLight={handleMoveToLight}
        onHarvest={(trayId) => {
          // Harvesting needs weight and grade, so it keeps its form - but opens on the
          // right tray rather than sending the grower to find it.
          setSubject(null);
          navigate(`/grow/site/${siteId}/trays?harvest=${trayId}`);
        }}
        onOpenTray={() => {
          setSubject(null);
          navigate(`/grow/site/${siteId}/trays`);
        }}
        onClose={() => setSubject(null)}
      />

      {items.length > shown.length && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {items.length - shown.length} more in the calendar.
        </p>
      )}
    </div>
  );
}
