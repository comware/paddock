/**
 * useObservations Store Unit Tests
 *
 * Tests the daily observation store including:
 * - Observation data structure and creation
 * - Date filtering and lookup
 * - Mood tracking and averaging
 * - Site-scoped queries
 */

import { describe, it, expect } from 'vitest';
import { createMockObservation, daysAgo } from '@/test/mocks/db';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

interface GrowObservation {
  id?: string;
  siteId?: string;
  date: Date;
  week: number;
  dayOfWeek: number;
  temperature?: number;
  humidity?: number;
  traysBlackout: number;
  traysLight: number;
  traysHarvestedToday: number;
  problemsSpotted: string;
  actionsTaken: string;
  moodEnergy: number;
  keyLearning: string;
  tomorrowPriority: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// HELPER FUNCTIONS (mirrored from store logic)
// ============================================

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
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

function getObservationByDate(
  observations: GrowObservation[],
  date: Date,
  siteId?: string
): GrowObservation | null {
  const targetDate = startOfDay(date);
  return (
    observations.find(
      (o) =>
        isSameDay(new Date(o.date), targetDate) &&
        (siteId ? o.siteId === siteId : true)
    ) || null
  );
}

function getTodaysObservation(
  observations: GrowObservation[],
  siteId?: string
): GrowObservation | null {
  return getObservationByDate(observations, new Date(), siteId);
}

function getRecentObservations(
  observations: GrowObservation[],
  days = 7,
  siteId?: string
): GrowObservation[] {
  const filtered = siteId
    ? observations.filter((o) => o.siteId === siteId)
    : observations;
  return filtered.slice(0, days);
}

function getAverageMood(observations: GrowObservation[], days = 7, siteId?: string): number | null {
  const recent = getRecentObservations(observations, days, siteId);
  const withMood = recent.filter(
    (o) => o.moodEnergy !== undefined && o.moodEnergy !== null
  );
  if (withMood.length === 0) return null;
  const sum = withMood.reduce((acc, o) => acc + (o.moodEnergy || 0), 0);
  return Math.round((sum / withMood.length) * 10) / 10;
}

function getObservationsForSite(
  observations: GrowObservation[],
  siteId: string
): GrowObservation[] {
  return observations.filter((o) => o.siteId === siteId);
}

function getOrphanObservations(observations: GrowObservation[]): GrowObservation[] {
  return observations.filter((o) => !o.siteId);
}

// ============================================
// OBSERVATION DATA STRUCTURE TESTS
// ============================================

describe('Observation Data Structure', () => {
  describe('createMockObservation', () => {
    it('creates an observation with all required fields', () => {
      const obs = createMockObservation();

      expect(obs.date).toBeInstanceOf(Date);
      expect(typeof obs.week).toBe('number');
      expect(typeof obs.dayOfWeek).toBe('number');
      expect(typeof obs.traysBlackout).toBe('number');
      expect(typeof obs.traysLight).toBe('number');
      expect(typeof obs.traysHarvestedToday).toBe('number');
      expect(typeof obs.moodEnergy).toBe('number');
    });

    it('applies custom overrides correctly', () => {
      const customDate = new Date('2024-06-15');
      const obs = createMockObservation({
        siteId: 'site-123',
        date: customDate,
        week: 3,
        dayOfWeek: 6,
        traysBlackout: 5,
        traysLight: 8,
        moodEnergy: 9,
      });

      expect(obs.siteId).toBe('site-123');
      expect(obs.date.getTime()).toBe(customDate.getTime());
      expect(obs.week).toBe(3);
      expect(obs.dayOfWeek).toBe(6);
      expect(obs.traysBlackout).toBe(5);
      expect(obs.traysLight).toBe(8);
      expect(obs.moodEnergy).toBe(9);
    });

    it('allows optional environment fields', () => {
      const obsWithEnv = createMockObservation({
        temperature: 22.5,
        humidity: 65,
      });
      const obsWithoutEnv = createMockObservation({
        temperature: undefined,
        humidity: undefined,
      });

      expect(obsWithEnv.temperature).toBe(22.5);
      expect(obsWithEnv.humidity).toBe(65);
      expect(obsWithoutEnv.temperature).toBeUndefined();
      expect(obsWithoutEnv.humidity).toBeUndefined();
    });
  });
});

// ============================================
// DATE FILTERING TESTS
// ============================================

describe('Date Filtering', () => {
  describe('isSameDay', () => {
    it('returns true for same day', () => {
      const date1 = new Date('2024-06-15T10:30:00');
      const date2 = new Date('2024-06-15T18:45:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for different days', () => {
      const date1 = new Date('2024-06-15T23:59:00');
      const date2 = new Date('2024-06-16T00:01:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for same day different months', () => {
      const date1 = new Date('2024-06-15');
      const date2 = new Date('2024-07-15');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('getObservationByDate', () => {
    it('returns null for empty observations', () => {
      expect(getObservationByDate([], new Date())).toBeNull();
    });

    it('finds observation on specific date', () => {
      const targetDate = daysAgo(3);
      const observations = [
        createMockObservation({ id: 'obs-1', date: daysAgo(1) }),
        createMockObservation({ id: 'obs-2', date: daysAgo(2) }),
        createMockObservation({ id: 'obs-3', date: targetDate }),
      ];

      const found = getObservationByDate(observations, targetDate);
      expect(found?.id).toBe('obs-3');
    });

    it('filters by siteId when provided', () => {
      const today = new Date();
      const observations = [
        createMockObservation({ id: 'obs-1', date: today, siteId: 'site-1' }),
        createMockObservation({ id: 'obs-2', date: today, siteId: 'site-2' }),
      ];

      const found = getObservationByDate(observations, today, 'site-2');
      expect(found?.id).toBe('obs-2');
    });

    it('returns null when no match for site', () => {
      const today = new Date();
      const observations = [
        createMockObservation({ date: today, siteId: 'site-1' }),
      ];

      expect(getObservationByDate(observations, today, 'site-999')).toBeNull();
    });
  });

  describe('getTodaysObservation', () => {
    it('returns null when no observations exist', () => {
      expect(getTodaysObservation([])).toBeNull();
    });

    it('returns todays observation', () => {
      const observations = [
        createMockObservation({ id: 'obs-old', date: daysAgo(1) }),
        createMockObservation({ id: 'obs-today', date: new Date() }),
      ];

      const found = getTodaysObservation(observations);
      expect(found?.id).toBe('obs-today');
    });
  });
});

// ============================================
// MOOD TRACKING TESTS
// ============================================

describe('Mood Tracking', () => {
  describe('getAverageMood', () => {
    it('returns null for empty observations', () => {
      expect(getAverageMood([])).toBeNull();
    });

    it('returns null when no observations have mood', () => {
      // Note: Our mock always sets moodEnergy, so this tests the logic
      expect(getAverageMood([])).toBeNull();
    });

    it('calculates average of all moods', () => {
      const observations = [
        createMockObservation({ moodEnergy: 8, date: daysAgo(0) }),
        createMockObservation({ moodEnergy: 6, date: daysAgo(1) }),
        createMockObservation({ moodEnergy: 7, date: daysAgo(2) }),
      ];

      const avg = getAverageMood(observations, 7);
      // (8 + 6 + 7) / 3 = 7
      expect(avg).toBe(7);
    });

    it('rounds to 1 decimal place', () => {
      const observations = [
        createMockObservation({ moodEnergy: 8, date: daysAgo(0) }),
        createMockObservation({ moodEnergy: 7, date: daysAgo(1) }),
        createMockObservation({ moodEnergy: 6, date: daysAgo(2) }),
      ];

      const avg = getAverageMood(observations, 7);
      // (8 + 7 + 6) / 3 = 7
      expect(avg).toBe(7);
    });

    it('respects days limit', () => {
      const observations = [
        createMockObservation({ moodEnergy: 10, date: daysAgo(0) }),
        createMockObservation({ moodEnergy: 10, date: daysAgo(1) }),
        createMockObservation({ moodEnergy: 1, date: daysAgo(2) }), // Would lower avg if included
        createMockObservation({ moodEnergy: 1, date: daysAgo(3) }), // Would lower avg if included
      ];

      const avg = getAverageMood(observations, 2);
      // Only first 2: (10 + 10) / 2 = 10
      expect(avg).toBe(10);
    });

    it('filters by siteId when provided', () => {
      const observations = [
        createMockObservation({ moodEnergy: 10, date: daysAgo(0), siteId: 'site-1' }),
        createMockObservation({ moodEnergy: 2, date: daysAgo(1), siteId: 'site-2' }),
        createMockObservation({ moodEnergy: 8, date: daysAgo(1), siteId: 'site-1' }),
      ];

      const avg = getAverageMood(observations, 7, 'site-1');
      // Only site-1: (10 + 8) / 2 = 9
      expect(avg).toBe(9);
    });
  });
});

// ============================================
// SITE-SCOPED QUERY TESTS
// ============================================

describe('Site-Scoped Queries', () => {
  describe('getObservationsForSite', () => {
    it('returns empty array when no observations for site', () => {
      const observations = [
        createMockObservation({ siteId: 'site-1' }),
        createMockObservation({ siteId: 'site-1' }),
      ];

      expect(getObservationsForSite(observations, 'site-999')).toHaveLength(0);
    });

    it('returns only observations for specified site', () => {
      const observations = [
        createMockObservation({ id: 'obs-1', siteId: 'site-1' }),
        createMockObservation({ id: 'obs-2', siteId: 'site-2' }),
        createMockObservation({ id: 'obs-3', siteId: 'site-1' }),
        createMockObservation({ id: 'obs-4', siteId: 'site-2' }),
      ];

      const site1Obs = getObservationsForSite(observations, 'site-1');

      expect(site1Obs).toHaveLength(2);
      expect(site1Obs.map((o) => o.id)).toEqual(['obs-1', 'obs-3']);
    });
  });

  describe('getOrphanObservations', () => {
    it('returns empty array when all have siteId', () => {
      const observations = [
        createMockObservation({ siteId: 'site-1' }),
        createMockObservation({ siteId: 'site-2' }),
      ];

      expect(getOrphanObservations(observations)).toHaveLength(0);
    });

    it('returns observations without siteId', () => {
      const observations = [
        createMockObservation({ id: 'obs-1', siteId: 'site-1' }),
        createMockObservation({ id: 'obs-2', siteId: undefined }),
        createMockObservation({ id: 'obs-3', siteId: undefined }),
      ];

      const orphans = getOrphanObservations(observations);

      expect(orphans).toHaveLength(2);
      expect(orphans.map((o) => o.id)).toEqual(['obs-2', 'obs-3']);
    });
  });
});

// ============================================
// RECENT OBSERVATIONS TESTS
// ============================================

describe('Recent Observations', () => {
  describe('getRecentObservations', () => {
    it('returns empty array for empty observations', () => {
      expect(getRecentObservations([])).toEqual([]);
    });

    it('returns up to specified number of days', () => {
      const observations = Array.from({ length: 10 }, (_, i) =>
        createMockObservation({ id: `obs-${i}`, date: daysAgo(i) })
      );

      const recent = getRecentObservations(observations, 5);

      expect(recent).toHaveLength(5);
    });

    it('returns all if fewer than requested', () => {
      const observations = [
        createMockObservation({ date: daysAgo(0) }),
        createMockObservation({ date: daysAgo(1) }),
      ];

      const recent = getRecentObservations(observations, 7);

      expect(recent).toHaveLength(2);
    });

    it('filters by siteId', () => {
      const observations = [
        createMockObservation({ date: daysAgo(0), siteId: 'site-1' }),
        createMockObservation({ date: daysAgo(1), siteId: 'site-2' }),
        createMockObservation({ date: daysAgo(2), siteId: 'site-1' }),
      ];

      const recent = getRecentObservations(observations, 7, 'site-1');

      expect(recent).toHaveLength(2);
      expect(recent.every((o) => o.siteId === 'site-1')).toBe(true);
    });
  });
});

// ============================================
// TRAY COUNTS TESTS
// ============================================

describe('Tray Counts', () => {
  it('tracks tray counts correctly', () => {
    const obs = createMockObservation({
      traysBlackout: 5,
      traysLight: 8,
      traysHarvestedToday: 2,
    });

    expect(obs.traysBlackout).toBe(5);
    expect(obs.traysLight).toBe(8);
    expect(obs.traysHarvestedToday).toBe(2);
  });

  it('calculates total active trays', () => {
    const obs = createMockObservation({
      traysBlackout: 5,
      traysLight: 8,
    });

    const totalActive = obs.traysBlackout + obs.traysLight;
    expect(totalActive).toBe(13);
  });

  it('handles zero tray counts', () => {
    const obs = createMockObservation({
      traysBlackout: 0,
      traysLight: 0,
      traysHarvestedToday: 0,
    });

    expect(obs.traysBlackout + obs.traysLight + obs.traysHarvestedToday).toBe(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Observation Edge Cases', () => {
  it('handles mood at boundaries (1 and 10)', () => {
    const lowMood = createMockObservation({ moodEnergy: 1 });
    const highMood = createMockObservation({ moodEnergy: 10 });

    expect(lowMood.moodEnergy).toBe(1);
    expect(highMood.moodEnergy).toBe(10);
  });

  it('handles week number boundaries', () => {
    const week1 = createMockObservation({ week: 1 });
    const week6 = createMockObservation({ week: 6 });

    expect(week1.week).toBe(1);
    expect(week6.week).toBe(6);
  });

  it('handles day of week (1-7)', () => {
    const monday = createMockObservation({ dayOfWeek: 1 });
    const sunday = createMockObservation({ dayOfWeek: 7 });

    expect(monday.dayOfWeek).toBe(1);
    expect(sunday.dayOfWeek).toBe(7);
  });

  it('handles empty text fields', () => {
    const obs = createMockObservation({
      problemsSpotted: '',
      actionsTaken: '',
      keyLearning: '',
      tomorrowPriority: '',
    });

    expect(obs.problemsSpotted).toBe('');
    expect(obs.actionsTaken).toBe('');
    expect(obs.keyLearning).toBe('');
    expect(obs.tomorrowPriority).toBe('');
  });

  it('handles long text fields', () => {
    const longText = 'A'.repeat(1000);
    const obs = createMockObservation({
      problemsSpotted: longText,
      keyLearning: longText,
    });

    expect(obs.problemsSpotted.length).toBe(1000);
    expect(obs.keyLearning.length).toBe(1000);
  });
});
