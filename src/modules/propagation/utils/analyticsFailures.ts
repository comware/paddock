/**
 * Analytics - Failure Analysis
 *
 * Provides failure analysis by stage and reason.
 *
 * Extracted from analyticsCalculations.ts for code health.
 */

import type {
  PropBatch,
  PropStageTransition,
  PropagationStage,
  FailureReason,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Failure analysis by stage.
 */
export interface FailureByStage {
  stage: PropagationStage;
  count: number;
  percentage: number;
}

// ============================================
// FAILURE ANALYSIS
// ============================================

/**
 * Get the stage at which each batch failed.
 * Uses the fromStage of the failure transition.
 */
export function getFailuresByStage(
  batches: PropBatch[],
  transitions: PropStageTransition[]
): FailureByStage[] {
  const failedBatches = batches.filter((b) => b.stage === 'failed');

  if (failedBatches.length === 0) {
    return [];
  }

  // Build a map of batchId -> fromStage for failed transitions
  const failureStages = new Map<string, PropagationStage>();
  for (const transition of transitions) {
    if (transition.toStage === 'failed' && transition.batchId && transition.fromStage) {
      failureStages.set(transition.batchId, transition.fromStage);
    }
  }

  // Count failures by stage
  const stageCounts = new Map<PropagationStage, number>();
  for (const batch of failedBatches) {
    const failedAt = failureStages.get(batch.id!) ?? 'taken';
    const count = stageCounts.get(failedAt) ?? 0;
    stageCounts.set(failedAt, count + 1);
  }

  // Convert to array with percentages
  const totalFailures = failedBatches.length;
  const results: FailureByStage[] = [];

  for (const [stage, count] of stageCounts) {
    results.push({
      stage,
      count,
      percentage: Math.round((count / totalFailures) * 100),
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get failure reason distribution.
 */
export function getFailureReasonDistribution(
  transitions: PropStageTransition[]
): { reason: FailureReason; count: number; percentage: number }[] {
  const failedTransitions = transitions.filter(
    (t) => t.toStage === 'failed' && t.failureReason
  );

  if (failedTransitions.length === 0) {
    return [];
  }

  const reasonCounts = new Map<FailureReason, number>();
  for (const t of failedTransitions) {
    if (t.failureReason) {
      const count = reasonCounts.get(t.failureReason) ?? 0;
      reasonCounts.set(t.failureReason, count + 1);
    }
  }

  const total = failedTransitions.length;
  const results: { reason: FailureReason; count: number; percentage: number }[] = [];

  for (const [reason, count] of reasonCounts) {
    results.push({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get the most problematic stage (highest failure rate).
 */
export function getMostProblematicStage(
  failuresByStage: FailureByStage[]
): PropagationStage | null {
  if (failuresByStage.length === 0) return null;
  return failuresByStage[0].stage;
}
