/**
 * Vegetables Module Routes
 *
 * Route configuration for the vegetables module:
 * - /vegetables                → Dashboard (landing)
 * - /vegetables/beds           → Bed list
 * - /vegetables/plantings      → Planting list
 * - /vegetables/plantings/:id  → Planting detail (successions, harvests)
 * - /vegetables/guides         → Vegetable growing guide library
 *
 * Note: bed and planting creation, and harvest logging, are handled via
 * forms/modals, not separate routes.
 */

import type { RouteObject } from 'react-router-dom';
import { VegDashboard } from './components/Dashboard';
import { BedList } from './components/Beds';
import { PlantingList, PlantingDetail } from './components/Plantings';
import { VegetableGuideLibrary } from './components/Guides';

export const vegetablesRoutes: RouteObject[] = [
  // Dashboard as landing page
  { index: true, element: <VegDashboard /> },

  // Bed routes
  { path: 'beds', element: <BedList /> },

  // Planting routes
  { path: 'plantings', element: <PlantingList /> },
  { path: 'plantings/:id', element: <PlantingDetail /> },

  // Guide library
  { path: 'guides', element: <VegetableGuideLibrary /> },
];
