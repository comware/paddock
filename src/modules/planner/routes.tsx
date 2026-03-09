/**
 * Planner Module Routes
 *
 * Defines routes for the Planner (Crop Calendar) module.
 * Following patterns from Grow and Propagation modules.
 */

import type { RouteObject } from 'react-router-dom';
import { PlannerCalendar } from './components';
import { EventCreateForm } from './components/EventCreateForm';
import { EventList } from './components/EventList';
import { EventDetail } from './components/EventDetail';

export const plannerRoutes: RouteObject[] = [
  // Calendar is the landing/index page
  { index: true, element: <PlannerCalendar /> },

  // Event routes
  { path: 'events', element: <EventList /> },
  { path: 'events/new', element: <EventCreateForm /> },
  { path: 'events/:id', element: <EventDetail /> },
];
