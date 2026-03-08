/**
 * stageHelpers - Unit Tests
 *
 * Tests stage display names, colors, transition validation,
 * progress percentages, days calculations, and survival rate helpers.
 */

import { describe, it, expect } from 'vitest';
import type { PropBatch, PropagationStage } from '../../types';
import {
  STAGE_DISPLAY_NAMES,
  STAGE_COLORS,
  isValidTransition,
  getValidNextStages,
  isTerminalStage,
  isActiveStage,
  getStageProgressPercent,
  daysSince,
  daysBetween,
  calculateDaysInStage,
  calculateDaysSinceTaken,
  isOverdue,
  getDaysUntilOverdue,
  calculateSurvivalRate,
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
} from '../stageHelpers';

// ============================================
// HELPERS
// ============================================

const ALL_STAGES: PropagationStage[] = [
  'taken', 'rooting', 'rooted', 'potted_up',
  'hardening', 'ready', 'graduated', 'failed',
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createMockBatch(overrides: Partial<PropBatch> = {}): PropBatch {
  const now = new Date();
  return {
    id: 'batch-1',
    batchNumber: '2026-001',
    siteId: 'site-1',
    stationId: 'station-1',
    species: 'Lavender',
    variety: 'English',
    method: 'cutting_softwood',
    quantityStarted: 20,
    quantitySurviving: 18,
    dateTaken: daysAgo(14),
    stage: 'rooting',
    daysInStage: 14,
    isExploded: false,
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================
// STAGE DISPLAY NAMES
// ============================================

describe('STAGE_DISPLAY_NAMES', () => {
  it('has a display name for every stage', () => {
    for (const stage of ALL_STAGES) {
      expect(STAGE_DISPLAY_NAMES[stage]).toBeDefined();
      expect(typeof STAGE_DISPLAY_NAMES[stage]).toBe('string');
      expect(STAGE_DISPLAY_NAMES[stage].length).toBeGreaterThan(0);
    }
  });

  it('getStageDisplayName returns correct names', () => {
    expect(getStageDisplayName('taken')).toBe('Taken');
    expect(getStageDisplayName('potted_up')).toBe('Potted Up');
    expect(getStageDisplayName('hardening')).toBe('Hardening Off');
  });
});

// ============================================
// STAGE COLORS
// ============================================

describe('STAGE_COLORS', () => {
  it('has color config for every stage', () => {
    for (const stage of ALL_STAGES) {
      const colors = STAGE_COLORS[stage];
      expect(colors).toBeDefined();
      expect(colors.bg).toBeTruthy();
      expect(colors.text).toBeTruthy();
      expect(colors.border).toBeTruthy();
    }
  });

  it('getStageColors returns object with bg, text, border', () => {
    const colors = getStageColors('rooting');
    expect(colors).toHaveProperty('bg');
    expect(colors).toHaveProperty('text');
    expect(colors).toHaveProperty('border');
  });
});

// ============================================
// STAGE TRANSITION VALIDATION
// ============================================

describe('isValidTransition', () => {
  it('allows valid forward transitions', () => {
    expect(isValidTransition('taken', 'rooting')).toBe(true);
    expect(isValidTransition('rooting', 'rooted')).toBe(true);
    expect(isValidTransition('ready', 'graduated')).toBe(true);
  });

  it('allows failure from any active stage', () => {
    const activeStages: PropagationStage[] = [
      'taken', 'rooting', 'rooted', 'potted_up', 'hardening', 'ready',
    ];
    for (const stage of activeStages) {
      expect(isValidTransition(stage, 'failed')).toBe(true);
    }
  });

  it('rejects invalid transitions', () => {
    expect(isValidTransition('taken', 'graduated')).toBe(false);
    expect(isValidTransition('rooting', 'potted_up')).toBe(false);
  });

  it('rejects transitions from terminal stages', () => {
    expect(isValidTransition('graduated', 'rooting')).toBe(false);
    expect(isValidTransition('failed', 'taken')).toBe(false);
  });
});

describe('getValidNextStages', () => {
  it('returns valid next stages for active stages', () => {
    expect(getValidNextStages('taken')).toContain('rooting');
    expect(getValidNextStages('taken')).toContain('failed');
  });

  it('returns empty array for terminal stages', () => {
    expect(getValidNextStages('graduated')).toEqual([]);
    expect(getValidNextStages('failed')).toEqual([]);
  });
});

describe('isTerminalStage / isActiveStage', () => {
  it('identifies terminal stages', () => {
    expect(isTerminalStage('graduated')).toBe(true);
    expect(isTerminalStage('failed')).toBe(true);
    expect(isTerminalStage('rooting')).toBe(false);
  });

  it('identifies active stages', () => {
    expect(isActiveStage('rooting')).toBe(true);
    expect(isActiveStage('taken')).toBe(true);
    expect(isActiveStage('graduated')).toBe(false);
    expect(isActiveStage('failed')).toBe(false);
  });
});

// ============================================
// STAGE PROGRESS
// ============================================

describe('getStageProgressPercent', () => {
  it('returns 0 for taken (first stage)', () => {
    expect(getStageProgressPercent('taken')).toBe(0);
  });

  it('returns 100 for graduated', () => {
    expect(getStageProgressPercent('graduated')).toBe(100);
  });

  it('returns 0 for failed (not in normal progression)', () => {
    expect(getStageProgressPercent('failed')).toBe(0);
  });

  it('returns intermediate percentages for middle stages', () => {
    const percent = getStageProgressPercent('rooting');
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThan(100);
  });
});

// ============================================
// DAYS CALCULATIONS
// ============================================

describe('daysSince', () => {
  it('returns 0 for today', () => {
    expect(daysSince(new Date())).toBe(0);
  });

  it('returns correct days for past dates', () => {
    expect(daysSince(daysAgo(7))).toBe(7);
  });
});

describe('daysBetween', () => {
  it('calculates days between two dates', () => {
    const start = daysAgo(10);
    const end = daysAgo(3);
    expect(daysBetween(start, end)).toBe(7);
  });

  it('returns 0 for same date', () => {
    const date = new Date();
    expect(daysBetween(date, date)).toBe(0);
  });
});

describe('calculateDaysInStage', () => {
  it('calculates days based on stage start date', () => {
    const batch = createMockBatch({
      stage: 'rooting',
      dateTaken: daysAgo(10),
    });
    expect(calculateDaysInStage(batch)).toBe(10);
  });
});

describe('calculateDaysSinceTaken', () => {
  it('calculates days since taken', () => {
    expect(calculateDaysSinceTaken(daysAgo(5))).toBe(5);
  });
});

// ============================================
// OVERDUE DETECTION
// ============================================

describe('isOverdue', () => {
  it('returns true when batch exceeds typical days', () => {
    // rooting has typical 21 days
    const batch = createMockBatch({
      stage: 'rooting',
      dateTaken: daysAgo(25),
    });
    expect(isOverdue(batch)).toBe(true);
  });

  it('returns false when batch is within typical days', () => {
    const batch = createMockBatch({
      stage: 'rooting',
      dateTaken: daysAgo(10),
    });
    expect(isOverdue(batch)).toBe(false);
  });

  it('returns false for stages with null typical days', () => {
    const batch = createMockBatch({
      stage: 'ready',
      dateTaken: daysAgo(100),
      dateReady: daysAgo(100),
    });
    expect(isOverdue(batch)).toBe(false);
  });
});

describe('getDaysUntilOverdue', () => {
  it('returns null for stages without typical days', () => {
    const batch = createMockBatch({ stage: 'graduated', dateGraduated: new Date() });
    expect(getDaysUntilOverdue(batch)).toBeNull();
  });

  it('returns positive number when not yet overdue', () => {
    const batch = createMockBatch({
      stage: 'rooting',
      dateTaken: daysAgo(10),
    });
    const result = getDaysUntilOverdue(batch);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});

// ============================================
// SURVIVAL RATE
// ============================================

describe('calculateSurvivalRate', () => {
  it('calculates correct percentage', () => {
    expect(calculateSurvivalRate(18, 20)).toBe(90);
  });

  it('returns 0 when started is 0', () => {
    expect(calculateSurvivalRate(0, 0)).toBe(0);
  });

  it('returns 100 when all survive', () => {
    expect(calculateSurvivalRate(10, 10)).toBe(100);
  });
});

// ============================================
// FORMAT HELPERS
// ============================================

describe('formatDaysInStage', () => {
  it('returns "Today" for 0 days', () => {
    expect(formatDaysInStage(0)).toBe('Today');
  });

  it('returns "1 day" for singular', () => {
    expect(formatDaysInStage(1)).toBe('1 day');
  });

  it('returns plural for multiple days', () => {
    expect(formatDaysInStage(5)).toBe('5 days');
  });
});
