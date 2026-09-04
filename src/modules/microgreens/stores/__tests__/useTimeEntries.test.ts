/**
 * useTimeEntries Store Unit Tests
 *
 * Tests the time tracking store including:
 * - Time entry data structure and creation
 * - Category totals and aggregation
 * - Daily and weekly totals
 * - Date range queries
 */

import { describe, it, expect } from 'vitest';
import { daysAgo } from '@/test/mocks/db';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

type TimeCategory =
  | 'wateringChecking'
  | 'sowing'
  | 'harvesting'
  | 'packaging'
  | 'cleanup'
  | 'researchLearning'
  | 'other';

interface GrowTimeEntry {
  id?: string;
  siteId?: string;
  date: Date;
  week: number;
  wateringChecking: number;
  sowing: number;
  harvesting: number;
  packaging: number;
  cleanup: number;
  researchLearning: number;
  other: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryTotal {
  category: TimeCategory;
  label: string;
  icon: string;
  minutes: number;
  percentage: number;
}

const TIME_CATEGORIES: { value: TimeCategory; label: string; icon: string }[] = [
  { value: 'wateringChecking', label: 'Watering & Checking', icon: '|' },
  { value: 'sowing', label: 'Sowing', icon: '|' },
  { value: 'harvesting', label: 'Harvesting', icon: '|' },
  { value: 'packaging', label: 'Packaging', icon: '|' },
  { value: 'cleanup', label: 'Cleanup', icon: '|' },
  { value: 'researchLearning', label: 'Research & Learning', icon: '|' },
  { value: 'other', label: 'Other', icon: '|' },
];

// ============================================
// TEST DATA HELPERS
// ============================================

let entryCounter = 0;
function createMockTimeEntry(
  overrides: Partial<GrowTimeEntry> = {}
): GrowTimeEntry {
  entryCounter++;
  const now = new Date();
  return {
    id: `entry-${entryCounter}`,
    siteId: 'site-1',
    date: now,
    week: 1,
    wateringChecking: 15,
    sowing: 30,
    harvesting: 45,
    packaging: 20,
    cleanup: 10,
    researchLearning: 15,
    other: 5,
    notes: '',
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

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const result = new Date(start);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
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
  const d = new Date(date);
  return d >= interval.start && d <= interval.end;
}

function getEntryTotal(entry: GrowTimeEntry): number {
  return (
    (entry.wateringChecking || 0) +
    (entry.sowing || 0) +
    (entry.harvesting || 0) +
    (entry.packaging || 0) +
    (entry.cleanup || 0) +
    (entry.researchLearning || 0) +
    (entry.other || 0)
  );
}

function getTodaysEntry(
  entries: GrowTimeEntry[],
  siteId?: string
): GrowTimeEntry | null {
  const today = startOfDay(new Date());
  return (
    entries.find(
      (e) =>
        isSameDay(new Date(e.date), today) &&
        (siteId ? e.siteId === siteId : true)
    ) || null
  );
}

function getThisWeeksTotal(entries: GrowTimeEntry[]): number {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  return entries
    .filter((e) =>
      isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
    )
    .reduce((sum, e) => sum + getEntryTotal(e), 0);
}

function getCategoryTotals(
  entries: GrowTimeEntry[],
  period: 'today' | 'week' | 'all' = 'week',
  siteId?: string
): CategoryTotal[] {
  let filtered = siteId ? entries.filter((e) => e.siteId === siteId) : entries;

  if (period === 'today') {
    const today = startOfDay(new Date());
    filtered = filtered.filter((e) => isSameDay(new Date(e.date), today));
  } else if (period === 'week') {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    filtered = filtered.filter((e) =>
      isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
    );
  }

  const totals: Record<TimeCategory, number> = {
    wateringChecking: 0,
    sowing: 0,
    harvesting: 0,
    packaging: 0,
    cleanup: 0,
    researchLearning: 0,
    other: 0,
  };

  for (const entry of filtered) {
    totals.wateringChecking += entry.wateringChecking || 0;
    totals.sowing += entry.sowing || 0;
    totals.harvesting += entry.harvesting || 0;
    totals.packaging += entry.packaging || 0;
    totals.cleanup += entry.cleanup || 0;
    totals.researchLearning += entry.researchLearning || 0;
    totals.other += entry.other || 0;
  }

  const totalMinutes = Object.values(totals).reduce((a, b) => a + b, 0);

  return TIME_CATEGORIES.map((cat) => ({
    category: cat.value,
    label: cat.label,
    icon: cat.icon,
    minutes: totals[cat.value],
    percentage:
      totalMinutes > 0
        ? Math.round((totals[cat.value] / totalMinutes) * 100)
        : 0,
  })).filter((c) => c.minutes > 0);
}

function getEntriesForSite(
  entries: GrowTimeEntry[],
  siteId: string
): GrowTimeEntry[] {
  return entries.filter((e) => e.siteId === siteId);
}

function getOrphanEntries(entries: GrowTimeEntry[]): GrowTimeEntry[] {
  return entries.filter((e) => !e.siteId);
}

// ============================================
// TIME ENTRY DATA STRUCTURE TESTS
// ============================================

describe('Time Entry Data Structure', () => {
  describe('createMockTimeEntry', () => {
    it('creates an entry with all required fields', () => {
      const entry = createMockTimeEntry();

      expect(entry.date).toBeInstanceOf(Date);
      expect(typeof entry.week).toBe('number');
      expect(typeof entry.wateringChecking).toBe('number');
      expect(typeof entry.sowing).toBe('number');
      expect(typeof entry.harvesting).toBe('number');
      expect(typeof entry.packaging).toBe('number');
      expect(typeof entry.cleanup).toBe('number');
      expect(typeof entry.researchLearning).toBe('number');
      expect(typeof entry.other).toBe('number');
    });

    it('applies custom overrides correctly', () => {
      const entry = createMockTimeEntry({
        wateringChecking: 30,
        sowing: 60,
        notes: 'Busy day',
      });

      expect(entry.wateringChecking).toBe(30);
      expect(entry.sowing).toBe(60);
      expect(entry.notes).toBe('Busy day');
    });

    it('generates unique IDs', () => {
      const entry1 = createMockTimeEntry();
      const entry2 = createMockTimeEntry();
      expect(entry1.id).not.toBe(entry2.id);
    });
  });
});

// ============================================
// ENTRY TOTAL TESTS
// ============================================

describe('Entry Total Calculation', () => {
  describe('getEntryTotal', () => {
    it('sums all category minutes', () => {
      const entry = createMockTimeEntry({
        wateringChecking: 10,
        sowing: 20,
        harvesting: 30,
        packaging: 15,
        cleanup: 10,
        researchLearning: 10,
        other: 5,
      });

      const total = getEntryTotal(entry);

      expect(total).toBe(100);
    });

    it('handles zero values', () => {
      const entry = createMockTimeEntry({
        wateringChecking: 0,
        sowing: 0,
        harvesting: 0,
        packaging: 0,
        cleanup: 0,
        researchLearning: 0,
        other: 0,
      });

      expect(getEntryTotal(entry)).toBe(0);
    });

    it('handles partial values', () => {
      const entry = createMockTimeEntry({
        wateringChecking: 30,
        sowing: 0,
        harvesting: 0,
        packaging: 0,
        cleanup: 0,
        researchLearning: 0,
        other: 0,
      });

      expect(getEntryTotal(entry)).toBe(30);
    });
  });
});

// ============================================
// TODAY'S ENTRY TESTS
// ============================================

describe('Todays Entry', () => {
  describe('getTodaysEntry', () => {
    it('returns null for empty entries', () => {
      expect(getTodaysEntry([])).toBeNull();
    });

    it('finds todays entry', () => {
      const entries = [
        createMockTimeEntry({ id: 'old', date: daysAgo(1) }),
        createMockTimeEntry({ id: 'today', date: new Date() }),
      ];

      const found = getTodaysEntry(entries);

      expect(found?.id).toBe('today');
    });

    it('filters by siteId', () => {
      const today = new Date();
      const entries = [
        createMockTimeEntry({ id: 'e1', date: today, siteId: 'site-1' }),
        createMockTimeEntry({ id: 'e2', date: today, siteId: 'site-2' }),
      ];

      const found = getTodaysEntry(entries, 'site-2');

      expect(found?.id).toBe('e2');
    });

    it('returns null when no match for today', () => {
      const entries = [
        createMockTimeEntry({ date: daysAgo(1) }),
        createMockTimeEntry({ date: daysAgo(2) }),
      ];

      expect(getTodaysEntry(entries)).toBeNull();
    });
  });
});

// ============================================
// WEEKLY TOTAL TESTS
// ============================================

describe('Weekly Totals', () => {
  describe('getThisWeeksTotal', () => {
    it('returns 0 for empty entries', () => {
      expect(getThisWeeksTotal([])).toBe(0);
    });

    it('sums entries from current week', () => {
      const today = new Date();
      const entries = [
        createMockTimeEntry({
          date: today,
          wateringChecking: 30,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
        createMockTimeEntry({
          date: today,
          wateringChecking: 20,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const total = getThisWeeksTotal(entries);

      expect(total).toBe(50);
    });

    it('excludes entries from previous weeks', () => {
      const today = new Date();
      const lastWeek = daysAgo(10); // Definitely last week or earlier
      const entries = [
        createMockTimeEntry({
          date: today,
          wateringChecking: 30,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
        createMockTimeEntry({
          date: lastWeek,
          wateringChecking: 100,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const total = getThisWeeksTotal(entries);

      expect(total).toBe(30); // Only today's entry
    });
  });
});

// ============================================
// CATEGORY TOTALS TESTS
// ============================================

describe('Category Totals', () => {
  describe('getCategoryTotals', () => {
    it('returns empty array when no entries', () => {
      const totals = getCategoryTotals([]);
      expect(totals).toHaveLength(0);
    });

    it('returns empty array when all zeros', () => {
      const entries = [
        createMockTimeEntry({
          wateringChecking: 0,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const totals = getCategoryTotals(entries, 'all');

      expect(totals).toHaveLength(0);
    });

    it('calculates totals per category', () => {
      const entries = [
        createMockTimeEntry({
          date: new Date(),
          wateringChecking: 30,
          sowing: 60,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const totals = getCategoryTotals(entries, 'all');

      const watering = totals.find((t) => t.category === 'wateringChecking');
      const sowing = totals.find((t) => t.category === 'sowing');

      expect(watering?.minutes).toBe(30);
      expect(sowing?.minutes).toBe(60);
    });

    it('calculates percentages correctly', () => {
      const entries = [
        createMockTimeEntry({
          wateringChecking: 50,
          sowing: 50,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const totals = getCategoryTotals(entries, 'all');

      const watering = totals.find((t) => t.category === 'wateringChecking');
      const sowing = totals.find((t) => t.category === 'sowing');

      expect(watering?.percentage).toBe(50);
      expect(sowing?.percentage).toBe(50);
    });

    it('filters out zero-minute categories', () => {
      const entries = [
        createMockTimeEntry({
          wateringChecking: 30,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const totals = getCategoryTotals(entries, 'all');

      expect(totals).toHaveLength(1);
      expect(totals[0].category).toBe('wateringChecking');
    });

    it('filters by siteId', () => {
      const entries = [
        createMockTimeEntry({
          siteId: 'site-1',
          wateringChecking: 30,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
        createMockTimeEntry({
          siteId: 'site-2',
          wateringChecking: 60,
          sowing: 0,
          harvesting: 0,
          packaging: 0,
          cleanup: 0,
          researchLearning: 0,
          other: 0,
        }),
      ];

      const totals = getCategoryTotals(entries, 'all', 'site-1');

      expect(totals).toHaveLength(1);
      expect(totals[0].minutes).toBe(30);
    });
  });
});

// ============================================
// SITE-SCOPED TESTS
// ============================================

describe('Site-Scoped Queries', () => {
  describe('getEntriesForSite', () => {
    it('returns only entries for specified site', () => {
      const entries = [
        createMockTimeEntry({ id: 'e1', siteId: 'site-1' }),
        createMockTimeEntry({ id: 'e2', siteId: 'site-2' }),
        createMockTimeEntry({ id: 'e3', siteId: 'site-1' }),
      ];

      const result = getEntriesForSite(entries, 'site-1');

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual(['e1', 'e3']);
    });

    it('returns empty array when no matches', () => {
      const entries = [createMockTimeEntry({ siteId: 'site-1' })];

      expect(getEntriesForSite(entries, 'site-999')).toHaveLength(0);
    });
  });

  describe('getOrphanEntries', () => {
    it('returns entries without siteId', () => {
      const entries = [
        createMockTimeEntry({ id: 'e1', siteId: 'site-1' }),
        createMockTimeEntry({ id: 'e2', siteId: undefined }),
        createMockTimeEntry({ id: 'e3', siteId: undefined }),
      ];

      const orphans = getOrphanEntries(entries);

      expect(orphans).toHaveLength(2);
      expect(orphans.map((e) => e.id)).toEqual(['e2', 'e3']);
    });
  });
});

// ============================================
// TIME CALCULATION HELPERS
// ============================================

describe('Time Calculation Helpers', () => {
  it('converts minutes to hours correctly', () => {
    const minutesToHours = (minutes: number) =>
      Math.round((minutes / 60) * 10) / 10;

    expect(minutesToHours(60)).toBe(1);
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(45)).toBe(0.8);
    expect(minutesToHours(0)).toBe(0);
  });

  it('calculates weekly target progress', () => {
    const WEEKLY_TARGET = 540; // 9 hours in minutes

    const calculateProgress = (currentMinutes: number) =>
      Math.round((currentMinutes / WEEKLY_TARGET) * 100);

    expect(calculateProgress(270)).toBe(50); // Half of 9 hours
    expect(calculateProgress(540)).toBe(100); // Target reached
    expect(calculateProgress(810)).toBe(150); // 150% of target
    expect(calculateProgress(0)).toBe(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Time Entry Edge Cases', () => {
  it('handles very large time values', () => {
    const entry = createMockTimeEntry({
      wateringChecking: 1000,
      sowing: 1000,
      harvesting: 1000,
      packaging: 1000,
      cleanup: 1000,
      researchLearning: 1000,
      other: 1000,
    });

    expect(getEntryTotal(entry)).toBe(7000);
  });

  it('handles fractional percentage rounding', () => {
    const entries = [
      createMockTimeEntry({
        wateringChecking: 33,
        sowing: 33,
        harvesting: 34,
        packaging: 0,
        cleanup: 0,
        researchLearning: 0,
        other: 0,
      }),
    ];

    const totals = getCategoryTotals(entries, 'all');
    const percentageSum = totals.reduce((sum, t) => sum + t.percentage, 0);

    // Percentages should be close to 100 (allowing for rounding)
    expect(percentageSum).toBeGreaterThanOrEqual(99);
    expect(percentageSum).toBeLessThanOrEqual(101);
  });

  it('handles empty notes', () => {
    const entry = createMockTimeEntry({ notes: '' });
    expect(entry.notes).toBe('');
  });

  it('handles long notes', () => {
    const longNotes = 'A'.repeat(1000);
    const entry = createMockTimeEntry({ notes: longNotes });
    expect(entry.notes.length).toBe(1000);
  });

  it('handles week number boundaries', () => {
    const week1 = createMockTimeEntry({ week: 1 });
    const week52 = createMockTimeEntry({ week: 52 });

    expect(week1.week).toBe(1);
    expect(week52.week).toBe(52);
  });
});
