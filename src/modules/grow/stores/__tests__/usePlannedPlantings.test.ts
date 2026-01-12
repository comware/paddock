/**
 * usePlannedPlantings Store Unit Tests
 *
 * Tests the planting calendar store including:
 * - Planned planting data structure and creation
 * - Date-based queries and filtering
 * - Status transitions (planned -> converted/cancelled)
 * - Overdue detection
 */

import { describe, it, expect } from 'vitest';
import { daysAgo, daysFromNow } from '@/test/mocks/db';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

type PlannedPlantingStatus = 'planned' | 'converted' | 'cancelled';

interface GrowPlannedPlanting {
  id?: string;
  siteId?: string;
  variety: string;
  plannedSowDate: Date;
  targetHarvestDate: Date;
  quantity: number;
  notes?: string;
  status: PlannedPlantingStatus;
  convertedTrayId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PlannedPlantingWithComputed extends GrowPlannedPlanting {
  daysUntilSow: number;
  daysUntilHarvest: number;
  isOverdue: boolean;
  isPastSowDate: boolean;
}

// ============================================
// TEST DATA HELPERS
// ============================================

let plantingCounter = 0;
function createMockPlanting(
  overrides: Partial<GrowPlannedPlanting> = {}
): GrowPlannedPlanting {
  plantingCounter++;
  const now = new Date();
  return {
    id: `planting-${plantingCounter}`,
    siteId: 'site-1',
    variety: 'Sunflower',
    plannedSowDate: daysFromNow(3),
    targetHarvestDate: daysFromNow(17), // ~14 days after sow
    quantity: 2,
    status: 'planned',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================
// HELPER FUNCTIONS (mirrored from store logic)
// ============================================

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function differenceInDays(date1: Date, date2: Date): number {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isWithinInterval(
  date: Date,
  interval: { start: Date; end: Date }
): boolean {
  const d = startOfDay(date);
  const start = startOfDay(interval.start);
  const end = startOfDay(interval.end);
  return d >= start && d <= end;
}

function enrichPlanting(
  planting: GrowPlannedPlanting,
  referenceDate: Date = new Date()
): PlannedPlantingWithComputed {
  const today = startOfDay(referenceDate);
  const sowDate = startOfDay(planting.plannedSowDate);
  const harvestDate = startOfDay(planting.targetHarvestDate);

  const daysUntilSow = differenceInDays(sowDate, today);
  const daysUntilHarvest = differenceInDays(harvestDate, today);
  const isPastSowDate = daysUntilSow < 0;
  const isOverdue = isPastSowDate && planting.status === 'planned';

  return {
    ...planting,
    daysUntilSow,
    daysUntilHarvest,
    isPastSowDate,
    isOverdue,
  };
}

function getPlantingsForDate(
  plantings: PlannedPlantingWithComputed[],
  date: Date
): PlannedPlantingWithComputed[] {
  return plantings.filter((p) => isSameDay(p.plannedSowDate, date));
}

function getPlantingsForDateRange(
  plantings: PlannedPlantingWithComputed[],
  startDate: Date,
  endDate: Date
): PlannedPlantingWithComputed[] {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  return plantings.filter((p) => {
    const sowDate = startOfDay(p.plannedSowDate);
    return isWithinInterval(sowDate, { start, end });
  });
}

function getUpcomingPlantings(
  plantings: PlannedPlantingWithComputed[],
  daysAhead = 7
): PlannedPlantingWithComputed[] {
  const today = startOfDay(new Date());
  const endDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return plantings
    .filter((p) => {
      if (p.status !== 'planned') return false;
      const sowDate = startOfDay(p.plannedSowDate);
      return sowDate >= today && sowDate <= endDate;
    })
    .sort((a, b) => a.plannedSowDate.getTime() - b.plannedSowDate.getTime());
}

function getOverduePlantings(
  plantings: PlannedPlantingWithComputed[]
): PlannedPlantingWithComputed[] {
  return plantings.filter((p) => p.isOverdue);
}

function getFilteredPlantings(
  plantings: PlannedPlantingWithComputed[],
  filters: { status: PlannedPlantingStatus | 'all'; variety: string | 'all'; siteId: string | 'all' }
): PlannedPlantingWithComputed[] {
  let filtered = [...plantings];

  if (filters.status !== 'all') {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  if (filters.variety !== 'all') {
    filtered = filtered.filter((p) => p.variety === filters.variety);
  }

  if (filters.siteId !== 'all') {
    filtered = filtered.filter((p) => p.siteId === filters.siteId);
  }

  return filtered.sort((a, b) => a.plannedSowDate.getTime() - b.plannedSowDate.getTime());
}

// ============================================
// PLANTING DATA STRUCTURE TESTS
// ============================================

describe('Planned Planting Data Structure', () => {
  describe('createMockPlanting', () => {
    it('creates a planting with all required fields', () => {
      const planting = createMockPlanting();

      expect(planting.variety).toBeDefined();
      expect(planting.plannedSowDate).toBeInstanceOf(Date);
      expect(planting.targetHarvestDate).toBeInstanceOf(Date);
      expect(typeof planting.quantity).toBe('number');
      expect(planting.status).toBeDefined();
    });

    it('applies custom overrides correctly', () => {
      const sowDate = daysFromNow(5);
      const harvestDate = daysFromNow(19);
      const planting = createMockPlanting({
        variety: 'Pea Shoots',
        plannedSowDate: sowDate,
        targetHarvestDate: harvestDate,
        quantity: 4,
        notes: 'For farmers market',
      });

      expect(planting.variety).toBe('Pea Shoots');
      expect(planting.plannedSowDate.getTime()).toBe(sowDate.getTime());
      expect(planting.quantity).toBe(4);
      expect(planting.notes).toBe('For farmers market');
    });

    it('defaults to planned status', () => {
      const planting = createMockPlanting();
      expect(planting.status).toBe('planned');
    });

    it('generates unique IDs', () => {
      const planting1 = createMockPlanting();
      const planting2 = createMockPlanting();
      expect(planting1.id).not.toBe(planting2.id);
    });
  });
});

// ============================================
// ENRICHMENT TESTS
// ============================================

describe('Planting Enrichment', () => {
  describe('enrichPlanting', () => {
    it('calculates days until sow for future date', () => {
      const planting = createMockPlanting({
        plannedSowDate: daysFromNow(5),
      });

      const enriched = enrichPlanting(planting);

      expect(enriched.daysUntilSow).toBe(5);
      expect(enriched.isPastSowDate).toBe(false);
      expect(enriched.isOverdue).toBe(false);
    });

    it('calculates negative days for past date', () => {
      const planting = createMockPlanting({
        plannedSowDate: daysAgo(3),
        status: 'planned',
      });

      const enriched = enrichPlanting(planting);

      expect(enriched.daysUntilSow).toBe(-3);
      expect(enriched.isPastSowDate).toBe(true);
    });

    it('marks planned planting as overdue when past sow date', () => {
      const planting = createMockPlanting({
        plannedSowDate: daysAgo(2),
        status: 'planned',
      });

      const enriched = enrichPlanting(planting);

      expect(enriched.isOverdue).toBe(true);
    });

    it('does not mark converted planting as overdue', () => {
      const planting = createMockPlanting({
        plannedSowDate: daysAgo(2),
        status: 'converted',
      });

      const enriched = enrichPlanting(planting);

      expect(enriched.isPastSowDate).toBe(true);
      expect(enriched.isOverdue).toBe(false);
    });

    it('does not mark cancelled planting as overdue', () => {
      const planting = createMockPlanting({
        plannedSowDate: daysAgo(2),
        status: 'cancelled',
      });

      const enriched = enrichPlanting(planting);

      expect(enriched.isPastSowDate).toBe(true);
      expect(enriched.isOverdue).toBe(false);
    });

    it('calculates days until harvest', () => {
      const planting = createMockPlanting({
        targetHarvestDate: daysFromNow(14),
      });

      const enriched = enrichPlanting(planting);

      expect(enriched.daysUntilHarvest).toBe(14);
    });
  });
});

// ============================================
// DATE QUERY TESTS
// ============================================

describe('Date Queries', () => {
  describe('getPlantingsForDate', () => {
    it('returns empty array for no matches', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ plannedSowDate: daysFromNow(1) })),
        enrichPlanting(createMockPlanting({ plannedSowDate: daysFromNow(2) })),
      ];

      const result = getPlantingsForDate(plantings, daysFromNow(5));

      expect(result).toHaveLength(0);
    });

    it('returns plantings for specific date', () => {
      const targetDate = daysFromNow(3);
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: daysFromNow(1) })),
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: targetDate })),
        enrichPlanting(createMockPlanting({ id: 'p3', plannedSowDate: targetDate })),
        enrichPlanting(createMockPlanting({ id: 'p4', plannedSowDate: daysFromNow(5) })),
      ];

      const result = getPlantingsForDate(plantings, targetDate);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(['p2', 'p3']);
    });
  });

  describe('getPlantingsForDateRange', () => {
    it('returns plantings within date range', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: daysFromNow(1) })),
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: daysFromNow(3) })),
        enrichPlanting(createMockPlanting({ id: 'p3', plannedSowDate: daysFromNow(5) })),
        enrichPlanting(createMockPlanting({ id: 'p4', plannedSowDate: daysFromNow(10) })),
      ];

      const result = getPlantingsForDateRange(plantings, daysFromNow(2), daysFromNow(6));

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toContain('p2');
      expect(result.map((p) => p.id)).toContain('p3');
    });

    it('includes plantings on boundary dates', () => {
      const startDate = daysFromNow(3);
      const endDate = daysFromNow(5);
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: startDate })),
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: endDate })),
      ];

      const result = getPlantingsForDateRange(plantings, startDate, endDate);

      expect(result).toHaveLength(2);
    });
  });
});

