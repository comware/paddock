/**
 * Propagation Module - Enum & Union Types
 *
 * Core union types and constants used throughout
 * the propagation module.
 */

// ============================================
// ENUMS & UNION TYPES
// ============================================

/**
 * Propagation methods supported by the system.
 */
export type PropagationMethod =
  | 'cutting_softwood'
  | 'cutting_semi_hardwood'
  | 'cutting_hardwood'
  | 'cutting_leaf'
  | 'cutting_root'
  | 'division'
  | 'layering_simple'
  | 'layering_air'
  | 'grafting_whip'
  | 'grafting_cleft'
  | 'grafting_bud'
  | 'seed';

/**
 * Lifecycle stages for propagation tracking.
 */
export type PropagationStage =
  | 'taken'
  | 'rooting'
  | 'rooted'
  | 'potted_up'
  | 'hardening'
  | 'ready'
  | 'graduated'
  | 'failed';

/**
 * Valid stage transitions (from -> to[]).
 */
export const VALID_STAGE_TRANSITIONS: Record<PropagationStage, PropagationStage[]> = {
  taken: ['rooting', 'failed'],
  rooting: ['rooted', 'failed'],
  rooted: ['potted_up', 'failed'],
  potted_up: ['hardening', 'failed'],
  hardening: ['ready', 'failed'],
  ready: ['graduated', 'failed'],
  graduated: [],
  failed: [],
};

/**
 * Final outcomes for graduated propagules.
 */
export type GraduationOutcome =
  | 'personal_use'
  | 'planted_garden'
  | 'gifted'
  | 'sold'
  | 'composted';

/**
 * Reasons for propagation failure.
 */
export type FailureReason =
  | 'rot'
  | 'dried_out'
  | 'disease'
  | 'pest'
  | 'no_roots'
  | 'transplant_shock'
  | 'environmental'
  | 'unknown';

/**
 * Station type classifications.
 */
export type StationType =
  | 'heated_propagator'
  | 'unheated_propagator'
  | 'water_propagation'
  | 'outdoor_bed'
  | 'cold_frame'
  | 'greenhouse_bench'
  | 'mist_system'
  | 'other';

/**
 * Mother plant status.
 */
export type MotherPlantStatus = 'active' | 'retired' | 'deceased';

/**
 * How a mother plant was acquired.
 */
export type AcquisitionMethod = 'purchased' | 'propagated' | 'gifted' | 'wild_collected';

/**
 * Supply categories for cost tracking.
 */
export type SupplyCategory =
  | 'rooting_hormone'
  | 'growing_medium'
  | 'containers'
  | 'labels'
  | 'tools'
  | 'heating'
  | 'misting'
  | 'other';
