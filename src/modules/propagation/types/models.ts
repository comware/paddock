/**
 * Propagation Module - Domain Model Types
 *
 * Core data models: mother plants, stations, batches,
 * propagules, transitions, graduations, supplies, costs,
 * and species configs.
 */

import type {
  PropagationMethod,
  PropagationStage,
  GraduationOutcome,
  FailureReason,
  StationType,
  MotherPlantStatus,
  AcquisitionMethod,
  SupplyCategory,
} from './enums';

// ============================================
// MOTHER PLANTS
// ============================================

export interface PropMotherPlant {
  id?: string;
  siteId: string;
  location?: string;
  species: string;
  variety?: string;
  scientificName?: string;
  label: string;
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  acquisitionSource?: string;
  acquisitionCost?: number;
  status: MotherPlantStatus;
  estimatedAge?: number;
  lastHealthCheck?: Date;
  healthScore?: number;
  healthNotes?: string;
  bestPropagationMethod?: PropagationMethod;
  bestSeason?: string;
  propagationNotes?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateMotherPlantInput = Omit<
  PropMotherPlant,
  'id' | 'createdAt' | 'updatedAt' | 'status'
> & {
  status?: MotherPlantStatus;
};

export type UpdateMotherPlantInput = Partial<
  Omit<PropMotherPlant, 'id' | 'createdAt' | 'updatedAt'>
>;

// ============================================
// PROPAGATION STATIONS
// ============================================

export interface PropStation {
  id?: string;
  siteId: string;
  name: string;
  type: StationType;
  description?: string;
  capacity: number;
  isIndoor: boolean;
  targetTempMin?: number;
  targetTempMax?: number;
  targetHumidityMin?: number;
  targetHumidityMax?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropStationLog {
  id?: string;
  stationId: string;
  date: Date;
  temperature?: number;
  humidity?: number;
  notes?: string;
  createdAt: Date;
}

export type CreateStationInput = Omit<PropStation, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================
// PROPAGATION BATCHES
// ============================================

export interface PropBatch {
  id?: string;
  batchNumber: string;
  siteId: string;
  stationId: string;
  species: string;
  variety?: string;
  motherPlantId?: string;
  method: PropagationMethod;
  quantityStarted: number;
  quantitySurviving: number;
  dateTaken: Date;
  dateRooted?: Date;
  datePottedUp?: Date;
  dateHardeningStarted?: Date;
  dateReady?: Date;
  dateGraduated?: Date;
  stage: PropagationStage;
  daysInStage: number;
  preparationNotes?: string;
  rootingMedium?: string;
  hormoneUsed?: string;
  isExploded: boolean;
  photoUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateBatchInput = Omit<
  PropBatch,
  | 'id' | 'batchNumber' | 'stage' | 'daysInStage' | 'isExploded'
  | 'quantitySurviving' | 'dateRooted' | 'datePottedUp'
  | 'dateHardeningStarted' | 'dateReady' | 'dateGraduated'
  | 'createdAt' | 'updatedAt'
>;

export interface PropBatchWithComputed extends PropBatch {
  daysInStage: number;
  daysSinceTaken: number;
  survivalRate: number;
  totalCost: number;
  costPerStarted: number;
  costPerSurviving: number;
  isOverdue: boolean;
  motherPlantLabel?: string;
  stationName?: string;
}

// ============================================
// INDIVIDUAL PROPAGULES
// ============================================

export interface PropPropagule {
  id?: string;
  batchId: string;
  propaguleNumber: string;
  siteId: string;
  stationId: string;
  species: string;
  variety?: string;
  motherPlantId?: string;
  method: PropagationMethod;
  label?: string;
  scionSource?: string;
  rootstockType?: string;
  stage: PropagationStage;
  healthScore?: number;
  heightCm?: number;
  stemDiameterMm?: number;
  leafCount?: number;
  rootScore?: number;
  photoUrls: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropPropaguleWithComputed extends PropPropagule {
  daysInStage: number;
  daysSinceTaken: number;
  batchNumber?: string;
  stationName?: string;
}

// ============================================
// STAGE TRANSITIONS (AUDIT LOG)
// ============================================

export interface PropStageTransition {
  id?: string;
  batchId?: string;
  propaguleId?: string;
  fromStage: PropagationStage | null;
  toStage: PropagationStage;
  transitionDate: Date;
  quantityBefore?: number;
  quantityAfter?: number;
  failureReason?: FailureReason;
  notes?: string;
  createdAt: Date;
}

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

export interface PropGraduation {
  id?: string;
  batchId?: string;
  propaguleId?: string;
  quantity: number;
  outcome: GraduationOutcome;
  graduationDate: Date;
  recipientName?: string;
  recipientContact?: string;
  saleReferenceId?: string;
  salePrice?: number;
  plantedLocation?: string;
  /**
   * The vegetable planting this became, when it went into a bed you track.
   *
   * `sold` has always pointed at something structured via saleReferenceId while
   * `planted_garden` pointed at free text. Now that a planting is a real row, this closes
   * the loop from mother plant through to the picks that came off the bed.
   *
   * The link lives here rather than as a graduationId on the planting because a bed can be
   * topped up from several graduations and can also be direct-sown - N to 1 is true where
   * 1 to 1 is not - and because pointing propagation at vegetables keeps vegetables
   * standalone for a grower who never opens propagation.
   */
  plantingId?: string;
  notes?: string;
  createdAt: Date;
}

export interface GraduationInput {
  batchId?: string;
  propaguleId?: string;
  quantity: number;
  outcome: GraduationOutcome;
  recipientName?: string;
  plantedLocation?: string;
  plantingId?: string;
  salePrice?: number;
  notes?: string;
}

// ============================================
// SUPPLIES & COSTS
// ============================================

export interface PropSupply {
  id?: string;
  name: string;
  category: SupplyCategory;
  purchaseDate: Date;
  supplier?: string;
  quantityPurchased: number;
  unit: string;
  totalCost: number;
  quantityRemaining: number;
  lowStockThreshold?: number;
  costPerUnit: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropSupplyWithStatus extends PropSupply {
  isLowStock: boolean;
  usageCount: number;
}

export type CreateSupplyInput = Omit<
  PropSupply,
  'id' | 'quantityRemaining' | 'costPerUnit' | 'createdAt' | 'updatedAt'
>;

export interface PropBatchCost {
  id?: string;
  batchId: string;
  supplyId?: string;
  quantityUsed?: number;
  calculatedCost?: number;
  manualCost?: number;
  manualDescription?: string;
  createdAt: Date;
}

export interface PropBatchCostWithSupply extends PropBatchCost {
  supplyName?: string;
  supplyCategory?: SupplyCategory;
  supplyUnit?: string;
}

export type CreateBatchCostInput = Omit<PropBatchCost, 'id' | 'calculatedCost' | 'createdAt'>;

// ============================================
// SPECIES CONFIGURATION
// ============================================

export interface PropSpeciesConfig {
  id?: string;
  species: string;
  scientificName?: string;
  preferredMethod?: PropagationMethod;
  typicalRootingDays?: number;
  typicalDaysToReady?: number;
  maxDaysRooting?: number;
  maxDaysPottedUp?: number;
  maxDaysHardening?: number;
  bestPropagationMonths?: number[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
