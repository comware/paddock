/**
 * Propagation Module Routes
 *
 * Route configuration for propagation module:
 * - /propagation → Dashboard (landing)
 * - /propagation/batches → Batch list
 * - /propagation/batches/:id → Batch detail
 * - /propagation/propagules/:id → Propagule detail (individual tracking)
 * - /propagation/stations → Station list
 * - /propagation/stations/:id → Station detail
 * - /propagation/mother-plants → Mother plant registry
 * - /propagation/mother-plants/:id → Mother plant detail
 * - /propagation/supplies → Supplies inventory list
 * - /propagation/supplies/:id → Supply detail
 * - /propagation/analytics → Analytics dashboard
 * - /propagation/settings → Species configurations
 *
 * Note: New batch/station/mother plant/supply creation is handled via modals,
 * not separate routes.
 */

import type { RouteObject } from 'react-router-dom';
import { PropDashboard } from './components/Dashboard';
import { BatchList, BatchDetail } from './components/Batches';
import { PropaguleDetail } from './components/Propagules';
import { StationList, StationDetail } from './components/Stations';
import { MotherPlantList, MotherPlantDetail } from './components/MotherPlants';
import { SupplyList, SupplyDetail } from './components/Supplies';
import { AnalyticsDashboard } from './components/Analytics';
import { SettingsPage } from './components/Settings';

export const propagationRoutes: RouteObject[] = [
  // Dashboard as landing page
  { index: true, element: <PropDashboard /> },

  // Batch routes
  { path: 'batches', element: <BatchList /> },
  { path: 'batches/:id', element: <BatchDetail /> },

  // Propagule routes (individual tracking)
  { path: 'propagules/:id', element: <PropaguleDetail /> },

  // Station routes
  { path: 'stations', element: <StationList /> },
  { path: 'stations/:id', element: <StationDetail /> },

  // Mother plant routes
  { path: 'mother-plants', element: <MotherPlantList /> },
  { path: 'mother-plants/:id', element: <MotherPlantDetail /> },

  // Supplies routes
  { path: 'supplies', element: <SupplyList /> },
  { path: 'supplies/:id', element: <SupplyDetail /> },

  // Analytics route
  { path: 'analytics', element: <AnalyticsDashboard /> },

  // Settings route
  { path: 'settings', element: <SettingsPage /> },
];
