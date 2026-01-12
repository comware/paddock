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
