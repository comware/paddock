/**
 * PlantingCalendar - Weekly calendar view for planting schedule
 *
 * Shows a week at a glance with:
 * - Planned sowings (from planned plantings)
 * - Expected harvests (from active trays)
 * - Click to add new planned planting
 *
 * Every entry opens the same dialog, whichever kind it is. An expected harvest and a
 * scheduled sowing are different records, but from the grower's side they are the same
 * question - what is this and what does it need. Only sowings used to be clickable, which
 * meant the entries a grower sees most often were the ones that did nothing.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { useTrays, useVarieties, usePlannedPlantings } from '../../stores';
import { useSites } from '@/platform';
import { getUpcomingHarvests } from '../../utils';
import type { GrowPlannedPlanting } from '@/lib/db';
import { useToastStore } from '@/stores/useToastStore';
import { PlannedPlantingForm } from './PlannedPlantingForm';
import { ProposalReview } from './ProposalReview';
import { WorkDetail, type WorkSubject } from './WorkDetail';

interface CalendarEvent {
  id: string;
  type: 'sow' | 'harvest' | 'proposed';
  date: Date;
  variety: string;
  label: string;
  status?: string;
  trayId?: string;
  plantingId?: string;
  quantity?: number;
}

export function PlantingCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  /** Which entry the dialog is describing. Sowings and trays are separate stores. */
  const [detail, setDetail] = useState<{ kind: 'planting' | 'tray'; id: string } | null>(
    null,
  );

  const { trays, loadTrays, addTray, getNextTrayNumber, moveToLight } = useTrays();
  const { getVariety, loadVarieties } = useVarieties();
  const { plantings, loadPlantings, convertToTray } = usePlannedPlantings();
  const { loadSites, getActiveSite } = useSites();
  const navigate = useNavigate();
  const activeSite = getActiveSite();

  // Load data on mount
  useEffect(() => {
    loadTrays();
    loadVarieties();
    loadPlantings();
    loadSites();
  }, [loadTrays, loadVarieties, loadPlantings, loadSites]);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Build calendar events for the week
  const calendarEvents = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const events: CalendarEvent[] = [];

    // Add planned plantings (sow events)
    plantings
      .filter((p) => p.status === 'planned')
      .forEach((planting) => {
        const sowDate = startOfDay(planting.plannedSowDate);
        if (sowDate >= currentWeekStart && sowDate <= weekEnd) {
          events.push({
            id: `sow-${planting.id}`,
            type: 'sow',
            date: planting.plannedSowDate,
            variety: planting.variety,
            label: `${planting.quantity}x ${planting.variety}`,
            status: planting.status,
            plantingId: planting.id,
            quantity: planting.quantity,
          });
        }
      });

    // Agent-staged sowings awaiting a decision. Shown alongside committed ones so the
    // grower can see what a proposal would do to a week they already have plans for.
    plantings
      .filter((p) => p.status === 'proposed')
      .forEach((planting) => {
        const sowDate = startOfDay(planting.plannedSowDate);
        if (sowDate >= currentWeekStart && sowDate <= weekEnd) {
          events.push({
            id: `proposed-${planting.id}`,
            type: 'proposed',
            date: planting.plannedSowDate,
            variety: planting.variety,
            label: `${planting.quantity}x ${planting.variety}`,
            status: planting.status,
            plantingId: planting.id,
            quantity: planting.quantity,
          });
        }
      });

    // Add expected harvests from active trays
    const activeTrays = trays.filter((t) => t.status === 'blackout' || t.status === 'light');
    const upcomingHarvests = getUpcomingHarvests(activeTrays, getVariety, 14);

    upcomingHarvests.forEach((harvest) => {
      const harvestDate = startOfDay(harvest.expectedDate);
      if (harvestDate >= currentWeekStart && harvestDate <= weekEnd) {
        events.push({
          id: `harvest-${harvest.trayId}`,
          type: 'harvest',
          date: harvest.expectedDate,
          variety: harvest.variety,
          label: harvest.trayLabel || `#${harvest.trayNumber}`,
          status: harvest.status,
          trayId: harvest.trayId,
        });
      }
    });

    return events;
  }, [currentWeekStart, plantings, trays, getVariety]);

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return calendarEvents.filter((event) => isSameDay(event.date, day));
  };

  // Navigation handlers
  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Handle day click to open form
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsFormOpen(true);
  };

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedDate(null);
  };

  const today = startOfDay(new Date());

  /**
   * A tray's focus is its next unfinished step, not the step that was clicked. Someone
   * opening a harvest still in blackout needs the light date and the light button.
   */
  const detailSubject: WorkSubject | null = useMemo(() => {
    if (!detail) return null;
    if (detail.kind === 'planting') {
      const planting = plantings.find((p) => String(p.id) === detail.id);
      return planting ? { kind: 'planting', planting } : null;
    }
    const tray = trays.find((t) => String(t.id) === detail.id);
    if (!tray) return null;
    return { kind: 'tray', tray, focus: tray.status === 'blackout' ? 'light' : 'harvest' };
  }, [detail, plantings, trays]);

  const addToast = useToastStore((state) => state.add);

  /**
   * Do the work from the dialog rather than sending the grower to find the tray again.
   * Moving to light is one step and happens here; harvesting needs weights, so it deep
   * links to the form that collects them.
   */
  const handleMoveToLight = async (trayId: string) => {
    try {
      await moveToLight(trayId);
      setDetail(null);
      addToast('Moved to light', 'success');
    } catch {
      addToast('Could not move that tray. Nothing was changed.', 'error');
    }
  };

  const traysPath = activeSite?.id
    ? `/microgreens/site/${activeSite.id}/trays`
    : '/microgreens/trays';

  const handleHarvestTray = (trayId: string) => {
    setDetail(null);
    navigate(`${traysPath}?harvest=${trayId}`);
  };

  const handleOpenTray = (trayId: string) => {
    setDetail(null);
    navigate(`${traysPath}?tray=${trayId}`);
  };

  /** Turn a scheduled sowing into a real tray. See UpcomingWork for why this matters. */
  const handleSowNow = async (planting: GrowPlannedPlanting) => {
    const config = getVariety(planting.variety);
    const previous = [...trays]
      .filter((t) => t.variety === planting.variety)
      .sort((a, b) => new Date(b.dateSown).getTime() - new Date(a.dateSown).getTime())[0];

    try {
      const trayId = await addTray({
        siteId: planting.siteId ?? activeSite?.id,
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
      setDetail(null);
      addToast(`Sown — ${planting.quantity}x ${planting.variety}`, 'success');
    } catch {
      addToast('Could not create that tray. Nothing was changed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Anything an agent has staged, above the calendar. Renders nothing when there is
          no proposal awaiting a decision. */}
      <ProposalReview
        onApproved={(firstSowDate) =>
          setCurrentWeekStart(startOfWeek(firstSowDate, { weekStartsOn: 1 }))
        }
      />

      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Planting Calendar
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-400">Planned Sowing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600 dark:text-slate-400">Expected Harvest</span>
        </div>
        {calendarEvents.some((e) => e.type === 'proposed') && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">Proposed (not scheduled)</span>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-700 ${
                isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                {format(day, 'EEE')}
              </div>
              <div
                className={`text-lg font-bold ${
                  isToday(day)
                    ? 'text-primary-600 dark:text-primary-400'
                    : isBefore(day, today)
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 min-h-[300px]">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isPast = isBefore(day, today);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                  isToday(day) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                } ${isPast ? 'opacity-60' : ''}`}
              >
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      // A div with a click handler is neither focusable nor announced.
                      // These carry real detail now, so they have to be buttons.
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.plantingId)
                          setDetail({ kind: 'planting', id: String(event.plantingId) });
                        else if (event.trayId)
                          setDetail({ kind: 'tray', id: String(event.trayId) });
                      }}
                      disabled={!event.plantingId && !event.trayId}
                      title={
                        event.plantingId || event.trayId
                          ? `${event.label} — click for details`
                          : event.label
                      }
                      aria-label={`${event.label}, ${
                        event.type === 'proposed'
                          ? 'proposed sowing'
                          : event.type === 'sow'
                          ? 'scheduled sowing'
                          : 'expected harvest'
                      } on ${format(event.date, 'd MMMM')}${
                        event.plantingId || event.trayId ? '. Show details.' : ''
                      }`}
                      className={`w-full text-left p-2 rounded-lg text-xs ${
                        event.plantingId || event.trayId
                          ? 'cursor-pointer hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500'
                          : 'cursor-default'
                      } ${
                        event.type === 'sow'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                          : event.type === 'proposed'
                          ? // Dashed to read as provisional at a glance, distinct from
                            // anything the grower has actually committed to.
                            'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border border-dashed border-amber-400 dark:border-amber-600'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span aria-hidden="true">
                          {event.type === 'sow' ? '🌱' : event.type === 'proposed' ? '🤖' : '🌿'}
                        </span>
                        <span className="font-medium truncate">{event.label}</span>
                      </div>
                      <div className="text-xs opacity-75 truncate">
                        {event.type === 'proposed' ? 'Proposed — not scheduled' : event.variety}
                      </div>
                    </button>
                  ))}

                  {/* Add button for empty days or days with events */}
                  {!isPast && (
                    <div className="flex items-center justify-center p-2 text-slate-400 dark:text-slate-500 hover:text-primary-500 dark:hover:text-primary-400">
                      <span className="text-lg">+</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {calendarEvents.filter((e) => e.type === 'sow').length}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Planned Sowings</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {calendarEvents.filter((e) => e.type === 'harvest').length}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Expected Harvests</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {trays.filter((t) => t.status === 'blackout').length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">In Blackout</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
            {trays.filter((t) => t.status === 'light').length}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">In Light</div>
        </div>
      </div>

      {/* Planned Planting Form Modal */}
      <WorkDetail
        subject={detailSubject}
        variety={
          detailSubject
            ? getVariety(
                detailSubject.kind === 'planting'
                  ? detailSubject.planting.variety
                  : detailSubject.tray.variety,
              )
            : undefined
        }
        trays={trays}
        onSowNow={handleSowNow}
        onMoveToLight={handleMoveToLight}
        onHarvest={handleHarvestTray}
        onOpenTray={handleOpenTray}
        onClose={() => setDetail(null)}
      />

      <PlannedPlantingForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        initialDate={selectedDate || undefined}
        siteId={activeSite?.id}
      />
    </div>
  );
}
