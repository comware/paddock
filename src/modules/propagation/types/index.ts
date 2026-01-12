/**
 * Propagation Module - Type Definitions
 *
 * Complete TypeScript types for the Paddock Propagation module.
 * Enables tracking plant propagation from cutting to graduation.
 *
 * From PRD: docs/prd/propagation-module-prd.md
 * Domain Models: docs/prd/propagation-domain-models.md
 */

// ============================================
// ENUMS & UNION TYPES
// ============================================

/**
 * Propagation methods supported by the system.
 * Categorized by plant material type.
 */
export type PropagationMethod =
  // Cuttings (vegetative)
  | 'cutting_softwood'
  | 'cutting_semi_hardwood'
  | 'cutting_hardwood'
  | 'cutting_leaf'
  | 'cutting_root'
  // Division
  | 'division'
  // Layering
  | 'layering_simple'
  | 'layering_air'
  // Grafting
  | 'grafting_whip'
  | 'grafting_cleft'
  | 'grafting_bud'
  // Seed
  | 'seed';

/**
 * Lifecycle stages for propagation tracking.
 * Ordered progression with 'failed' as terminal state from any stage.
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
 * Used for validation and UI state machine.
 */
export const VALID_STAGE_TRANSITIONS: Record<PropagationStage, PropagationStage[]> = {
  taken: ['rooting', 'failed'],
  rooting: ['rooted', 'failed'],
  rooted: ['potted_up', 'failed'],
  potted_up: ['hardening', 'failed'],
  hardening: ['ready', 'failed'],
  ready: ['graduated', 'failed'],
  graduated: [], // Terminal state
  failed: [],    // Terminal state
};

/**
 * Final outcomes for graduated propagules.
 */
export type GraduationOutcome =
  | 'personal_use'   // Kept for own use
  | 'planted_garden' // Planted in landscape/garden
  | 'gifted'         // Given to someone
  | 'sold'           // Sold (links to Sales module)
  | 'composted';     // Failed at final stage

/**
 * Reasons for propagation failure.
 * Required when marking as failed.
 */
export type FailureReason =
  | 'rot'              // Fungal/bacterial rot
  | 'dried_out'        // Insufficient moisture
  | 'disease'          // Pathogen infection
  | 'pest'             // Insect/pest damage
  | 'no_roots'         // Failed to develop roots
  | 'transplant_shock' // Died after potting/moving
  | 'environmental'    // Temperature/humidity issues
  | 'unknown';         // Cause not determined

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
export type MotherPlantStatus =
  | 'active'    // Currently used for propagation
  | 'retired'   // No longer used but preserved
  | 'deceased'; // Plant has died

/**
 * How a mother plant was acquired.
 */
export type AcquisitionMethod =
  | 'purchased'
  | 'propagated'
  | 'gifted'
  | 'wild_collected';

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

// ============================================
// MOTHER PLANTS
// ============================================

/**
 * Mother/stock plant that provides propagation material.
 */
export interface PropMotherPlant {
  id?: string;

  // Location
  siteId: string;
  location?: string;            // Physical location description

  // Identification
  species: string;              // Common name
  variety?: string;             // Cultivar/variety
  scientificName?: string;      // Binomial nomenclature
  label: string;                // User identifier for this plant

  // Acquisition history
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  acquisitionSource?: string;   // Nursery name, friend's name, etc.
  acquisitionCost?: number;     // In local currency

  // Status
  status: MotherPlantStatus;
  estimatedAge?: number;        // Months

  // Health tracking
  lastHealthCheck?: Date;
  healthScore?: number;         // 1-5 scale
  healthNotes?: string;

  // Propagation preferences (learned over time)
  bestPropagationMethod?: PropagationMethod;
  bestSeason?: string;          // "spring", "late_summer", etc.
  propagationNotes?: string;

  // Media
  photoUrl?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating a new mother plant.
 */
export type CreateMotherPlantInput = Omit<
  PropMotherPlant,
  'id' | 'createdAt' | 'updatedAt' | 'status'
> & {
  status?: MotherPlantStatus; // Defaults to 'active'
};

/**
 * Form data for updating a mother plant.
 */
export type UpdateMotherPlantInput = Partial<
  Omit<PropMotherPlant, 'id' | 'createdAt' | 'updatedAt'>
>;

// ============================================
// PROPAGATION STATIONS
// ============================================

/**
 * Physical location where propagules root and develop.
 */
export interface PropStation {
  id?: string;

  // Location
  siteId: string;

  // Identification
  name: string;                 // User-friendly name
  type: StationType;
  description?: string;

  // Capacity
  capacity: number;             // Max propagules/slots

  // Environment
  isIndoor: boolean;
  targetTempMin?: number;       // Celsius
  targetTempMax?: number;
  targetHumidityMin?: number;   // Percentage (0-100)
  targetHumidityMax?: number;

