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
