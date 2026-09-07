/**
 * Styling props for react-big-calendar's event wrapper.
 *
 * Lives apart from CalendarEvent.tsx because it is not a component. React Fast Refresh can
 * only replace a module's exports in place when every export is a component; one plain
 * function alongside them forces a full reload on every edit to the file, and the lint rule
 * that flags it is protecting the dev loop rather than being fussy.
 */

import type { PlannerEventWithComputed } from '../stores/usePlannerStore';
import type { CalendarEventData } from './CalendarEvent';

/** CSS class for the event's type, e.g. `event-type-sow`. Styled in styles/calendar.css. */
function eventTypeClass(eventType: string): string {
  return `event-type-${eventType}`;
}

/** Classes for anything about the event's state - done, cancelled, skipped, overdue. */
function statusClasses(event: PlannerEventWithComputed): string {
  const classes: string[] = [];

  if (event.status === 'completed' || event.status === 'cancelled' || event.status === 'skipped') {
    classes.push(`event-${event.status}`);
  }

  if (event.isOverdue) {
    classes.push('event-overdue');
  }

  return classes.join(' ');
}

/** Passed to react-big-calendar's eventPropGetter. Colour comes from CSS, not from here. */
export function getEventProps(event: CalendarEventData) {
  const plannerEvent = event.resource;

  return {
    className: `${eventTypeClass(plannerEvent.eventType)} ${statusClasses(plannerEvent)}`.trim(),
  };
}
