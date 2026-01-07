/**
 * PlantingCalendar - Weekly calendar view for planting schedule
 *
 * Shows a week at a glance with:
 * - Planned sowings (from planned plantings)
 * - Expected harvests (from active trays)
 * - Click to add new planned planting
 */

import { useState, useEffect, useMemo } from 'react';
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
import { useTrays, useVarieties, usePlannedPlantings, useSites } from '../../stores';
import { getUpcomingHarvests } from '../../utils';
import { PlannedPlantingForm } from './PlannedPlantingForm';

interface CalendarEvent {
  id: string;
  type: 'sow' | 'harvest';
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

  const { trays, loadTrays } = useTrays();
  const { getVariety, loadVarieties } = useVarieties();
  const { plantings, loadPlantings } = usePlannedPlantings();
  const { loadSites, getActiveSite } = useSites();
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

  return (
    <div className="space-y-4">
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
                    <div
                      key={event.id}
                      onClick={(e) => e.stopPropagation()}
                      className={`p-2 rounded-lg text-xs ${
                        event.type === 'sow'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{event.type === 'sow' ? '🌱' : '🌿'}</span>
                        <span className="font-medium truncate">{event.label}</span>
                      </div>
                      <div className="text-xs opacity-75 truncate">{event.variety}</div>
                    </div>
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
      <PlannedPlantingForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        initialDate={selectedDate || undefined}
        siteId={activeSite?.id}
      />
    </div>
  );
}
