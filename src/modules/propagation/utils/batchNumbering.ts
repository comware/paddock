/**
 * Batch Numbering - Auto-generate batch numbers in YYYY-NNN format
 *
 * Each year starts fresh at 001.
 * Example: 2026-001, 2026-002, ..., 2026-999
 */

import type { PropBatch } from '../types';

/**
 * Extract year and sequence number from a batch number.
 * Returns null if the batch number is invalid.
 */
export function parseBatchNumber(batchNumber: string): { year: number; sequence: number } | null {
  const match = batchNumber.match(/^(\d{4})-(\d{3})$/);
  if (!match) return null;

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

/**
 * Format a year and sequence into a batch number string.
 */
export function formatBatchNumber(year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `${year}-${paddedSequence}`;
}

/**
 * Get the current year.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Generate the next batch number based on existing batches.
 *
 * @param existingBatches - Array of existing batches to check for numbering
 * @param year - Optional year override (defaults to current year)
 * @returns Next batch number in YYYY-NNN format
 */
export function generateNextBatchNumber(
  existingBatches: Pick<PropBatch, 'batchNumber'>[],
  year?: number
): string {
  const targetYear = year ?? getCurrentYear();

  // Filter batches from the target year
  const yearBatches = existingBatches.filter((batch) => {
    const parsed = parseBatchNumber(batch.batchNumber);
    return parsed !== null && parsed.year === targetYear;
  });

  // If no batches exist for this year, start at 001
  if (yearBatches.length === 0) {
    return formatBatchNumber(targetYear, 1);
  }

  // Find the highest sequence number
  let maxSequence = 0;
  for (const batch of yearBatches) {
    const parsed = parseBatchNumber(batch.batchNumber);
    if (parsed && parsed.sequence > maxSequence) {
      maxSequence = parsed.sequence;
    }
  }

  // Return next sequence
  return formatBatchNumber(targetYear, maxSequence + 1);
}

/**
 * Validate a batch number format.
 */
export function isValidBatchNumber(batchNumber: string): boolean {
  return parseBatchNumber(batchNumber) !== null;
}

/**
 * Check if a batch number already exists.
 */
export function batchNumberExists(
  batchNumber: string,
  existingBatches: Pick<PropBatch, 'batchNumber'>[]
): boolean {
  return existingBatches.some((batch) => batch.batchNumber === batchNumber);
}

/**
 * Get all batch numbers for a specific year.
 */
export function getBatchNumbersForYear(
  year: number,
  existingBatches: Pick<PropBatch, 'batchNumber'>[]
): string[] {
  return existingBatches
    .filter((batch) => {
      const parsed = parseBatchNumber(batch.batchNumber);
      return parsed !== null && parsed.year === year;
    })
    .map((batch) => batch.batchNumber)
    .sort();
}

/**
 * Get years that have batches.
 */
export function getYearsWithBatches(
  existingBatches: Pick<PropBatch, 'batchNumber'>[]
): number[] {
  const years = new Set<number>();

  for (const batch of existingBatches) {
    const parsed = parseBatchNumber(batch.batchNumber);
    if (parsed) {
      years.add(parsed.year);
    }
  }

  return Array.from(years).sort((a, b) => b - a); // Descending order
}

/**
 * Get batch count for a specific year.
 */
export function getBatchCountForYear(
  year: number,
  existingBatches: Pick<PropBatch, 'batchNumber'>[]
): number {
  return existingBatches.filter((batch) => {
    const parsed = parseBatchNumber(batch.batchNumber);
    return parsed !== null && parsed.year === year;
  }).length;
}