// ============================================
// UPCOMING AND OVERDUE TESTS
// ============================================

describe('Upcoming and Overdue Queries', () => {
  describe('getUpcomingPlantings', () => {
    it('returns only future planned plantings within range', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: daysFromNow(1), status: 'planned' })),
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: daysFromNow(3), status: 'planned' })),
        enrichPlanting(createMockPlanting({ id: 'p3', plannedSowDate: daysFromNow(10), status: 'planned' })), // Outside 7 days
        enrichPlanting(createMockPlanting({ id: 'p4', plannedSowDate: daysFromNow(2), status: 'converted' })), // Not planned
      ];

      const result = getUpcomingPlantings(plantings, 7);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('sorts by sow date ascending', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: daysFromNow(5), status: 'planned' })),
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: daysFromNow(2), status: 'planned' })),
        enrichPlanting(createMockPlanting({ id: 'p3', plannedSowDate: daysFromNow(1), status: 'planned' })),
      ];

      const result = getUpcomingPlantings(plantings, 7);

      expect(result.map((p) => p.id)).toEqual(['p3', 'p2', 'p1']);
    });

    it('excludes past plantings', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: daysAgo(1), status: 'planned' })),
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: daysFromNow(1), status: 'planned' })),
      ];

      const result = getUpcomingPlantings(plantings, 7);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p2');
    });
  });

  describe('getOverduePlantings', () => {
    it('returns only overdue plantings', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ id: 'p1', plannedSowDate: daysAgo(2), status: 'planned' })), // Overdue
        enrichPlanting(createMockPlanting({ id: 'p2', plannedSowDate: daysAgo(1), status: 'converted' })), // Past but converted
        enrichPlanting(createMockPlanting({ id: 'p3', plannedSowDate: daysFromNow(1), status: 'planned' })), // Future
        enrichPlanting(createMockPlanting({ id: 'p4', plannedSowDate: daysAgo(3), status: 'planned' })), // Overdue
      ];

      const result = getOverduePlantings(plantings);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toContain('p1');
      expect(result.map((p) => p.id)).toContain('p4');
    });

    it('returns empty array when no overdue plantings', () => {
      const plantings = [
        enrichPlanting(createMockPlanting({ plannedSowDate: daysFromNow(1), status: 'planned' })),
        enrichPlanting(createMockPlanting({ plannedSowDate: daysAgo(1), status: 'converted' })),
      ];

      const result = getOverduePlantings(plantings);

      expect(result).toHaveLength(0);
    });
  });
});

