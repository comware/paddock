/**
 * Harvest Calculation Utilities
 *
 * Provides functions for calculating harvest dates and countdowns
 * based on tray sow date and variety-specific grow times.
 */

import { addDays, differenceInDays, startOfDay, format, isAfter, isBefore, isSameDay } from 'date-fns';
import type { GrowTray, GrowVarietyConfig } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type HarvestStatus = 'growing' | 'soon' | 'ready' | 'overdue' | 'unknown';

export interface HarvestForecast {
  /** Expected harvest date based on variety grow time */
  expectedDate: Date | null;
  /** Days until harvest (negative means overdue) */
  daysRemaining: number | null;
  /** Status category for UI styling */
  status: HarvestStatus;
  /** Human-readable label for the countdown */
  label: string;
}

export interface UpcomingHarvest {
  trayId: string;
  trayNumber: number;
  trayLabel: string | undefined;
  variety: string;
  expectedDate: Date;
  daysRemaining: number;
  status: HarvestStatus;
  siteId: string | undefined;
}

export interface HarvestsByDate {
  date: Date;
  dateLabel: string;
  harvests: UpcomingHarvest[];
}

// ============================================
// CORE CALCULATIONS
// ============================================

/**
 * Calculate the expected harvest date for a tray.
 *
 * @param dateSown - The date the tray was sown
 * @param typicalDaysToHarvest - Days from sow to harvest for this variety
 * @returns The expected harvest date, or null if data is missing
 */
export function calculateHarvestDate(
  dateSown: Date,
  typicalDaysToHarvest: number | undefined
): Date | null {
  if (!typicalDaysToHarvest || typicalDaysToHarvest <= 0) {
    return null;
  }
  return addDays(startOfDay(dateSown), typicalDaysToHarvest);
}

/**
 * Calculate days until harvest from a given reference date.
 *
 * @param harvestDate - The expected harvest date
 * @param referenceDate - The date to calculate from (defaults to today)
 * @returns Days remaining (negative if overdue), or null if no harvest date
 */
export function getDaysUntilHarvest(
  harvestDate: Date | null,
  referenceDate: Date = new Date()
): number | null {
  if (!harvestDate) {
    return null;
  }
  return differenceInDays(startOfDay(harvestDate), startOfDay(referenceDate));
}

/**
 * Determine the harvest status based on days remaining.
 *
 * @param daysRemaining - Days until harvest
 * @returns Status category for UI styling
 */
export function getHarvestStatus(daysRemaining: number | null): HarvestStatus {
  if (daysRemaining === null) {
    return 'unknown';
  }
  if (daysRemaining < 0) {
    return 'overdue';
  }
  if (daysRemaining === 0) {
    return 'ready';
  }
  if (daysRemaining <= 2) {
    return 'soon';
  }
  return 'growing';
}

/**
 * Get a human-readable label for the harvest countdown.
 *
 * @param daysRemaining - Days until harvest
 * @param status - Harvest status
 * @returns Label string for display
 */
export function getHarvestLabel(daysRemaining: number | null, status: HarvestStatus): string {
  if (daysRemaining === null) {
    return 'Unknown';
  }

  switch (status) {
    case 'overdue':
      return Math.abs(daysRemaining) === 1
        ? '1 day overdue'
        : `${Math.abs(daysRemaining)} days overdue`;
    case 'ready':
      return 'Ready';
    case 'soon':
      return daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
    case 'growing':
      return `${daysRemaining} days`;
    default:
      return 'Unknown';
  }
}

// ============================================
// HIGH-LEVEL FUNCTIONS
// ============================================

/**
 * Get complete harvest forecast for a tray.
 *
 * @param tray - The tray to forecast
 * @param variety - The variety config with grow time
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Complete harvest forecast with date, days, status, and label
 */
export function getHarvestForecast(
  tray: Pick<GrowTray, 'dateSown'>,
  variety: Pick<GrowVarietyConfig, 'typicalDaysToHarvest'> | undefined,
  referenceDate: Date = new Date()
): HarvestForecast {
  const expectedDate = calculateHarvestDate(tray.dateSown, variety?.typicalDaysToHarvest);
  const daysRemaining = getDaysUntilHarvest(expectedDate, referenceDate);
  const status = getHarvestStatus(daysRemaining);
  const label = getHarvestLabel(daysRemaining, status);

  return {
    expectedDate,
    daysRemaining,
    status,
    label,
  };
}