  // Status
  isActive: boolean;            // Inactive stations cannot receive batches

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Environmental log entry for a station.
 */
export interface PropStationLog {
  id?: string;
  stationId: string;
  date: Date;
  temperature?: number;         // Celsius
  humidity?: number;            // Percentage (0-100)
  notes?: string;
  createdAt: Date;
}

/**
 * Form data for creating a station.
 */
export type CreateStationInput = Omit<
  PropStation,
  'id' | 'createdAt' | 'updatedAt'
>;

// ============================================
// PROPAGATION BATCHES
// ============================================

/**
 * Cohort of propagules taken at the same time.
 */
export interface PropBatch {
  id?: string;

  // Identification
  batchNumber: string;          // Format: "YYYY-NNN" (auto-generated)

  // Location
  siteId: string;
  stationId: string;            // Current station

  // Source
  species: string;
  variety?: string;
  motherPlantId?: string;       // Optional link to mother plant

  // Method
  method: PropagationMethod;

  // Quantity tracking
  quantityStarted: number;      // Initial count
  quantitySurviving: number;    // Current living count

  // Key dates
  dateTaken: Date;
  dateRooted?: Date;
  datePottedUp?: Date;
  dateHardeningStarted?: Date;
  dateReady?: Date;
  dateGraduated?: Date;         // When last propagule graduated

  // Current state
  stage: PropagationStage;
  daysInStage: number;          // Cached, updated on load

  // Preparation details
  preparationNotes?: string;
  rootingMedium?: string;
  hormoneUsed?: string;

  // Batch management
  isExploded: boolean;          // Has been converted to individuals

  // Media
  photoUrls: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating a new batch.
 */
export type CreateBatchInput = Omit<
  PropBatch,
  | 'id'
  | 'batchNumber'
  | 'stage'
  | 'daysInStage'
  | 'isExploded'
  | 'quantitySurviving'
  | 'dateRooted'
  | 'datePottedUp'
  | 'dateHardeningStarted'
  | 'dateReady'
  | 'dateGraduated'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Batch with computed fields for UI display.
 */
export interface PropBatchWithComputed extends PropBatch {
  // Computed fields
  daysInStage: number;
  daysSinceTaken: number;
  survivalRate: number;         // percentage
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  isOverdue: boolean;           // Past expected time for stage
  motherPlantLabel?: string;    // Denormalized for display
  stationName?: string;         // Denormalized for display
}

// ============================================
// INDIVIDUAL PROPAGULES
// ============================================

/**
 * Single propagule tracked independently.
 * Created when a batch is "exploded" for individual tracking.
 */
export interface PropPropagule {
  id?: string;

  // Parent batch
  batchId: string;
  propaguleNumber: string;      // Format: "YYYY-NNN-XX"

  // Location (can differ from batch)
  siteId: string;
  stationId: string;

  // Inherited from batch (denormalized)
  species: string;
  variety?: string;
  motherPlantId?: string;
  method: PropagationMethod;

  // Individual details
  label?: string;               // Custom name

  // For grafts
  scionSource?: string;
  rootstockType?: string;

  // Current state
  stage: PropagationStage;
  healthScore?: number;         // 1-5 scale

  // Measurements
  heightCm?: number;
  stemDiameterMm?: number;
  leafCount?: number;
  rootScore?: number;           // 1-5 scale for root development

  // Media
  photoUrls: string[];

  // Notes
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Propagule with computed display fields.
 */
export interface PropPropaguleWithComputed extends PropPropagule {
  daysInStage: number;
  daysSinceTaken: number;
  batchNumber?: string;         // From parent batch
  stationName?: string;
}

// ============================================
// STAGE TRANSITIONS (AUDIT LOG)
// ============================================

/**
 * Immutable record of a stage change.
 */
export interface PropStageTransition {
  id?: string;

  // Target (exactly one must be set)
  batchId?: string;
  propaguleId?: string;

  // Transition details
  fromStage: PropagationStage | null; // null for initial 'taken'
  toStage: PropagationStage;
  transitionDate: Date;

  // Quantity tracking (batch only)
  quantityBefore?: number;
  quantityAfter?: number;

  // Failure details
  failureReason?: FailureReason;

  notes?: string;

  createdAt: Date;
}

/**
 * Input for creating a stage transition.
 */
export interface StageTransitionInput {
  batchId?: string;
  propaguleId?: string;
  toStage: PropagationStage;
  quantityAfter?: number;
  failureReason?: FailureReason;
  notes?: string;
}

// ============================================
// GRADUATIONS (OUTCOMES)
// ============================================

/**
 * Final disposition of propagules.
 */
export interface PropGraduation {
  id?: string;

  // Source (exactly one must be set)
  batchId?: string;
  propaguleId?: string;

  // Graduation details
  quantity: number;             // Number graduating (1 for individuals)
  outcome: GraduationOutcome;
  graduationDate: Date;