// ============================================
// FILTER TESTS
// ============================================

describe('Planting Filters', () => {
  describe('getFilteredPlantings', () => {
    const plantings = [
      enrichPlanting(createMockPlanting({ id: 'p1', variety: 'Sunflower', status: 'planned', siteId: 'site-1', plannedSowDate: daysFromNow(1) })),
      enrichPlanting(createMockPlanting({ id: 'p2', variety: 'Pea Shoots', status: 'planned', siteId: 'site-1', plannedSowDate: daysFromNow(2) })),
      enrichPlanting(createMockPlanting({ id: 'p3', variety: 'Sunflower', status: 'converted', siteId: 'site-2', plannedSowDate: daysFromNow(3) })),
      enrichPlanting(createMockPlanting({ id: 'p4', variety: 'Radish', status: 'cancelled', siteId: 'site-1', plannedSowDate: daysFromNow(4) })),
    ];

    it('returns all when filters are "all"', () => {
      const result = getFilteredPlantings(plantings, {
        status: 'all',
        variety: 'all',
        siteId: 'all',
      });

      expect(result).toHaveLength(4);
    });

    it('filters by status', () => {
      const result = getFilteredPlantings(plantings, {
        status: 'planned',
        variety: 'all',
        siteId: 'all',
      });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === 'planned')).toBe(true);
    });

    it('filters by variety', () => {
      const result = getFilteredPlantings(plantings, {
        status: 'all',
        variety: 'Sunflower',
        siteId: 'all',
      });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.variety === 'Sunflower')).toBe(true);
    });

    it('filters by siteId', () => {
      const result = getFilteredPlantings(plantings, {
        status: 'all',
        variety: 'all',
        siteId: 'site-1',
      });

      expect(result).toHaveLength(3);
      expect(result.every((p) => p.siteId === 'site-1')).toBe(true);
    });

    it('combines multiple filters', () => {
      const result = getFilteredPlantings(plantings, {
        status: 'planned',
        variety: 'Sunflower',
        siteId: 'site-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('sorts results by plannedSowDate', () => {
      const result = getFilteredPlantings(plantings, {
        status: 'all',
        variety: 'all',
        siteId: 'all',
      });

      expect(result.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    });
  });
});

