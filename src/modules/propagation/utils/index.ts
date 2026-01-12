/**
 * Propagation Module - Utility Functions
 *
 * Re-exports all utility functions for the propagation module.
 */

// Stage helpers - transition validation, display, calculations
export {
  // Display configuration
  STAGE_DISPLAY_NAMES,
  STAGE_COLORS,
  TYPICAL_STAGE_DAYS,
  STAGE_ORDER,
  // Transition validation
  isValidTransition,
  getValidNextStages,
  isTerminalStage,
  isActiveStage,
  getStageProgressPercent,
  // Days calculation
  daysSince,
  daysBetween,
  getStageStartDate,
  calculateDaysInStage,
  calculateDaysSinceTaken,
  isOverdue,
  getDaysUntilOverdue,
  // Survival rate
  calculateSurvivalRate,
  // Display helpers
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
} from './stageHelpers';

// Batch numbering - YYYY-NNN format generation
export {
  parseBatchNumber,
  formatBatchNumber,
  getCurrentYear,
  generateNextBatchNumber,
  isValidBatchNumber,
  batchNumberExists,
  getBatchNumbersForYear,
  getYearsWithBatches,
  getBatchCountForYear,
} from './batchNumbering';

// Mother plant metrics - productivity calculations
export {
  // Core metrics
  getBatchesByMotherPlant,
  getTotalBatchesTaken,
  getTotalPropagulesStarted,
  getTotalPropagulesGraduated,
  getSuccessRate,
  getPropaguleSuccessRate,
  // Comprehensive metrics
  getMotherPlantMetrics,
  getExtendedMotherPlantMetrics,
  // Bulk/comparison metrics
  getMotherPlantSummaries,
  rankMotherPlantsByProductivity,
  // Display helpers
  formatSeason,
  formatSuccessRate,
  getProductivityLevel,
  getProductivityColor,
} from './motherPlantMetrics';
export type { ExtendedMotherPlantMetrics, MotherPlantSummary } from './motherPlantMetrics';

// Cost calculations - batch cost analysis and formatting
export {
  // Basic calculations
  getTotalBatchCost,
  getCostPerPropaguleStarted,
  getCostPerPropaguleSurviving,
  getCostPerPropaguleGraduated,
  // Batch analysis
  getBatchCostBreakdown,
  // Aggregate analytics
  getTotalCostAcrossBatches,
  getCostsBySupply,
  getTotalSpentOnSupplies,
  getTotalManualCosts,
  // Display helpers
  formatCost,
  formatCostPerUnit,
  getCategoryDisplayName,
  CATEGORY_SORT_ORDER,
  sortBreakdownByCategory,
} from './costCalculations';

// Analytics calculations - aggregated analytics for dashboards
export {
  // Time period filtering
  getTimePeriodCutoff,
  filterBatchesByPeriod,
  filterGraduationsByPeriod,
  filterTransitionsByPeriod,
  // Success rate calculations
  calculateSuccessRate,
  calculateSuccessRateByDimension,
  calculateSuccessRateBySpecies,
  calculateSuccessRateByMethod,
  calculateSuccessRateByStation,
  calculateSuccessRateByMotherPlant,
  calculateSuccessRateBySeason,
  // Failure analysis
  getFailuresByStage,
  getFailureReasonDistribution,
  getMostProblematicStage,
  // Outcome analytics
  getOutcomeDistribution,
  getOutcomesByMonth,
  getTotalGraduated,
  // Cost analytics
  getAverageCostPerPropagule,
  getCostBySupplyCategory,
  getMostExpensiveSpecies,
  // Display helpers
  getFailureReasonDisplayName,
  getOutcomeDisplayName,
  getMethodDisplayName,
  getTimePeriodDisplayName,
} from './analyticsCalculations';
export type {
  TimePeriod,
  SuccessRateResult,
  FailureByStage,
  OutcomeDistribution,
  MonthlyOutcome,
  CostByCategory,
  SpeciesCostRanking,
} from './analyticsCalculations';
