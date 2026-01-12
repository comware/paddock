/**
 * useStageTransitions - Zustand store for stage transition audit log
 *
 * Manages immutable stage transition records. This store records every
 * stage change for batches and propagules, enabling history display,
 * analytics on success rates, and debugging issues.
 *
 * IMPORTANT: This is an immutable audit log. Records can only be created,
 * never updated or deleted.
 *
 * Following patterns from useBatches.ts in the propagation module.
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropStageTransition,
  PropagationStage,
  FailureReason,
  StageTransitionInput,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Transition record with computed duration field.
 */
export interface TransitionWithDuration extends PropStageTransition {
  /** Duration in this stage before transitioning (days), null if still in stage */
  durationDays: number | null;
}

/**
 * Failure analytics by reason.
 */
export interface FailureByReason {
  reason: FailureReason;
  count: number;
  percentage: number;
}

export interface StageTransitionsState {
  // Raw data from DB
  transitions: PropStageTransition[];
  isLoading: boolean;
  error: string | null;

  // Actions - Create only (immutable audit log)
  loadTransitions: () => Promise<void>;
  addTransition: (input: StageTransitionInput) => Promise<string>;

  // Selectors - Query functions
  getTransitionsByBatch: (batchId: string) => PropStageTransition[];
  getTransitionsByPropagule: (propaguleId: string) => PropStageTransition[];
  getLatestTransition: (batchId: string) => PropStageTransition | undefined;
  getDurationInStage: (batchId: string, stage: PropagationStage) => number | null;
  getFailuresByReason: () => FailureByReason[];
  getTransitionsByDateRange: (from: Date, to: Date) => PropStageTransition[];
  getTransitionsWithDuration: (batchId: string) => TransitionWithDuration[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate duration between two dates in days.
 */
function calculateDaysBetween(from: Date, to: Date): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Sort transitions by date descending (most recent first).
 */
function sortByDateDesc(a: PropStageTransition, b: PropStageTransition): number {
  return new Date(b.transitionDate).getTime() - new Date(a.transitionDate).getTime();
}

/**
 * Sort transitions by date ascending (oldest first).
 */
function sortByDateAsc(a: PropStageTransition, b: PropStageTransition): number {
  return new Date(a.transitionDate).getTime() - new Date(b.transitionDate).getTime();
}

// ============================================
// STORE
// ============================================

export const useStageTransitions = create<StageTransitionsState>((set, get) => ({
  transitions: [],
  isLoading: true,
  error: null,

  // Load all transitions from database
  loadTransitions: async () => {
    try {
      set({ isLoading: true, error: null });
      const transitions = await propDb.stageTransitions.toArray();
      set({ transitions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add a new transition record (immutable - no update/delete)
  addTransition: async (input: StageTransitionInput) => {
    const { transitions } = get();
    const now = new Date();

    // Determine fromStage based on existing transitions
    let fromStage: PropagationStage | null = null;
    let quantityBefore: number | undefined;

    if (input.batchId) {
      // Find the latest transition for this batch to get fromStage
      const batchTransitions = transitions
        .filter((t) => t.batchId === input.batchId)
        .sort(sortByDateDesc);

      if (batchTransitions.length > 0) {
        fromStage = batchTransitions[0].toStage;
        quantityBefore = batchTransitions[0].quantityAfter;
      } else {
        // First transition - no previous stage
        fromStage = null;
      }
    } else if (input.propaguleId) {
      // Find the latest transition for this propagule
      const propaguleTransitions = transitions
        .filter((t) => t.propaguleId === input.propaguleId)
        .sort(sortByDateDesc);

      if (propaguleTransitions.length > 0) {
        fromStage = propaguleTransitions[0].toStage;
      } else {
        fromStage = null;
      }
    }

    const transition: Omit<PropStageTransition, 'id'> = {
      batchId: input.batchId,
      propaguleId: input.propaguleId,
      fromStage,
      toStage: input.toStage,
      transitionDate: now,
      quantityBefore,
      quantityAfter: input.quantityAfter,
      failureReason: input.failureReason,
      notes: input.notes,
      createdAt: now,
    };

    try {
      const id = await propDb.stageTransitions.add(transition as PropStageTransition);
      const newTransition = { ...transition, id: String(id) } as PropStageTransition;
      set((state) => ({
        transitions: [...state.transitions, newTransition],
      }));
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Get all transitions for a specific batch
  getTransitionsByBatch: (batchId: string) => {
    const { transitions } = get();
    return transitions
      .filter((t) => t.batchId === batchId)
      .sort(sortByDateAsc);
  },

  // Get all transitions for a specific propagule
  getTransitionsByPropagule: (propaguleId: string) => {
    const { transitions } = get();
    return transitions
      .filter((t) => t.propaguleId === propaguleId)
      .sort(sortByDateAsc);
  },

  // Get the most recent transition for a batch
  getLatestTransition: (batchId: string) => {
    const { transitions } = get();
    const batchTransitions = transitions
      .filter((t) => t.batchId === batchId)
      .sort(sortByDateDesc);

    return batchTransitions[0];
  },

  // Calculate how long a batch spent in a specific stage (in days)
  getDurationInStage: (batchId: string, stage: PropagationStage) => {
    const { transitions } = get();
    const batchTransitions = transitions
      .filter((t) => t.batchId === batchId)
      .sort(sortByDateAsc);

    // Find when we entered this stage
    const entryTransition = batchTransitions.find((t) => t.toStage === stage);
    if (!entryTransition) {
      return null; // Never entered this stage
    }

    // Find when we left this stage (next transition after entry)
    const entryIndex = batchTransitions.indexOf(entryTransition);
    const exitTransition = batchTransitions[entryIndex + 1];

    if (!exitTransition) {
      // Still in this stage - calculate from entry to now
      return calculateDaysBetween(entryTransition.transitionDate, new Date());
    }

    // Calculate duration between entry and exit
    return calculateDaysBetween(entryTransition.transitionDate, exitTransition.transitionDate);
  },

  // Get failure counts grouped by reason for analytics
  getFailuresByReason: () => {
    const { transitions } = get();
    const failedTransitions = transitions.filter(
      (t) => t.toStage === 'failed' && t.failureReason
    );

    if (failedTransitions.length === 0) {
      return [];
    }

    // Count by reason
    const reasonCounts = new Map<FailureReason, number>();
    for (const t of failedTransitions) {
      if (t.failureReason) {
        const count = reasonCounts.get(t.failureReason) || 0;
        reasonCounts.set(t.failureReason, count + 1);
      }
    }

    // Convert to array with percentages
    const total = failedTransitions.length;
    const results: FailureByReason[] = [];
    for (const [reason, count] of reasonCounts) {
      results.push({
        reason,
        count,
        percentage: Math.round((count / total) * 100),
      });
    }

    // Sort by count descending
    return results.sort((a, b) => b.count - a.count);
  },

  // Get transitions within a date range
  getTransitionsByDateRange: (from: Date, to: Date) => {
    const { transitions } = get();
    return transitions.filter((t) => {
      const transitionDate = new Date(t.transitionDate);
      return transitionDate >= from && transitionDate <= to;
    }).sort(sortByDateAsc);
  },

  // Get transitions with computed duration for timeline display
  getTransitionsWithDuration: (batchId: string) => {
    const { transitions } = get();
    const batchTransitions = transitions
      .filter((t) => t.batchId === batchId)
      .sort(sortByDateAsc);

    return batchTransitions.map((t, index) => {
      const nextTransition = batchTransitions[index + 1];
      const durationDays = nextTransition
        ? calculateDaysBetween(t.transitionDate, nextTransition.transitionDate)
        : null; // Still in current stage

      return {
        ...t,
        durationDays,
      };
    });
  },
}));
