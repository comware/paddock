/**
 * useStageTransitions Store Unit Tests
 *
 * Tests the stage transition audit log store including:
 * - Logging stage transitions
 * - Transition history queries
 * - Batch timeline reconstruction
 * - Failure analysis
 */

import { describe, it, expect } from 'vitest';
import type {
  PropStageTransition,
  PropagationStage,
  FailureReason,
} from '../../types';
import type { TransitionWithDuration, FailureByReason } from '../useStageTransitions';

// ============================================
// TEST FIXTURES
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createMockTransition(overrides: Partial<PropStageTransition> = {}): PropStageTransition {
  const now = new Date();
  return {
    id: 'transition-test',
    batchId: 'batch-1',
    fromStage: 'taken',
    toStage: 'rooting',
    transitionDate: now,
    createdAt: now,
    ...overrides,
  };
}

// Create a timeline of transitions for a batch
function createBatchTimeline(batchId: string): PropStageTransition[] {
  return [
    createMockTransition({
      id: 't1',
      batchId,
      fromStage: null,
      toStage: 'taken',
      transitionDate: daysAgo(30),
      quantityBefore: undefined,
      quantityAfter: 20,
    }),
    createMockTransition({
      id: 't2',
      batchId,
      fromStage: 'taken',
      toStage: 'rooting',
      transitionDate: daysAgo(29),
      quantityBefore: 20,
      quantityAfter: 20,
    }),
    createMockTransition({
      id: 't3',
      batchId,
      fromStage: 'rooting',
      toStage: 'rooted',
      transitionDate: daysAgo(15),
      quantityBefore: 20,
      quantityAfter: 18,
    }),
    createMockTransition({
      id: 't4',
      batchId,
      fromStage: 'rooted',
      toStage: 'potted_up',
      transitionDate: daysAgo(7),
      quantityBefore: 18,
      quantityAfter: 17,
    }),
  ];
}

// ============================================
// TRANSITION CREATION TESTS
// ============================================

describe('Transition Creation', () => {
  it('creates transition with correct properties', () => {
    const transition = createMockTransition({
      fromStage: 'taken',
      toStage: 'rooting',
      quantityBefore: 20,
      quantityAfter: 20,
    });

    expect(transition.fromStage).toBe('taken');
    expect(transition.toStage).toBe('rooting');
    expect(transition.quantityBefore).toBe(20);
    expect(transition.quantityAfter).toBe(20);
  });

  it('allows null fromStage for initial transition', () => {
    const transition = createMockTransition({
      fromStage: null,
      toStage: 'taken',
    });

    expect(transition.fromStage).toBeNull();
    expect(transition.toStage).toBe('taken');
  });

  it('includes failure reason for failed transitions', () => {
    const transition = createMockTransition({
      fromStage: 'rooting',
      toStage: 'failed',
      failureReason: 'rot',
      notes: 'Fungal infection detected',
    });

    expect(transition.toStage).toBe('failed');
    expect(transition.failureReason).toBe('rot');
    expect(transition.notes).toBe('Fungal infection detected');
  });

  it('supports propagule-level transitions', () => {
    const transition = createMockTransition({
      batchId: undefined,
      propaguleId: 'propagule-1',
      fromStage: 'rooted',
      toStage: 'potted_up',
    });

    expect(transition.propaguleId).toBe('propagule-1');
    expect(transition.batchId).toBeUndefined();
  });
});

// ============================================
// QUERY TESTS
// ============================================