/**
 * Get upcoming harvests for a list of trays, sorted by date.
 *
 * @param trays - List of active trays
 * @param getVariety - Function to look up variety by name
 * @param daysAhead - Number of days to look ahead (default 7)
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns List of upcoming harvests sorted by expected date
 */
export function getUpcomingHarvests(
  trays: Array<Pick<GrowTray, 'id' | 'trayNumber' | 'label' | 'variety' | 'dateSown' | 'siteId' | 'dateHarvested'>>,
  getVariety: (name: string) => Pick<GrowVarietyConfig, 'typicalDaysToHarvest'> | undefined,
  daysAhead: number = 7,
  referenceDate: Date = new Date()
): UpcomingHarvest[] {
  const today = startOfDay(referenceDate);
  const endDate = addDays(today, daysAhead);

  const upcoming: UpcomingHarvest[] = [];

  for (const tray of trays) {
    // Skip harvested trays
    if (tray.dateHarvested) {
      continue;
    }

    const variety = getVariety(tray.variety);
    const forecast = getHarvestForecast(tray, variety, referenceDate);

    if (!forecast.expectedDate || forecast.daysRemaining === null) {
      continue;
    }

    // Include if within range (including overdue)
    const withinRange =
      forecast.daysRemaining < 0 || // Already overdue
      (isAfter(forecast.expectedDate, addDays(today, -1)) &&
        isBefore(forecast.expectedDate, addDays(endDate, 1)));

    if (withinRange) {
      upcoming.push({
        trayId: tray.id!,
        trayNumber: tray.trayNumber,
        trayLabel: tray.label,
        variety: tray.variety,
        expectedDate: forecast.expectedDate,
        daysRemaining: forecast.daysRemaining,
        status: forecast.status,
        siteId: tray.siteId,
      });
    }
  }

  // Sort by expected date (overdue first, then by date)
  return upcoming.sort((a, b) => {
    // Overdue items first
    if (a.daysRemaining < 0 && b.daysRemaining >= 0) return -1;
    if (b.daysRemaining < 0 && a.daysRemaining >= 0) return 1;
    // Then by date
    return a.expectedDate.getTime() - b.expectedDate.getTime();
  });
}

/**
 * Group upcoming harvests by date for display.
 *
 * @param harvests - List of upcoming harvests
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Harvests grouped by date with labels
 */
export function groupHarvestsByDate(
  harvests: UpcomingHarvest[],
  referenceDate: Date = new Date()
): HarvestsByDate[] {
  const today = startOfDay(referenceDate);
  const groups = new Map<string, HarvestsByDate>();

  for (const harvest of harvests) {
    const dateKey = format(harvest.expectedDate, 'yyyy-MM-dd');

    if (!groups.has(dateKey)) {
      // Create date label
      let dateLabel: string;
      if (harvest.daysRemaining < 0) {
        dateLabel = 'Overdue';
      } else if (isSameDay(harvest.expectedDate, today)) {
        dateLabel = 'Today';
      } else if (isSameDay(harvest.expectedDate, addDays(today, 1))) {
        dateLabel = 'Tomorrow';
      } else {
        dateLabel = format(harvest.expectedDate, 'EEEE, MMM d');
      }

      groups.set(dateKey, {
        date: harvest.expectedDate,
        dateLabel,
        harvests: [],
      });
    }

    groups.get(dateKey)!.harvests.push(harvest);
  }

  // Convert to array and sort
  return Array.from(groups.values()).sort((a, b) => {
    // Put overdue group first
    if (a.dateLabel === 'Overdue' && b.dateLabel !== 'Overdue') return -1;
    if (b.dateLabel === 'Overdue' && a.dateLabel !== 'Overdue') return 1;
    return a.date.getTime() - b.date.getTime();
  });
}

// ============================================
// STYLE HELPERS
// ============================================

/**
 * Get CSS classes for harvest status badge.
 */
export function getHarvestBadgeClasses(status: HarvestStatus): string {
  switch (status) {
    case 'ready':
    case 'overdue':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'soon':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'growing':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
  }
}
