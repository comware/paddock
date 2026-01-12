/**
 * Propagation Module - Stores
 *
 * Re-exports all Zustand stores for the propagation module.
 */

export { useBatches } from './useBatches';
export type { BatchesState, BatchStatus } from './useBatches';

export { useStageTransitions } from './useStageTransitions';
export type {
  StageTransitionsState,
  TransitionWithDuration,
  FailureByReason,
} from './useStageTransitions';

export { useStations, DEFAULT_ENVIRONMENTAL_TARGETS } from './useStations';
export type {
  StationsState,
  StationWithOccupancy,
  StationFilters,
  EnvironmentalValidation,
  UpdateStationInput,
} from './useStations';

export { useMotherPlants } from './useMotherPlants';
export type {
  MotherPlantsState,
  HealthAssessment,
  PropMotherPlantWithComputed,
  MotherPlantFilters,
  MotherPlantSort,
} from './useMotherPlants';

export { useSupplies } from './useSupplies';
export type {
  SuppliesState,
  SupplyFilters,
  UpdateSupplyInput,
} from './useSupplies';

export { useBatchCosts } from './useBatchCosts';
export type {
  BatchCostsState,
  AddSupplyCostInput,
  AddManualCostInput,
  EnrichedBatchCost,
  SupplyUsageSummary,
} from './useBatchCosts';

export { useAnalytics } from './useAnalytics';
export type { AnalyticsState } from './useAnalytics';

export { useSpeciesConfigs } from './useSpeciesConfigs';
export type {
  SpeciesConfigsState,
  CreateSpeciesConfigInput,
  UpdateSpeciesConfigInput,
  PropSpeciesConfigWithDefaults,
} from './useSpeciesConfigs';

export { usePropagules } from './usePropagules';
export type {
  PropagulesState,
  PropaguleFilters,
  PropaguleSort,
  CreatePropaguleFromBatchInput,
  UpdatePropaguleInput,
  MeasurementInput,
} from './usePropagules';

export { useGraduations } from './useGraduations';
export type {
  GraduationsState,
  EnrichedGraduation,
  GraduationFilters,
  GraduationSummary,
  RecordGraduationInput,
} from './useGraduations';
