/**
 * Data Export/Import Utilities
 *
 * Handles JSON backup, CSV export, and data restoration for Paddock.
 */

import { format } from 'date-fns';
import { db, growDb } from '@/lib/db';
import type {
  GrowTray,
  GrowObservation,
  GrowTimeEntry,
  GrowVarietyConfig,
  GrowExperiment,
  GrowDecision,
} from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface PaddockBackup {
  version: number;
  exportedAt: string;
  data: {
    trays: GrowTray[];
    observations: GrowObservation[];
    timeEntries: GrowTimeEntry[];
    varietyConfigs: GrowVarietyConfig[];
    experiments: GrowExperiment[];
    decisions: GrowDecision[];
  };
}

// ============================================
// JSON EXPORT/IMPORT
// ============================================

/**
 * Export all Paddock data as JSON backup
 */
export async function exportAllDataAsJSON(): Promise<string> {
  const backup: PaddockBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      trays: await growDb.trays.toArray(),
      observations: await growDb.observations.toArray(),
      timeEntries: await growDb.timeEntries.toArray(),
      varietyConfigs: await growDb.varietyConfigs.toArray(),
      experiments: await growDb.experiments.toArray(),
      decisions: await growDb.decisions.toArray(),
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Download JSON backup file
 */
export async function downloadJSONBackup(): Promise<void> {
  const json = await exportAllDataAsJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paddock-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON backup
 * Returns counts of imported records
 */
export async function importFromJSON(
  jsonString: string,
  options: { merge?: boolean } = {}
): Promise<{ imported: Record<string, number>; errors: string[] }> {
  const errors: string[] = [];
  const imported: Record<string, number> = {
    trays: 0,
    observations: 0,
    timeEntries: 0,
    varietyConfigs: 0,
    experiments: 0,
    decisions: 0,
  };

  try {
    const backup = JSON.parse(jsonString) as PaddockBackup;

    // Validate backup structure
    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup file format');
    }

    // Clear existing data if not merging
    if (!options.merge) {
      await clearAllData();
    }

    // Import each table
    if (backup.data.trays?.length) {
      const trays = backup.data.trays.map(convertDates);
      await growDb.trays.bulkAdd(trays.map(stripIds));
      imported.trays = trays.length;
    }

    if (backup.data.observations?.length) {
      const observations = backup.data.observations.map(convertDates);
      await growDb.observations.bulkAdd(observations.map(stripIds));
      imported.observations = observations.length;
    }

    if (backup.data.timeEntries?.length) {
      const timeEntries = backup.data.timeEntries.map(convertDates);
      await growDb.timeEntries.bulkAdd(timeEntries.map(stripIds));
      imported.timeEntries = timeEntries.length;
    }

    if (backup.data.varietyConfigs?.length) {
      const configs = backup.data.varietyConfigs;
      await growDb.varietyConfigs.bulkAdd(configs.map(stripIds));
      imported.varietyConfigs = configs.length;
    }

    if (backup.data.experiments?.length) {
      const experiments = backup.data.experiments.map(convertDates);
      await growDb.experiments.bulkAdd(experiments.map(stripIds));
      imported.experiments = experiments.length;
    }

    if (backup.data.decisions?.length) {
      const decisions = backup.data.decisions.map(convertDates);
      await growDb.decisions.bulkAdd(decisions.map(stripIds));
      imported.decisions = decisions.length;
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  return { imported, errors };
}

// ============================================
// CSV EXPORT
// ============================================

/**
 * Export trays as CSV
 */
export async function exportTraysAsCSV(): Promise<string> {
  const trays = await growDb.trays.toArray();

  const headers = [
    'Tray Number',
    'Variety',
    'Date Sown',
    'Seed Weight (g)',
    'Growing Medium',
    'Pre-Soaked',
    'Blackout Days',
    'Date to Light',
    'Germination Rate (%)',
    'Date Harvested',
    'Harvest Weight (g)',
    'Quality Grade',
    'Yield Ratio',
    'Sellable',
    'Problems Observed',
    'Lessons Learned',
  ];

  const rows = trays.map((tray) => {
    const yieldRatio = tray.seedWeight > 0 && tray.harvestWeight
      ? (tray.harvestWeight / tray.seedWeight).toFixed(2)
      : '';

    return [
      tray.trayNumber,
      tray.variety,
      formatDateForCSV(tray.dateSown),
      tray.seedWeight,
      tray.growingMedium,
      tray.preSoaked ? 'Yes' : 'No',
      tray.blackoutDays,
      formatDateForCSV(tray.dateToLight),
      tray.germinationRate ?? '',
      formatDateForCSV(tray.dateHarvested),
      tray.harvestWeight ?? '',
      tray.qualityGrade ?? '',
      yieldRatio,
      tray.sellable ? 'Yes' : 'No',
      escapeCSV(tray.problemsObserved),
      escapeCSV(tray.lessonsLearned),
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Download CSV file
 */
export async function downloadTraysCSV(): Promise<void> {
  const csv = await exportTraysAsCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paddock-trays-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// DATA MANAGEMENT
// ============================================

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await growDb.trays.clear();
    await growDb.observations.clear();
    await growDb.timeEntries.clear();
    await growDb.varietyConfigs.clear();
    await growDb.experiments.clear();
    await growDb.decisions.clear();
  });
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<Record<string, number>> {
  return {
    trays: await growDb.trays.count(),
    observations: await growDb.observations.count(),
    timeEntries: await growDb.timeEntries.count(),
    varietyConfigs: await growDb.varietyConfigs.count(),
    experiments: await growDb.experiments.count(),
    decisions: await growDb.decisions.count(),
  };
}

/**
 * Get raw data for debug view
 */
export async function getRawData(): Promise<PaddockBackup['data']> {
  return {
    trays: await growDb.trays.toArray(),
    observations: await growDb.observations.toArray(),
    timeEntries: await growDb.timeEntries.toArray(),
    varietyConfigs: await growDb.varietyConfigs.toArray(),
    experiments: await growDb.experiments.toArray(),
    decisions: await growDb.decisions.toArray(),
  };
}

// ============================================
// HELPERS
// ============================================

function formatDateForCSV(date?: Date): string {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
}

function escapeCSV(value: string): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function stripIds<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  const { id: _, ...rest } = obj;
  return rest as Omit<T, 'id'>;
}

function convertDates<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };
  for (const key of Object.keys(result) as (keyof T)[]) {
    const value = result[key];
    if (typeof value === 'string' && isISODateString(value)) {
      (result as Record<string, unknown>)[key as string] = new Date(value);
    }
  }
  return result;
}

function isISODateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}
