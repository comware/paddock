/**
 * Propagation Module Routes
 *
 * Route configuration for propagation batches:
 * - /propagation → Dashboard (landing)
 * - /propagation/batches → Batch list
 * - /propagation/batches/new → New batch form
 * - /propagation/batches/:id → Batch detail
 */

import type { RouteObject } from 'react-router-dom';
import { PropDashboard } from './components/Dashboard';

// Placeholder components for routes that aren't built yet
function BatchList() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📋</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Propagation Batches
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        View and manage all your propagation batches.
      </p>
    </div>
  );
}

function BatchDetail() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Batch Detail
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Detailed view of a propagation batch.
      </p>
    </div>
  );
}

function NewBatchForm() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">➕</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        New Propagation Batch
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Create a new propagation batch.
      </p>
    </div>
  );
}

export const propagationRoutes: RouteObject[] = [
  // Dashboard as landing page
  { index: true, element: <PropDashboard /> },

  // Batch routes - order matters: /new must come before /:id
  { path: 'batches', element: <BatchList /> },
  { path: 'batches/new', element: <NewBatchForm /> },
  { path: 'batches/:id', element: <BatchDetail /> },
];