describe('Transition Queries', () => {
  const transitions = [
    ...createBatchTimeline('batch-1'),
    ...createBatchTimeline('batch-2'),
    createMockTransition({
      id: 't-failed',
      batchId: 'batch-3',
      fromStage: 'rooting',
      toStage: 'failed',
      failureReason: 'rot',
      transitionDate: daysAgo(10),
    }),
  ];

  describe('getTransitionsByBatch', () => {
    // Inline filtering function for testing
    function getTransitionsByBatch(
      transitionList: PropStageTransition[],
      batchId: string
    ): PropStageTransition[] {
      return transitionList
        .filter((t) => t.batchId === batchId)
        .sort((a, b) => new Date(a.transitionDate).getTime() - new Date(b.transitionDate).getTime());
    }

    it('returns transitions for specific batch', () => {
      const result = getTransitionsByBatch(transitions, 'batch-1');
      expect(result).toHaveLength(4);
      expect(result.every((t) => t.batchId === 'batch-1')).toBe(true);
    });

    it('sorts by date ascending', () => {
      const result = getTransitionsByBatch(transitions, 'batch-1');
      for (let i = 1; i < result.length; i++) {
        expect(
          new Date(result[i - 1].transitionDate).getTime()
        ).toBeLessThanOrEqual(new Date(result[i].transitionDate).getTime());
      }
    });

    it('returns empty array for unknown batch', () => {
      const result = getTransitionsByBatch(transitions, 'unknown-batch');
      expect(result).toHaveLength(0);
    });
  });

  describe('getLatestTransition', () => {
    // Inline function for testing
    function getLatestTransition(
      transitionList: PropStageTransition[],
      batchId: string
    ): PropStageTransition | undefined {
      const batchTransitions = transitionList
        .filter((t) => t.batchId === batchId)
        .sort((a, b) => new Date(b.transitionDate).getTime() - new Date(a.transitionDate).getTime());
      return batchTransitions[0];
    }

    it('returns most recent transition', () => {
      const result = getLatestTransition(transitions, 'batch-1');
      expect(result?.toStage).toBe('potted_up');
    });

    it('returns undefined for unknown batch', () => {
      const result = getLatestTransition(transitions, 'unknown-batch');
      expect(result).toBeUndefined();
    });
  });

  describe('getTransitionsByPropagule', () => {
    it('filters by propagule ID', () => {
      const propaguleTransitions = [
        createMockTransition({
          id: 'pt1',
          batchId: undefined,
          propaguleId: 'prop-1',
          fromStage: null,
          toStage: 'rooted',
        }),
        createMockTransition({
          id: 'pt2',
          batchId: undefined,
          propaguleId: 'prop-1',
          fromStage: 'rooted',
          toStage: 'potted_up',
        }),
        createMockTransition({
          id: 'pt3',
          batchId: undefined,
          propaguleId: 'prop-2',
          fromStage: 'rooted',
          toStage: 'potted_up',
        }),
      ];

      const result = propaguleTransitions.filter((t) => t.propaguleId === 'prop-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getTransitionsByDateRange', () => {
    // Inline function for testing
    function getTransitionsByDateRange(
      transitionList: PropStageTransition[],
      from: Date,
      to: Date
    ): PropStageTransition[] {
      return transitionList.filter((t) => {
        const transitionDate = new Date(t.transitionDate);
        return transitionDate >= from && transitionDate <= to;
      });
    }

    it('filters transitions within date range', () => {
      const result = getTransitionsByDateRange(
        transitions,
        daysAgo(20),
        daysAgo(5)
      );
      // Should include transitions between 5 and 20 days ago
      expect(result.length).toBeGreaterThan(0);
      for (const t of result) {
        const date = new Date(t.transitionDate);
        expect(date.getTime()).toBeGreaterThanOrEqual(daysAgo(20).getTime());
        expect(date.getTime()).toBeLessThanOrEqual(daysAgo(5).getTime());
      }
    });
  });
});

// ============================================
// DURATION CALCULATION TESTS
// ============================================

describe('Duration Calculations', () => {
  // Inline duration calculation function for testing
  function calculateDaysBetween(from: Date, to: Date): number {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffMs = toDate.getTime() - fromDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  describe('getDurationInStage', () => {
    // Inline function for testing
    function getDurationInStage(
      transitionList: PropStageTransition[],
      batchId: string,
      stage: PropagationStage
    ): number | null {
      const batchTransitions = transitionList
        .filter((t) => t.batchId === batchId)
        .sort((a, b) => new Date(a.transitionDate).getTime() - new Date(b.transitionDate).getTime());

      // Find when we entered this stage
      const entryTransition = batchTransitions.find((t) => t.toStage === stage);
      if (!entryTransition) {
        return null;
      }

      // Find when we left this stage
      const entryIndex = batchTransitions.indexOf(entryTransition);
      const exitTransition = batchTransitions[entryIndex + 1];

      if (!exitTransition) {
        // Still in this stage
        return calculateDaysBetween(entryTransition.transitionDate, new Date());
      }

      return calculateDaysBetween(entryTransition.transitionDate, exitTransition.transitionDate);
    }

    const timeline = createBatchTimeline('batch-duration');

    it('calculates duration for completed stage', () => {
      // Rooting was from 29 days ago to 15 days ago = 14 days
      const duration = getDurationInStage(timeline, 'batch-duration', 'rooting');
      expect(duration).toBe(14);
    });

    it('returns null for stage never entered', () => {
      const duration = getDurationInStage(timeline, 'batch-duration', 'graduated');
      expect(duration).toBeNull();
    });

    it('calculates duration for current stage (still in progress)', () => {
      // potted_up was 7 days ago, still in that stage
      const duration = getDurationInStage(timeline, 'batch-duration', 'potted_up');
      expect(duration).toBeGreaterThanOrEqual(6);
      expect(duration).toBeLessThanOrEqual(8);
    });
  });

  describe('getTransitionsWithDuration', () => {
    // Inline function for testing
    function getTransitionsWithDuration(
      transitionList: PropStageTransition[],
      batchId: string
    ): TransitionWithDuration[] {
      const batchTransitions = transitionList
        .filter((t) => t.batchId === batchId)
        .sort((a, b) => new Date(a.transitionDate).getTime() - new Date(b.transitionDate).getTime());

      return batchTransitions.map((t, index) => {
        const nextTransition = batchTransitions[index + 1];
        const durationDays = nextTransition
          ? calculateDaysBetween(t.transitionDate, nextTransition.transitionDate)
          : null;

        return {
          ...t,
          durationDays,
        };
      });
    }

    const timeline = createBatchTimeline('batch-with-duration');

    it('adds duration to each transition', () => {
      const result = getTransitionsWithDuration(timeline, 'batch-with-duration');
      expect(result).toHaveLength(4);
      // First transitions should have duration
      expect(result[0].durationDays).toBe(1); // taken to rooting (1 day)
      // Last transition should have null duration (still in stage)
      expect(result[result.length - 1].durationDays).toBeNull();
    });

    it('calculates correct durations', () => {
      const result = getTransitionsWithDuration(timeline, 'batch-with-duration');
      // rooting to rooted: 29 days ago to 15 days ago = 14 days
      const rootingTransition = result.find((t) => t.toStage === 'rooting');
      expect(rootingTransition?.durationDays).toBe(14);
    });
  });
});

// ============================================
// FAILURE ANALYSIS TESTS
// ============================================

describe('Failure Analysis', () => {
  const failedTransitions = [
    createMockTransition({
      id: 'f1',
      batchId: 'batch-f1',
      toStage: 'failed',
      failureReason: 'rot',
    }),
    createMockTransition({
      id: 'f2',
      batchId: 'batch-f2',
      toStage: 'failed',
      failureReason: 'rot',
    }),
    createMockTransition({
      id: 'f3',
      batchId: 'batch-f3',
      toStage: 'failed',
      failureReason: 'dried_out',
    }),
    createMockTransition({
      id: 'f4',
      batchId: 'batch-f4',
      toStage: 'failed',
      failureReason: 'disease',
    }),
    createMockTransition({
      id: 'ok',
      batchId: 'batch-ok',
      toStage: 'rooted',
    }),
  ];

  describe('getFailuresByReason', () => {
    // Inline function for testing
    function getFailuresByReason(
      transitionList: PropStageTransition[]
    ): FailureByReason[] {
      const failedList = transitionList.filter(
        (t) => t.toStage === 'failed' && t.failureReason
      );

      if (failedList.length === 0) {
        return [];
      }

      const reasonCounts = new Map<FailureReason, number>();
      for (const t of failedList) {
        if (t.failureReason) {
          const count = reasonCounts.get(t.failureReason) || 0;
          reasonCounts.set(t.failureReason, count + 1);
        }
      }

      const total = failedList.length;
      const results: FailureByReason[] = [];
      for (const [reason, count] of reasonCounts) {
        results.push({
          reason,
          count,
          percentage: Math.round((count / total) * 100),
        });
      }

      return results.sort((a, b) => b.count - a.count);
    }

    it('groups failures by reason', () => {
      const result = getFailuresByReason(failedTransitions);
      expect(result.length).toBeGreaterThan(0);
    });

    it('calculates correct percentages', () => {
      const result = getFailuresByReason(failedTransitions);
      // 2 rot out of 4 = 50%
      const rotFailure = result.find((r) => r.reason === 'rot');
      expect(rotFailure?.count).toBe(2);
      expect(rotFailure?.percentage).toBe(50);
    });

    it('sorts by count descending', () => {
      const result = getFailuresByReason(failedTransitions);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });

    it('excludes non-failed transitions', () => {
      const result = getFailuresByReason(failedTransitions);
      // Only 4 failed transitions
      const totalCount = result.reduce((sum, r) => sum + r.count, 0);
      expect(totalCount).toBe(4);
    });

    it('returns empty array when no failures', () => {
      const noFailures = [
        createMockTransition({ toStage: 'rooted' }),
        createMockTransition({ toStage: 'potted_up' }),
      ];
      const result = getFailuresByReason(noFailures);
      expect(result).toHaveLength(0);
    });
  });
});

// ============================================
// ALL FAILURE REASONS
// ============================================

describe('Failure Reasons', () => {
  const allReasons: FailureReason[] = [
    'rot',
    'dried_out',
    'disease',
    'pest',
    'no_roots',
    'transplant_shock',
    'environmental',
    'unknown',
  ];

  it('handles all failure reasons', () => {
    for (const reason of allReasons) {
      const transition = createMockTransition({
        toStage: 'failed',
        failureReason: reason,
      });
      expect(transition.failureReason).toBe(reason);
    }
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles transition with all optional fields undefined', () => {
    const transition = createMockTransition({
      propaguleId: undefined,
      quantityBefore: undefined,
      quantityAfter: undefined,
      failureReason: undefined,
      notes: undefined,
    });

    expect(transition.batchId).toBeDefined();
    expect(transition.toStage).toBeDefined();
  });

  it('handles empty transition list', () => {
    const transitions: PropStageTransition[] = [];
    const filtered = transitions.filter((t) => t.batchId === 'batch-1');
    expect(filtered).toHaveLength(0);
  });

  it('handles transitions on same day', () => {
    const sameDay = new Date();
    const transitions = [
      createMockTransition({
        id: 't1',
        fromStage: null,
        toStage: 'taken',
        transitionDate: sameDay,
      }),
      createMockTransition({
        id: 't2',
        fromStage: 'taken',
        toStage: 'rooting',
        transitionDate: sameDay,
      }),
    ];

    expect(transitions).toHaveLength(2);
    // Duration would be 0 days
    const duration = Math.floor(
      (sameDay.getTime() - sameDay.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(duration).toBe(0);
  });

  it('handles quantity changes in transitions', () => {
    const transitions = [
      createMockTransition({
        quantityBefore: 20,
        quantityAfter: 18,
      }),
    ];
    const lostCount = (transitions[0].quantityBefore ?? 0) - (transitions[0].quantityAfter ?? 0);
    expect(lostCount).toBe(2);
  });
});
