/**
 * Stage Helpers - Utilities for propagation stage management
 *
 * Provides stage transition validation, display helpers,
 * and days-in-stage calculations.
 */

import type { PropagationStage, PropBatch } from '../types';
import { VALID_STAGE_TRANSITIONS } from '../types';

// ============================================
// STAGE DISPLAY CONFIGURATION
// ============================================

/**
 * Display names for each stage.
 */
export const STAGE_DISPLAY_NAMES: Record<PropagationStage, string> = {
  taken: 'Taken',
  rooting: 'Rooting',
  rooted: 'Rooted',
  potted_up: 'Potted Up',
  hardening: 'Hardening Off',
  ready: 'Ready',
  graduated: 'Graduated',
  failed: 'Failed',
};

/**
 * Colors for each stage (Tailwind color classes).
 */
export const STAGE_COLORS: Record<PropagationStage, { bg: string; text: string; border: string }> = {
  taken: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  rooting: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  rooted: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  potted_up: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  hardening: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  ready: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  graduated: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
};

/**
 * Typical days expected for each stage (for overdue warnings).
 */
export const TYPICAL_STAGE_DAYS: Record<PropagationStage, number | null> = {
  taken: 1, // Brief initial state
  rooting: 21, // 3 weeks typical
  rooted: 7, // Brief confirmation state
  potted_up: 14, // 2 weeks to establish
  hardening: 14, // 2 weeks hardening off
  ready: null, // No limit - waiting for graduation
  graduated: null, // Terminal state
  failed: null, // Terminal state
};

/**
 * Ordered list of stages for progression display.
 */
export const STAGE_ORDER: PropagationStage[] = [
  'taken',
  'rooting',
  'rooted',
  'potted_up',
  'hardening',
  'ready',
  'graduated',
];

// ============================================
// STAGE TRANSITION HELPERS
// ============================================

/**
 * Check if a transition from one stage to another is valid.
 */
export function isValidTransition(
  fromStage: PropagationStage,
  toStage: PropagationStage
): boolean {
  const validTargets = VALID_STAGE_TRANSITIONS[fromStage];
  return validTargets.includes(toStage);
}

/**
 * Get valid next stages for the current stage.
 */
export function getValidNextStages(currentStage: PropagationStage): PropagationStage[] {
  return VALID_STAGE_TRANSITIONS[currentStage];
}

/**
 * Check if a stage is a terminal state (no further transitions possible).
 */
export function isTerminalStage(stage: PropagationStage): boolean {
  return VALID_STAGE_TRANSITIONS[stage].length === 0;
}

/**
 * Check if a stage is an active stage (not terminal).
 */
export function isActiveStage(stage: PropagationStage): boolean {
  return stage !== 'graduated' && stage !== 'failed';
}

/**
 * Get the progression percentage (0-100) for display.
 */
export function getStageProgressPercent(stage: PropagationStage): number {
  const activeStages = STAGE_ORDER.filter((s) => s !== 'graduated');
  const index = activeStages.indexOf(stage);
  if (index === -1) return stage === 'graduated' ? 100 : 0;
  return Math.round((index / (activeStages.length - 1)) * 100);
}

// ============================================
// DAYS CALCULATION HELPERS
// ============================================

/**
 * Calculate days since a given date.
 */
export function daysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days between two dates.
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the date when the current stage started based on batch dates.
 */
export function getStageStartDate(batch: PropBatch): Date {
  switch (batch.stage) {
    case 'taken':
      return new Date(batch.dateTaken);
    case 'rooting':
      return new Date(batch.dateTaken); // Rooting starts when taken
    case 'rooted':
      return batch.dateRooted ? new Date(batch.dateRooted) : new Date(batch.dateTaken);
    case 'potted_up':
      return batch.datePottedUp ? new Date(batch.datePottedUp) : new Date(batch.dateTaken);
    case 'hardening':
      return batch.dateHardeningStarted
        ? new Date(batch.dateHardeningStarted)
        : new Date(batch.dateTaken);
    case 'ready':
      return batch.dateReady ? new Date(batch.dateReady) : new Date(batch.dateTaken);
    case 'graduated':
      return batch.dateGraduated ? new Date(batch.dateGraduated) : new Date(batch.dateTaken);
    case 'failed':
      // For failed batches, use the most recent date
      return new Date(
        batch.dateGraduated ||
          batch.dateReady ||
          batch.dateHardeningStarted ||
          batch.datePottedUp ||
          batch.dateRooted ||
          batch.dateTaken
      );
    default:
      return new Date(batch.dateTaken);
  }
}

/**
 * Calculate days in current stage for a batch.
 */
export function calculateDaysInStage(batch: PropBatch): number {
  const stageStartDate = getStageStartDate(batch);
  return daysSince(stageStartDate);
}

/**
 * Calculate total days since propagation started.
 */
export function calculateDaysSinceTaken(dateTaken: Date): number {
  return daysSince(dateTaken);
}

/**
 * Check if a batch is overdue for its current stage.
 */
export function isOverdue(batch: PropBatch): boolean {
  const typicalDays = TYPICAL_STAGE_DAYS[batch.stage];
  if (typicalDays === null) return false;

  const daysInStage = calculateDaysInStage(batch);
  return daysInStage > typicalDays;
}

/**
 * Get days until overdue (negative if already overdue).
 */
export function getDaysUntilOverdue(batch: PropBatch): number | null {
  const typicalDays = TYPICAL_STAGE_DAYS[batch.stage];
  if (typicalDays === null) return null;

  const daysInStage = calculateDaysInStage(batch);
  return typicalDays - daysInStage;
}

// ============================================
// SURVIVAL RATE HELPERS
// ============================================

/**
 * Calculate survival rate as a percentage.
 */
export function calculateSurvivalRate(
  quantitySurviving: number,
  quantityStarted: number
): number {
  if (quantityStarted === 0) return 0;
  return Math.round((quantitySurviving / quantityStarted) * 100);
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get display name for a stage.
 */
export function getStageDisplayName(stage: PropagationStage): string {
  return STAGE_DISPLAY_NAMES[stage];
}

/**
 * Get color classes for a stage.
 */
export function getStageColors(stage: PropagationStage): {
  bg: string;
  text: string;
  border: string;
} {
  return STAGE_COLORS[stage];
}

/**
 * Format days in stage for display.
 */
export function formatDaysInStage(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}
