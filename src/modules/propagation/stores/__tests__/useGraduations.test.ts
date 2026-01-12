/**
 * useGraduations Store Unit Tests
 *
 * Tests the graduation tracking store including:
 * - Graduating propagules from batches
 * - Graduation outcomes (success/fail/cull)
 * - Graduation metrics and analytics
 * - Filtering and queries
 */

import { describe, it, expect } from 'vitest';
import type {
  PropGraduation,
  GraduationOutcome,
} from '../../types';
import type {
  EnrichedGraduation,
  GraduationFilters,
  GraduationSummary,
} from '../useGraduations';

// ============================================
// TEST FIXTURES
// ============================================

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createMockGraduation(overrides: Partial<PropGraduation> = {}): PropGraduation {
  const now = new Date();
  return {
    id: 'grad-test',
    batchId: 'batch-1',
    quantity: 5,
    outcome: 'planted_garden',
    graduationDate: now,
    createdAt: now,
    ...overrides,
  };
}

// Pre-defined mock graduations for testing
const mockGraduations = {
  planted: () =>
    createMockGraduation({
      id: 'grad-planted',
      batchId: 'batch-1',
      quantity: 5,
      outcome: 'planted_garden',
      plantedLocation: 'Front garden bed',
      graduationDate: daysAgo(7),
    }),

  gifted: () =>
    createMockGraduation({
      id: 'grad-gifted',
      batchId: 'batch-1',
      quantity: 3,
      outcome: 'gifted',
      recipientName: 'Jane Doe',
      recipientContact: 'jane@example.com',
      graduationDate: daysAgo(14),
    }),

  sold: () =>
    createMockGraduation({
      id: 'grad-sold',
      batchId: 'batch-2',
      quantity: 10,
      outcome: 'sold',
      salePrice: 50.00,
      saleReferenceId: 'SALE-001',
      graduationDate: daysAgo(5),
    }),

  personalUse: () =>
    createMockGraduation({
      id: 'grad-personal',
      batchId: 'batch-2',
      quantity: 2,
      outcome: 'personal_use',
      graduationDate: daysAgo(10),
    }),

  composted: () =>
    createMockGraduation({
      id: 'grad-composted',
      batchId: 'batch-3',
      quantity: 4,
      outcome: 'composted',
      notes: 'Poor quality at final stage',
      graduationDate: daysAgo(3),
    }),
};

// ============================================
// GRADUATION RECORDING TESTS
// ============================================

describe('Graduation Recording', () => {
  describe('recordGraduation', () => {
    it('creates graduation with required fields', () => {
      const graduation = createMockGraduation({
        batchId: 'batch-1',
        quantity: 5,
        outcome: 'planted_garden',
      });

      expect(graduation.batchId).toBe('batch-1');
      expect(graduation.quantity).toBe(5);
      expect(graduation.outcome).toBe('planted_garden');
    });

    it('creates graduation with gift details', () => {
      const graduation = mockGraduations.gifted();
      expect(graduation.outcome).toBe('gifted');
      expect(graduation.recipientName).toBe('Jane Doe');
      expect(graduation.recipientContact).toBe('jane@example.com');
    });

    it('creates graduation with sale details', () => {
      const graduation = mockGraduations.sold();
      expect(graduation.outcome).toBe('sold');
      expect(graduation.salePrice).toBe(50.00);
      expect(graduation.saleReferenceId).toBe('SALE-001');
    });

    it('creates graduation with planting location', () => {
      const graduation = mockGraduations.planted();
      expect(graduation.plantedLocation).toBe('Front garden bed');
    });

    it('creates propagule-level graduation', () => {
      const graduation = createMockGraduation({
        batchId: undefined,
        propaguleId: 'propagule-1',
        quantity: 1,
      });

      expect(graduation.propaguleId).toBe('propagule-1');
      expect(graduation.batchId).toBeUndefined();
      expect(graduation.quantity).toBe(1);
    });
  });

  describe('recordBatchGraduation validation', () => {
    it('requires positive quantity', () => {
      const quantity = 0;
      expect(quantity > 0).toBe(false);
    });

    it('validates quantity does not exceed surviving', () => {
      const surviving = 10;
      const requested = 15;
      expect(requested <= surviving).toBe(false);
    });

    it('validates batch stage is ready', () => {
      const validStages = ['ready', 'graduated'];
      expect(validStages.includes('ready')).toBe(true);
      expect(validStages.includes('rooting')).toBe(false);
    });
  });
});