// ============================================
// STATUS TRANSITION TESTS
// ============================================

describe('Status Transitions', () => {
  it('can convert to tray', () => {
    const planting = createMockPlanting({ status: 'planned' });
    const converted = {
      ...planting,
      status: 'converted' as const,
      convertedTrayId: 'tray-123',
    };

    expect(converted.status).toBe('converted');
    expect(converted.convertedTrayId).toBe('tray-123');
  });

  it('can cancel planting', () => {
    const planting = createMockPlanting({ status: 'planned' });
    const cancelled = { ...planting, status: 'cancelled' as const };

    expect(cancelled.status).toBe('cancelled');
  });

  it('converted planting is not overdue', () => {
    const planting = createMockPlanting({
      plannedSowDate: daysAgo(5),
      status: 'converted',
    });

    const enriched = enrichPlanting(planting);

    expect(enriched.isOverdue).toBe(false);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Planned Planting Edge Cases', () => {
  it('handles planting on today', () => {
    const planting = createMockPlanting({
      plannedSowDate: new Date(),
      status: 'planned',
    });

    const enriched = enrichPlanting(planting);

    expect(enriched.daysUntilSow).toBe(0);
    expect(enriched.isPastSowDate).toBe(false);
    expect(enriched.isOverdue).toBe(false);
  });

  it('handles quantity of 0', () => {
    const planting = createMockPlanting({ quantity: 0 });
    expect(planting.quantity).toBe(0);
  });

  it('handles large quantity', () => {
    const planting = createMockPlanting({ quantity: 100 });
    expect(planting.quantity).toBe(100);
  });

  it('handles empty notes', () => {
    const planting = createMockPlanting({ notes: '' });
    expect(planting.notes).toBe('');
  });

  it('handles undefined siteId', () => {
    const planting = createMockPlanting({ siteId: undefined });
    expect(planting.siteId).toBeUndefined();
  });

  it('handles very future dates', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);

    const planting = createMockPlanting({
      plannedSowDate: farFuture,
    });

    const enriched = enrichPlanting(planting);

    expect(enriched.daysUntilSow).toBeGreaterThan(300);
    expect(enriched.isPastSowDate).toBe(false);
  });
});
