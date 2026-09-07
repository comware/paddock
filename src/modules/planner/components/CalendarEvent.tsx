/**
 * CalendarEvent - Custom event display for react-big-calendar
 *
 * Renders events with appropriate styling based on type and status.
 * Used as the components.event prop in PlannerCalendar.
 */

import { getEventProps } from './eventProps';
import type { EventProps } from 'react-big-calendar';
import type { PlannerEventWithComputed } from '../stores/usePlannerStore';

export interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: PlannerEventWithComputed;
}

type CalendarEventProps = EventProps<CalendarEventData>;

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
  const icon = getEventIcon(plannerEvent.eventType);

  // The same classes react-big-calendar puts on the wrapper, so the event and its wrapper
  // cannot drift into styling themselves differently.
  const { className } = getEventProps(event);

  return (
    <div
      className={`calendar-event ${className}`}
      title={`${plannerEvent.title} - ${plannerEvent.eventType.replace('_', ' ')}`}
    >
      <span className="event-icon mr-1">{icon}</span>
      <span className="event-title">{plannerEvent.title}</span>
    </div>
  );
}