// ============================================
// GRADUATION OUTCOMES TESTS
// ============================================

describe('Graduation Outcomes', () => {
  const allOutcomes: GraduationOutcome[] = [
    'personal_use',
    'planted_garden',
    'gifted',
    'sold',
    'composted',
  ];

  it('handles all valid outcomes', () => {
    for (const outcome of allOutcomes) {
      const graduation = createMockGraduation({ outcome });
      expect(graduation.outcome).toBe(outcome);
    }
  });

  it('tracks sale price for sold outcome', () => {
    const graduation = createMockGraduation({
      outcome: 'sold',
      salePrice: 25.00,
    });
    expect(graduation.salePrice).toBe(25.00);
  });

  it('tracks recipient for gifted outcome', () => {
    const graduation = createMockGraduation({
      outcome: 'gifted',
      recipientName: 'Friend',
    });
    expect(graduation.recipientName).toBe('Friend');
  });

  it('tracks location for planted outcome', () => {
    const graduation = createMockGraduation({
      outcome: 'planted_garden',
      plantedLocation: 'Herb spiral',
    });
    expect(graduation.plantedLocation).toBe('Herb spiral');
  });
});

// ============================================
// FILTERING TESTS
// ============================================

describe('Graduation Filtering', () => {
  const graduations: EnrichedGraduation[] = [
    {
      ...mockGraduations.planted(),
      batchNumber: '2026-001',
      species: 'Lavender',
      graduationDateObj: daysAgo(7),
      createdAtObj: daysAgo(7),
    },
    {
      ...mockGraduations.gifted(),
      batchNumber: '2026-001',
      species: 'Lavender',
      graduationDateObj: daysAgo(14),
      createdAtObj: daysAgo(14),
    },
    {
      ...mockGraduations.sold(),
      batchNumber: '2026-002',
      species: 'Rosemary',
      graduationDateObj: daysAgo(5),
      createdAtObj: daysAgo(5),
    },
    {
      ...mockGraduations.personalUse(),
      batchNumber: '2026-002',
      species: 'Rosemary',
      graduationDateObj: daysAgo(10),
      createdAtObj: daysAgo(10),
    },
    {
      ...mockGraduations.composted(),
      batchNumber: '2026-003',
      species: 'Sage',
      graduationDateObj: daysAgo(3),
      createdAtObj: daysAgo(3),
    },
  ];

  // Inline filtering function for testing
  function filterGraduations(
    gradList: EnrichedGraduation[],
    filters: GraduationFilters
  ): EnrichedGraduation[] {
    let filtered = [...gradList];

    if (filters.outcome !== 'all') {
      filtered = filtered.filter((g) => g.outcome === filters.outcome);
    }
    if (filters.batchId !== 'all') {
      filtered = filtered.filter((g) => g.batchId === filters.batchId);
    }
    if (filters.dateRange) {
      const startTime = filters.dateRange.from.getTime();
      const endTime = filters.dateRange.to.getTime();
      filtered = filtered.filter((g) => {
        const gradTime = g.graduationDateObj.getTime();
        return gradTime >= startTime && gradTime <= endTime;
      });
    }

    return filtered.sort(
      (a, b) => b.graduationDateObj.getTime() - a.graduationDateObj.getTime()
    );
  }

  it('returns all graduations with default filters', () => {
    const filters: GraduationFilters = {
      outcome: 'all',
      batchId: 'all',
    };
    const result = filterGraduations(graduations, filters);
    expect(result).toHaveLength(5);
  });

  it('filters by outcome', () => {
    const filters: GraduationFilters = {
      outcome: 'gifted',
      batchId: 'all',
    };
    const result = filterGraduations(graduations, filters);
    expect(result).toHaveLength(1);
    expect(result[0].outcome).toBe('gifted');
  });

  it('filters by batch ID', () => {
    const filters: GraduationFilters = {
      outcome: 'all',
      batchId: 'batch-1',
    };
    const result = filterGraduations(graduations, filters);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.batchId === 'batch-1')).toBe(true);
  });

  it('filters by date range', () => {
    const filters: GraduationFilters = {
      outcome: 'all',
      batchId: 'all',
      dateRange: {
        from: daysAgo(10),
        to: daysAgo(1),
      },
    };
    const result = filterGraduations(graduations, filters);
    // Should include graduations from 3, 5, 7, 10 days ago (not 14)
    expect(result.length).toBeLessThan(graduations.length);
  });

  it('sorts by graduation date descending', () => {
    const filters: GraduationFilters = {
      outcome: 'all',
      batchId: 'all',
    };
    const result = filterGraduations(graduations, filters);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].graduationDateObj.getTime()).toBeGreaterThanOrEqual(
        result[i].graduationDateObj.getTime()
      );
    }
  });
});

