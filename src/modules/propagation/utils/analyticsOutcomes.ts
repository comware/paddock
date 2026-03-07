/**
 * Analytics - Outcome & Graduation Calculations
 *
 * Provides outcome distribution, monthly trends,
 * and graduation totals.
 *
 * Extracted from analyticsCalculations.ts for code health.
 */

import type {
  PropBatch,
  PropGraduation,
  GraduationOutcome,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Outcome distribution for graduated batches.
 */
export interface OutcomeDistribution {
  outcome: GraduationOutcome;
  count: number;
  quantity: number; // total propagules
  percentage: number;
}

/**
 * Monthly outcome data for trends.
 */
export interface MonthlyOutcome {
  month: string; // YYYY-MM format
  graduated: number;
  failed: number;
  quantity: number;
}

// ============================================
// OUTCOME ANALYTICS
// ============================================

/**
 * Calculate outcome distribution from graduations.
 */
export function getOutcomeDistribution(
  graduations: PropGraduation[]
): OutcomeDistribution[] {
  if (graduations.length === 0) {
    return [];
  }

  const outcomeTotals = new Map<
    GraduationOutcome,
    { count: number; quantity: number }
  >();

  for (const graduation of graduations) {
    const existing = outcomeTotals.get(graduation.outcome) ?? {
      count: 0,
      quantity: 0,
    };
    existing.count++;
    existing.quantity += graduation.quantity;
    outcomeTotals.set(graduation.outcome, existing);
  }

  const totalCount = graduations.length;
  const results: OutcomeDistribution[] = [];

  for (const [outcome, totals] of outcomeTotals) {
    results.push({
      outcome,
      count: totals.count,
      quantity: totals.quantity,
      percentage: Math.round((totals.count / totalCount) * 100),
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Format date to YYYY-MM string.
 */
function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get outcomes aggregated by month for trend analysis.
 */
export function getOutcomesByMonth(
  batches: PropBatch[],
  graduations: PropGraduation[]
): MonthlyOutcome[] {
  const monthlyData = new Map<
    string,
    { graduated: number; failed: number; quantity: number }
  >();

  for (const batch of batches) {
    if (batch.stage === 'failed') {
      const monthKey = formatMonthKey(new Date(batch.dateTaken));
      const existing = monthlyData.get(monthKey) ?? {
        graduated: 0,
        failed: 0,
        quantity: 0,
      };
      existing.failed++;
      monthlyData.set(monthKey, existing);
    }
  }

  for (const graduation of graduations) {
    const monthKey = formatMonthKey(new Date(graduation.graduationDate));
    const existing = monthlyData.get(monthKey) ?? {
      graduated: 0,
      failed: 0,
      quantity: 0,
    };
    existing.graduated++;
    existing.quantity += graduation.quantity;
    monthlyData.set(monthKey, existing);
  }

  const results: MonthlyOutcome[] = [];
  for (const [month, data] of monthlyData) {
    results.push({
      month,
      graduated: data.graduated,
      failed: data.failed,
      quantity: data.quantity,
    });
  }

  return results.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get total graduated count and quantity.
 */
export function getTotalGraduated(graduations: PropGraduation[]): {
  count: number;
  quantity: number;
} {
  return {
    count: graduations.length,
    quantity: graduations.reduce((sum, g) => sum + g.quantity, 0),
  };
}
