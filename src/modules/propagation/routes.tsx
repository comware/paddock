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
import { BatchList } from './components/Batches';

// Placeholder components for routes that aren't built yet
function BatchDetail() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">?</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Batch Detail
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Detailed view of a propagation batch.
      </p>
    </div>
  );
}

export const propagationRoutes: RouteObject[] = [
  // Dashboard as landing page
  { index: true, element: <PropDashboard /> },

  // Batch routes
  { path: 'batches', element: <BatchList /> },
  { path: 'batches/:id', element: <BatchDetail /> },
];
