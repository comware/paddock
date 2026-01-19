/**
 * Planner Module Routes
 *
 * Defines routes for the Planner (Crop Calendar) module.
 * Following patterns from Grow and Propagation modules.
 */

import type { RouteObject } from 'react-router-dom';
import { PlannerCalendar } from './components';

export const plannerRoutes: RouteObject[] = [
  // Calendar is the landing/index page
  { index: true, element: <PlannerCalendar /> },

  // Future routes can be added here:
  // { path: 'events', element: <EventList /> },
  // { path: 'events/new', element: <NewEventForm /> },
  // { path: 'events/:id', element: <EventDetail /> },
];
