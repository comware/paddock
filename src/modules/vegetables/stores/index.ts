/**
 * Vegetables stores.
 *
 * Three tables, and the relationship between them is the module's whole shape: a bed is a
 * place, a planting is the record you open and work in, and a harvest is one pick. Beds
 * stay thin because rotation history is a query over plantings; harvests stay a log because
 * a total can be summed from events but events cannot be recovered from a total.
 */

export { useBeds, type BedsState } from './useBeds';
export {
  usePlantings,
  LEGAL_TRANSITIONS,
  type PlantingsState,
  type PlantingStatus,
} from './usePlantings';
export { useHarvests, type HarvestsState } from './useHarvests';
