/**
 * Propagation Module Routes
 *
 * Route configuration for propagation module:
 * - /propagation → Dashboard (landing)
 * - /propagation/batches → Batch list
 * - /propagation/batches/:id → Batch detail
 * - /propagation/stations → Station list
 * - /propagation/stations/:id → Station detail
 *
 * Note: New batch/station creation is handled via modals,
 * not separate routes.
 */

import type { RouteObject } from 'react-router-dom';
import { PropDashboard } from './components/Dashboard';
import { BatchList, BatchDetail } from './components/Batches';
import { StationList, StationDetail } from './components/Stations';

export const propagationRoutes: RouteObject[] = [
  // Dashboard as landing page
  { index: true, element: <PropDashboard /> },

  // Batch routes
  { path: 'batches', element: <BatchList /> },
  { path: 'batches/:id', element: <BatchDetail /> },

  // Station routes
  { path: 'stations', element: <StationList /> },
  { path: 'stations/:id', element: <StationDetail /> },
];
