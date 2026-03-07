/**
 * Propagation Module - Type Definitions
 *
 * Barrel re-export from domain-specific type files:
 * - enums.ts      (union types and constants)
 * - models.ts     (domain model interfaces)
 * - analytics.ts  (analytics and filter types)
 */

// ============================================
// ENUMS & UNION TYPES
// ============================================

export type {
  PropagationMethod,
  PropagationStage,
  GraduationOutcome,
  FailureReason,
  StationType,
  MotherPlantStatus,
  AcquisitionMethod,
  SupplyCategory,
} from './enums';

export { VALID_STAGE_TRANSITIONS } from './enums';

// ============================================
// DOMAIN MODELS
// ============================================

export type {
  // Mother Plants
  PropMotherPlant,
  CreateMotherPlantInput,
  UpdateMotherPlantInput,
  // Stations
  PropStation,
  PropStationLog,
  CreateStationInput,
  // Batches
  PropBatch,
  CreateBatchInput,
  PropBatchWithComputed,
  // Propagules
  PropPropagule,
  PropPropaguleWithComputed,
  // Stage Transitions
  PropStageTransition,
  StageTransitionInput,
  // Graduations
  PropGraduation,
  GraduationInput,
  // Supplies & Costs
  PropSupply,
  PropSupplyWithStatus,
  CreateSupplyInput,
  PropBatchCost,
  PropBatchCostWithSupply,
  CreateBatchCostInput,
  // Species Configuration
  PropSpeciesConfig,
} from './models';

// ============================================
// ANALYTICS & FILTERS
// ============================================

export type {
  SuccessRateAnalytics,
  BatchCostSummary,
  MotherPlantMetrics,
  StationOccupancy,
  BatchFilters,
  BatchSort,
} from './analytics';
