/**
 * PlannerCalendar - Main calendar component using react-big-calendar
 *
 * Displays planner events in month, week, day, and agenda views.
 * Integrates with usePlannerStore for event data and filtering.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enAU } from 'date-fns/locale';

import { usePlannerStore, type PlannerEventWithComputed } from '../stores/usePlannerStore';
import { CalendarEvent, getEventProps, type CalendarEventData } from './CalendarEvent';
import { EventDetailModal } from './EventDetailModal';

// Import calendar styles
import '../styles/calendar.css';

// Configure date-fns localizer for react-big-calendar
const locales = {
  'en-AU': enAU,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Week starts on Monday
  getDay,
  locales,
});

// Available views
const VIEWS: View[] = ['month', 'week', 'day', 'agenda'];

/**
 * Transform planner events to react-big-calendar format.
 */
function transformEvents(events: PlannerEventWithComputed[]): CalendarEventData[] {
  return events.map((event) => ({
    id: event.id || '',
    title: event.title,
    start: new Date(event.scheduledDate),
    end: new Date(event.scheduledDate), // Same-day events
    resource: event,
  }));
}

interface PlannerCalendarProps {
  className?: string;
}

export function PlannerCalendar({ className = '' }: PlannerCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<PlannerEventWithComputed | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { events, isLoading, loadEvents, getFilteredEvents, filters, setFilters } = usePlannerStore();

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Get filtered events
  const filteredEvents = useMemo(() => {
    return getFilteredEvents();
  }, [events, filters, getFilteredEvents]);

  // Transform to calendar format
  const calendarEvents = useMemo(() => {
    return transformEvents(filteredEvents);
  }, [filteredEvents]);

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEventData) => {
    setSelectedEvent(event.resource);
    setIsModalOpen(true);
  }, []);

  // Handle slot (date cell) click — navigate to event creation form with pre-filled date
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    const dateStr = format(start, 'yyyy-MM-dd');
    navigate(`/planner/events/new?date=${dateStr}`);
  }, [navigate]);

  // Handle date navigation
  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);




  // Toggle show completed filter
  const handleToggleCompleted = useCallback(() => {
    setFilters({ showCompleted: !filters.showCompleted });
  }, [filters.showCompleted, setFilters]);

  // Custom event styling via eventPropGetter
  const eventPropGetter = useCallback((event: CalendarEventData) => {
    return getEventProps(event);
  }, []);

  // Custom day styling
  const dayPropGetter = useCallback((date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return {
        className: 'rbc-today',
      };
    }
    return {};
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <div className="text-4xl animate-pulse">📅</div>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`planner-calendar ${className}`}>
      {/* Filter Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showCompleted}
            onChange={handleToggleCompleted}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-green-500 focus:ring-green-500 dark:bg-slate-700"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Show completed
          </span>
        </label>

        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Calendar */}
      <div className="card overflow-hidden">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          view={currentView}
          views={VIEWS}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          popup
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          components={{
            event: CalendarEvent,
          }}
          messages={{
            today: 'Today',
            previous: 'Back',
            next: 'Next',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            agenda: 'Agenda',
            noEventsInRange: 'No events in this period.',
            showMore: (total) => `+${total} more`,
          }}
          style={{ minHeight: 500 }}
        />
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default PlannerCalendar;