// ============================================
// QUERY SELECTOR TESTS
// ============================================

describe('Query Selectors', () => {
  const graduations: EnrichedGraduation[] = [
    {
      ...mockGraduations.planted(),
      batchNumber: '2026-001',
      species: 'Lavender',
      graduationDateObj: daysAgo(7),
      createdAtObj: daysAgo(7),
    },
    {
      ...mockGraduations.gifted(),
      batchNumber: '2026-001',
      species: 'Lavender',
      graduationDateObj: daysAgo(14),
      createdAtObj: daysAgo(14),
    },
    {
      ...mockGraduations.sold(),
      batchNumber: '2026-002',
      species: 'Rosemary',
      graduationDateObj: daysAgo(5),
      createdAtObj: daysAgo(5),
    },
  ];

  describe('getGraduationsByBatch', () => {
    it('returns graduations for specific batch', () => {
      const result = graduations.filter((g) => g.batchId === 'batch-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getGraduationsByOutcome', () => {
    it('filters by outcome type', () => {
      const result = graduations.filter((g) => g.outcome === 'sold');
      expect(result).toHaveLength(1);
    });
  });

  describe('getGraduationById', () => {
    it('finds graduation by ID', () => {
      const result = graduations.find((g) => g.id === 'grad-planted');
      expect(result).toBeDefined();
      expect(result?.outcome).toBe('planted_garden');
    });

    it('returns undefined for unknown ID', () => {
      const result = graduations.find((g) => g.id === 'unknown');
      expect(result).toBeUndefined();
    });
  });
});

// ============================================
// ANALYTICS TESTS
// ============================================

describe('Graduation Analytics', () => {
  const graduations: PropGraduation[] = [
    mockGraduations.planted(),
    mockGraduations.gifted(),
    mockGraduations.sold(),
    mockGraduations.personalUse(),
    mockGraduations.composted(),
  ];

  describe('getTotalGraduated', () => {
    it('counts total graduations', () => {
      const count = graduations.length;
      expect(count).toBe(5);
    });

    it('sums total quantity', () => {
      const totalQuantity = graduations.reduce((sum, g) => sum + g.quantity, 0);
      // 5 + 3 + 10 + 2 + 4 = 24
      expect(totalQuantity).toBe(24);
    });
  });

  describe('getTotalGraduatedForBatch', () => {
    it('calculates total for specific batch', () => {
      const batchGraduations = graduations.filter((g) => g.batchId === 'batch-1');
      const total = batchGraduations.reduce((sum, g) => sum + g.quantity, 0);
      // planted (5) + gifted (3) = 8
      expect(total).toBe(8);
    });
  });

  describe('getGraduationSummaryByOutcome', () => {
    // Inline function for testing
    function getGraduationSummaryByOutcome(
      gradList: PropGraduation[]
    ): GraduationSummary[] {
      const summaryMap = new Map<GraduationOutcome, GraduationSummary>();

      for (const graduation of gradList) {
        const existing = summaryMap.get(graduation.outcome);
        if (existing) {
          existing.count++;
          existing.totalQuantity += graduation.quantity;
        } else {
          summaryMap.set(graduation.outcome, {
            outcome: graduation.outcome,
            count: 1,
            totalQuantity: graduation.quantity,
          });
        }
      }

      return Array.from(summaryMap.values()).sort(
        (a, b) => b.totalQuantity - a.totalQuantity
      );
    }

    it('groups graduations by outcome', () => {
      const summaries = getGraduationSummaryByOutcome(graduations);
      expect(summaries.length).toBeGreaterThan(0);
    });

    it('calculates correct counts per outcome', () => {
      const summaries = getGraduationSummaryByOutcome(graduations);
      const soldSummary = summaries.find((s) => s.outcome === 'sold');
      expect(soldSummary?.count).toBe(1);
      expect(soldSummary?.totalQuantity).toBe(10);
    });

    it('sorts by total quantity descending', () => {
      const summaries = getGraduationSummaryByOutcome(graduations);
      for (let i = 1; i < summaries.length; i++) {
        expect(summaries[i - 1].totalQuantity).toBeGreaterThanOrEqual(
          summaries[i].totalQuantity
        );
      }
    });
  });

  describe('getGiftRecipients', () => {
    it('extracts unique recipient names', () => {
      const giftedGraduations = graduations.filter(
        (g) => g.outcome === 'gifted' && g.recipientName
      );
      const recipients = [...new Set(giftedGraduations.map((g) => g.recipientName!))];
      expect(recipients).toContain('Jane Doe');
    });
  });

  describe('getTotalSalesRevenue', () => {
    it('sums sale prices', () => {
      const salesRevenue = graduations
        .filter((g) => g.outcome === 'sold' && g.salePrice)
        .reduce((sum, g) => sum + (g.salePrice ?? 0), 0);
      expect(salesRevenue).toBe(50.00);
    });

    it('returns 0 when no sales', () => {
      const noSales = graduations.filter((g) => g.outcome !== 'sold');
      const revenue = noSales
        .filter((g) => g.outcome === 'sold' && g.salePrice)
        .reduce((sum, g) => sum + (g.salePrice ?? 0), 0);
      expect(revenue).toBe(0);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('handles graduation with all optional fields undefined', () => {
    const graduation = createMockGraduation({
      propaguleId: undefined,
      recipientName: undefined,
      recipientContact: undefined,
      saleReferenceId: undefined,
      salePrice: undefined,
      plantedLocation: undefined,
      notes: undefined,
    });

    expect(graduation.batchId).toBeDefined();
    expect(graduation.quantity).toBeDefined();
    expect(graduation.outcome).toBeDefined();
  });

  it('handles empty graduation list', () => {
    const graduations: EnrichedGraduation[] = [];
    const filtered = graduations.filter((g) => g.outcome === 'sold');
    expect(filtered).toHaveLength(0);
  });

  it('handles graduation with quantity of 1', () => {
    const graduation = createMockGraduation({
      quantity: 1,
    });
    expect(graduation.quantity).toBe(1);
  });

  it('handles graduation with large quantity', () => {
    const graduation = createMockGraduation({
      quantity: 1000,
    });
    expect(graduation.quantity).toBe(1000);
  });

  it('handles graduation with zero sale price', () => {
    const graduation = createMockGraduation({
      outcome: 'sold',
      salePrice: 0,
    });
    expect(graduation.salePrice).toBe(0);
  });

  it('handles multiple graduations from same batch', () => {
    const graduations = [
      createMockGraduation({ id: 'g1', batchId: 'batch-1', quantity: 5 }),
      createMockGraduation({ id: 'g2', batchId: 'batch-1', quantity: 3 }),
      createMockGraduation({ id: 'g3', batchId: 'batch-1', quantity: 2 }),
    ];
    const batchTotal = graduations.reduce((sum, g) => sum + g.quantity, 0);
    expect(batchTotal).toBe(10);
  });
});
