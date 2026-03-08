/**
 * batchNumbering - Unit Tests
 *
 * Tests batch number parsing, formatting, generation,
 * validation, and year-based queries.
 */

import { describe, it, expect } from 'vitest';
import {
  parseBatchNumber,
  formatBatchNumber,
  generateNextBatchNumber,
  isValidBatchNumber,
  batchNumberExists,
  getBatchNumbersForYear,
  getYearsWithBatches,
  getBatchCountForYear,
} from '../batchNumbering';

// ============================================
// PARSE BATCH NUMBER
// ============================================

describe('parseBatchNumber', () => {
  it('parses valid batch number "2026-001"', () => {
    const result = parseBatchNumber('2026-001');
    expect(result).not.toBeNull();
    expect(result!.year).toBe(2026);
    expect(result!.sequence).toBe(1);
  });

  it('parses batch number with high sequence', () => {
    const result = parseBatchNumber('2026-999');
    expect(result).not.toBeNull();
    expect(result!.sequence).toBe(999);
  });

  it('returns null for invalid format - missing padding', () => {
    expect(parseBatchNumber('2026-1')).toBeNull();
    expect(parseBatchNumber('2026-01')).toBeNull();
  });

  it('returns null for completely invalid strings', () => {
    expect(parseBatchNumber('')).toBeNull();
    expect(parseBatchNumber('abc')).toBeNull();
    expect(parseBatchNumber('2026')).toBeNull();
    expect(parseBatchNumber('26-001')).toBeNull();
  });

  it('returns null for extra characters', () => {
    expect(parseBatchNumber('2026-001-extra')).toBeNull();
    expect(parseBatchNumber('X2026-001')).toBeNull();
  });
});

// ============================================
// FORMAT BATCH NUMBER
// ============================================

describe('formatBatchNumber', () => {
  it('formats with zero-padded sequence', () => {
    expect(formatBatchNumber(2026, 1)).toBe('2026-001');
    expect(formatBatchNumber(2026, 42)).toBe('2026-042');
    expect(formatBatchNumber(2026, 100)).toBe('2026-100');
  });

  it('handles large sequence numbers', () => {
    expect(formatBatchNumber(2026, 999)).toBe('2026-999');
  });
});

// ============================================
// GENERATE NEXT BATCH NUMBER
// ============================================

describe('generateNextBatchNumber', () => {
  it('returns YYYY-001 for fresh year with no existing batches', () => {
    const result = generateNextBatchNumber([], 2026);
    expect(result).toBe('2026-001');
  });

  it('increments from existing batches', () => {
    const existing = [
      { batchNumber: '2026-001' },
      { batchNumber: '2026-002' },
      { batchNumber: '2026-003' },
    ];
    const result = generateNextBatchNumber(existing, 2026);
    expect(result).toBe('2026-004');
  });

  it('handles gaps in sequence numbers', () => {
    const existing = [
      { batchNumber: '2026-001' },
      { batchNumber: '2026-005' },
    ];
    const result = generateNextBatchNumber(existing, 2026);
    expect(result).toBe('2026-006');
  });

  it('ignores batches from other years', () => {
    const existing = [
      { batchNumber: '2025-050' },
      { batchNumber: '2026-003' },
    ];
    const result = generateNextBatchNumber(existing, 2026);
    expect(result).toBe('2026-004');
  });
});

// ============================================
// VALIDATION
// ============================================

describe('isValidBatchNumber', () => {
  it('returns true for valid format', () => {
    expect(isValidBatchNumber('2026-001')).toBe(true);
    expect(isValidBatchNumber('2025-123')).toBe(true);
  });

  it('returns false for invalid format', () => {
    expect(isValidBatchNumber('abc')).toBe(false);
    expect(isValidBatchNumber('2026-1')).toBe(false);
  });
});

describe('batchNumberExists', () => {
  it('returns true when number exists', () => {
    const existing = [{ batchNumber: '2026-001' }, { batchNumber: '2026-002' }];
    expect(batchNumberExists('2026-001', existing)).toBe(true);
  });

  it('returns false when number does not exist', () => {
    const existing = [{ batchNumber: '2026-001' }];
    expect(batchNumberExists('2026-999', existing)).toBe(false);
  });
});

// ============================================
// YEAR QUERIES
// ============================================

describe('getBatchNumbersForYear', () => {
  it('returns sorted batch numbers for a year', () => {
    const existing = [
      { batchNumber: '2026-003' },
      { batchNumber: '2025-001' },
      { batchNumber: '2026-001' },
    ];
    const result = getBatchNumbersForYear(2026, existing);
    expect(result).toEqual(['2026-001', '2026-003']);
  });
});

describe('getYearsWithBatches', () => {
  it('returns years in descending order', () => {
    const existing = [
      { batchNumber: '2024-001' },
      { batchNumber: '2026-001' },
      { batchNumber: '2025-001' },
    ];
    const result = getYearsWithBatches(existing);
    expect(result).toEqual([2026, 2025, 2024]);
  });

  it('returns empty for no batches', () => {
    expect(getYearsWithBatches([])).toEqual([]);
  });
});

describe('getBatchCountForYear', () => {
  it('counts batches for a specific year', () => {
    const existing = [
      { batchNumber: '2026-001' },
      { batchNumber: '2026-002' },
      { batchNumber: '2025-001' },
    ];
    expect(getBatchCountForYear(2026, existing)).toBe(2);
    expect(getBatchCountForYear(2025, existing)).toBe(1);
    expect(getBatchCountForYear(2024, existing)).toBe(0);
  });
});
