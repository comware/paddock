/**
 * Propagation Module Routes
 *
 * Route configuration for propagation batches:
 * - /propagation → Dashboard (landing)
 * - /propagation/batches → Batch list
 * - /propagation/batches/:id → Batch detail
 *
 * Note: New batch creation is handled via modal in BatchList,
 * not a separate route.
 */

import type { RouteObject } from 'react-router-dom';
import { PropDashboard } from './components/Dashboard';
import { BatchList, BatchDetail } from './components/Batches';

export const propagationRoutes: RouteObject[] = [
  // Dashboard as landing page
  { index: true, element: <PropDashboard /> },

  // Batch routes
  { path: 'batches', element: <BatchList /> },
  { path: 'batches/:id', element: <BatchDetail /> },
];
