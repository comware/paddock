/**
 * CalendarEvent - Custom event display for react-big-calendar
 *
 * Renders events with appropriate styling based on type and status.
 * Used as the components.event prop in PlannerCalendar.
 */

import type { EventProps } from 'react-big-calendar';
import type { PlannerEventWithComputed } from '../stores/usePlannerStore';

export interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: PlannerEventWithComputed;
}

interface CalendarEventProps extends EventProps<CalendarEventData> {}

/**
 * Get CSS class name for event type styling.
 */
function getEventTypeClass(eventType: string): string {
  return `event-type-${eventType}`;
}

/**
 * Get status-based CSS classes.
 */
function getStatusClasses(event: PlannerEventWithComputed): string {
  const classes: string[] = [];

  if (event.status === 'completed' || event.status === 'cancelled' || event.status === 'skipped') {
    classes.push(`event-${event.status}`);
  }

  if (event.isOverdue) {
    classes.push('event-overdue');
  }

  return classes.join(' ');
}

/**
 * Get icon for event type (displayed in compact view).
 */
function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    sow: '🌱',
    blackout_end: '☀️',
    harvest: '🌾',
    water: '💧',
    inspection: '🔍',
    take_cuttings: '✂️',
    rooting_check: '🌿',
    pot_up: '🪴',
    harden_off: '🌤️',
    graduation: '🎓',
    maintenance: '🔧',
    purchase: '🛒',
    other: '📌',
  };
  return icons[eventType] || '📌';
}

/**
 * CalendarEvent component for custom event rendering.
 * The event wrapper styling is handled via CSS classes in calendar.css.
 */
export function CalendarEvent({ event }: CalendarEventProps) {
  const plannerEvent = event.resource;
  const typeClass = getEventTypeClass(plannerEvent.eventType);
  const statusClasses = getStatusClasses(plannerEvent);
  const icon = getEventIcon(plannerEvent.eventType);

  return (
    <div
      className={`calendar-event ${typeClass} ${statusClasses}`}
      title={`${plannerEvent.title} - ${plannerEvent.eventType.replace('_', ' ')}`}
    >
      <span className="event-icon mr-1">{icon}</span>
      <span className="event-title">{plannerEvent.title}</span>
    </div>
  );
}

/**
 * Wrapper component that applies CSS classes to the event container.
 * This is used with eventPropGetter to style the wrapper div.
 */
export function getEventProps(event: CalendarEventData) {
  const plannerEvent = event.resource;
  const typeClass = getEventTypeClass(plannerEvent.eventType);
  const statusClasses = getStatusClasses(plannerEvent);

  return {
    className: `${typeClass} ${statusClasses}`.trim(),
    style: {
      // Let CSS handle colors via className
    },
  };
}