  // Gift details
  recipientName?: string;
  recipientContact?: string;    // Email/phone for follow-up

  // Sale details (future Sales module integration)
  saleReferenceId?: string;
  salePrice?: number;

  // Planting details
  plantedLocation?: string;     // Where in garden

  notes?: string;

  createdAt: Date;
}

/**
 * Input for recording a graduation.
 */
export interface GraduationInput {
  batchId?: string;
  propaguleId?: string;
  quantity: number;
  outcome: GraduationOutcome;
  recipientName?: string;
  plantedLocation?: string;
  salePrice?: number;
  notes?: string;
}

// ============================================
// SUPPLIES & COSTS
// ============================================

/**
 * Consumable supply used in propagation.
 */
export interface PropSupply {
  id?: string;

  // Identification
  name: string;
  category: SupplyCategory;

  // Purchase details
  purchaseDate: Date;
  supplier?: string;
  quantityPurchased: number;
  unit: string;                 // "ml", "L", "pcs", "kg", "g"
  totalCost: number;

  // Inventory
  quantityRemaining: number;
  lowStockThreshold?: number;

  // Computed (stored for query performance)
  costPerUnit: number;          // totalCost / quantityPurchased

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supply with inventory status computed.
 */
export interface PropSupplyWithStatus extends PropSupply {
  isLowStock: boolean;
  usageCount: number;           // Number of batches using this supply
}

/**
 * Form data for adding a supply.
 */
export type CreateSupplyInput = Omit<
  PropSupply,
  'id' | 'quantityRemaining' | 'costPerUnit' | 'createdAt' | 'updatedAt'
>;

/**
 * Cost allocation to a batch.
 */
export interface PropBatchCost {
  id?: string;
  batchId: string;

  // Supply-linked cost (option 1)
  supplyId?: string;
  quantityUsed?: number;
  calculatedCost?: number;      // quantityUsed * supply.costPerUnit

  // Manual cost entry (option 2)
  manualCost?: number;
  manualDescription?: string;

  createdAt: Date;
}

/**
 * Cost entry with supply details included.
 */
export interface PropBatchCostWithSupply extends PropBatchCost {
  supplyName?: string;
  supplyCategory?: SupplyCategory;
  supplyUnit?: string;
}

/**
 * Input for adding a cost to a batch.
 */
export type CreateBatchCostInput = Omit<
  PropBatchCost,
  'id' | 'calculatedCost' | 'createdAt'
>;

// ============================================
// SPECIES CONFIGURATION
// ============================================

/**
 * Default settings for a plant species.
 */
export interface PropSpeciesConfig {
  id?: string;

  // Identification
  species: string;              // Unique common name
  scientificName?: string;

  // Default propagation settings
  preferredMethod?: PropagationMethod;
  typicalRootingDays?: number;
  typicalDaysToReady?: number;  // From taken to ready

  // Overdue warning thresholds
  maxDaysRooting?: number;
  maxDaysPottedUp?: number;
  maxDaysHardening?: number;

  // Seasonality
  bestPropagationMonths?: number[]; // 1-12

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * Success rate analytics result.
 */
export interface SuccessRateAnalytics {
  totalStarted: number;
  totalGraduated: number;
  totalFailed: number;
  totalInProgress: number;
  successRate: number;          // graduated / (graduated + failed) * 100
  failureRate: number;
  survivalRate: number;         // (graduated + inProgress) / started * 100
}

/**
 * Cost analytics for a batch.
 */
export interface BatchCostSummary {
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  costPerGraduated: number;
  breakdown: {
    category: SupplyCategory | 'manual';
    amount: number;
    percentage: number;
  }[];
}

/**
 * Mother plant productivity metrics.
 */
export interface MotherPlantMetrics {
  totalBatches: number;
  totalPropagules: number;
  totalGraduated: number;
  successRate: number;
  averageSuccessRate: number;   // Across all batches
  bestMethod?: PropagationMethod;
  bestSeason?: string;
}

/**
 * Station occupancy snapshot.
 */
export interface StationOccupancy {
  stationId: string;
  stationName: string;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  batchCount: number;
  batches: Pick<PropBatch, 'id' | 'batchNumber' | 'species' | 'stage'>[];
}

// ============================================
// FILTER & SORT TYPES
// ============================================

/**
 * Batch list filters.
 */
export interface BatchFilters {
  stage: PropagationStage | 'all' | 'active'; // 'active' = not graduated/failed
  species: string | 'all';
  method: PropagationMethod | 'all';
  stationId: string | 'all';
  motherPlantId: string | 'all';
  siteId: string | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Batch list sorting.
 */
export interface BatchSort {
  field: 'dateTaken' | 'batchNumber' | 'species' | 'stage' | 'daysInStage' | 'quantitySurviving';
  direction: 'asc' | 'desc';
}
