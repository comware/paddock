/**
 * Propagation Module - Export/Import Utilities
 *
 * Handles JSON backup, CSV export, and data restoration for propagation data.
 * Includes version information for future migration support.
 */

import { format } from 'date-fns';
import { db, propDb, toId } from '@/lib/db';
import type {
  PropMotherPlant,
  PropStation,
  PropStationLog,
  PropBatch,
  PropPropagule,
  PropStageTransition,
  PropGraduation,
  PropSupply,
  PropBatchCost,
  PropSpeciesConfig,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Version 1 backup format for propagation module.
 */
export interface PropagationBackup {
  version: number;
  exportedAt: string;
  module: 'propagation';
  data: {
    motherPlants: PropMotherPlant[];
    stations: PropStation[];
    stationLogs: PropStationLog[];
    batches: PropBatch[];
    propagules: PropPropagule[];
    stageTransitions: PropStageTransition[];
    graduations: PropGraduation[];
    supplies: PropSupply[];
    batchCosts: PropBatchCost[];
    speciesConfigs: PropSpeciesConfig[];
  };
}

/**
 * Import result with counts and errors.
 */
export interface ImportResult {
  imported: Record<string, number>;
  errors: string[];
}

/**
 * Import options.
 */
export interface ImportOptions {
  /** If true, merge with existing data. If false, replace all data. */
  merge?: boolean;
}

// ============================================
// JSON EXPORT
// ============================================

/**
 * Export all propagation data as JSON backup string.
 */
export async function exportPropagationAsJSON(): Promise<string> {
  const backup: PropagationBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    module: 'propagation',
    data: {
      motherPlants: await propDb.motherPlants.toArray(),
      stations: await propDb.stations.toArray(),
      stationLogs: await propDb.stationLogs.toArray(),
      batches: await propDb.batches.toArray(),
      propagules: await propDb.propagules.toArray(),
      stageTransitions: await propDb.stageTransitions.toArray(),
      graduations: await propDb.graduations.toArray(),
      supplies: await propDb.supplies.toArray(),
      batchCosts: await propDb.batchCosts.toArray(),
      speciesConfigs: await propDb.speciesConfigs.toArray(),
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Download JSON backup file.
 */
export async function downloadPropagationJSONBackup(): Promise<void> {
  const json = await exportPropagationAsJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paddock-propagation-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// JSON IMPORT
// ============================================

/**
 * Validate backup file structure.
 */
function validateBackup(backup: unknown): backup is PropagationBackup {
  if (!backup || typeof backup !== 'object') {
    return false;
  }

  const b = backup as Record<string, unknown>;

  // Check required fields
  if (typeof b.version !== 'number') return false;
  if (b.module !== 'propagation') return false;
  if (!b.data || typeof b.data !== 'object') return false;

  return true;
}

/**
 * Import data from JSON backup.
 * Returns counts of imported records and any errors.
 */
export async function importPropagationFromJSON(
  jsonString: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const errors: string[] = [];
  const imported: Record<string, number> = {
    motherPlants: 0,
    stations: 0,
    stationLogs: 0,
    batches: 0,
    propagules: 0,
    stageTransitions: 0,
    graduations: 0,
    supplies: 0,
    batchCosts: 0,
    speciesConfigs: 0,
  };

  try {
    const backup = JSON.parse(jsonString);

    // Validate backup structure
    if (!validateBackup(backup)) {
      throw new Error('Invalid backup file format. Expected propagation module backup.');
    }

    // Check version compatibility
    if (backup.version > 1) {
      throw new Error(
        `Backup version ${backup.version} is not supported. ` +
          'Please update Paddock to import this backup.'
      );
    }

    // Clear existing data if not merging
    if (!options.merge) {
      await clearAllPropagationData();
    }

    // Import each table (order matters for foreign key references)
    // Import in order: independent tables first, then dependent tables

    // 1. Species configs (independent)
    if (backup.data.speciesConfigs?.length) {
      const configs = backup.data.speciesConfigs.map(convertDates);
      if (options.merge) {
        // In merge mode, skip existing species
        const existing = await propDb.speciesConfigs.toArray();
        const existingSpecies = new Set(existing.map((c) => c.species));
        const newConfigs = configs.filter((c) => !existingSpecies.has(c.species));
        await propDb.speciesConfigs.bulkAdd(newConfigs.map(stripId));
        imported.speciesConfigs = newConfigs.length;
      } else {
        await propDb.speciesConfigs.bulkAdd(configs.map(stripId));
        imported.speciesConfigs = configs.length;
      }
    }

    // 2. Supplies (independent)
    if (backup.data.supplies?.length) {
      const supplies = backup.data.supplies.map(convertDates);
      await propDb.supplies.bulkAdd(supplies.map(stripId));
      imported.supplies = supplies.length;
    }

    // 3. Stations (independent, but referenced by batches)
    if (backup.data.stations?.length) {
      const stations = backup.data.stations.map(convertDates);
      await propDb.stations.bulkAdd(stations.map(stripId));
      imported.stations = stations.length;
    }

    // 4. Station logs (depends on stations)
    if (backup.data.stationLogs?.length) {
      const logs = backup.data.stationLogs.map(convertDates);
      await propDb.stationLogs.bulkAdd(logs.map(stripId));
      imported.stationLogs = logs.length;
    }

    // 5. Mother plants (independent, but referenced by batches)
    if (backup.data.motherPlants?.length) {
      const plants = backup.data.motherPlants.map(convertDates);
      await propDb.motherPlants.bulkAdd(plants.map(stripId));
      imported.motherPlants = plants.length;
    }

    // 6. Batches (depends on stations, mother plants)
    if (backup.data.batches?.length) {
      const batches = backup.data.batches.map(convertDates);
      await propDb.batches.bulkAdd(batches.map(stripId));
      imported.batches = batches.length;
    }

    // 7. Propagules (depends on batches)
    if (backup.data.propagules?.length) {
      const propagules = backup.data.propagules.map(convertDates);
      await propDb.propagules.bulkAdd(propagules.map(stripId));
      imported.propagules = propagules.length;
    }

    // 8. Stage transitions (depends on batches, propagules)
    if (backup.data.stageTransitions?.length) {
      const transitions = backup.data.stageTransitions.map(convertDates);
      await propDb.stageTransitions.bulkAdd(transitions.map(stripId));
      imported.stageTransitions = transitions.length;
    }

    // 9. Graduations (depends on batches, propagules)
    if (backup.data.graduations?.length) {
      const graduations = backup.data.graduations.map(convertDates);
      await propDb.graduations.bulkAdd(graduations.map(stripId));
      imported.graduations = graduations.length;
    }

    // 10. Batch costs (depends on batches, supplies)
    if (backup.data.batchCosts?.length) {
      const costs = backup.data.batchCosts.map(convertDates);
      await propDb.batchCosts.bulkAdd(costs.map(stripId));
      imported.batchCosts = costs.length;
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
 * Export batches as CSV for spreadsheet analysis.
 */
export async function exportBatchesAsCSV(): Promise<string> {
  const batches = await propDb.batches.toArray();

  // Get related data for enrichment
  const motherPlants = await propDb.motherPlants.toArray();
  const stations = await propDb.stations.toArray();

  // batch.motherPlantId / batch.stationId are foreign keys held as strings; the maps
  // must be keyed the same way. See src/lib/db/keys.ts.
  const motherPlantMap = new Map(motherPlants.map((m) => [toId(m.id!), m]));
  const stationMap = new Map(stations.map((s) => [toId(s.id!), s]));

  const headers = [
    'Batch Number',
    'Species',
    'Variety',
    'Method',
    'Stage',
    'Quantity Started',
    'Quantity Surviving',
    'Survival Rate (%)',
    'Date Taken',
    'Date Rooted',
    'Date Potted Up',
    'Date Hardening Started',
    'Date Ready',
    'Date Graduated',
    'Days Since Taken',
    'Station',
    'Mother Plant',
    'Rooting Medium',
    'Hormone Used',
    'Is Exploded',
    'Notes',
  ];

  const rows = batches.map((batch) => {
    const motherPlant = batch.motherPlantId
      ? motherPlantMap.get(batch.motherPlantId)
      : undefined;
    const station = stationMap.get(batch.stationId);

    const survivalRate =
      batch.quantityStarted > 0
        ? Math.round((batch.quantitySurviving / batch.quantityStarted) * 100)
        : 0;

    const daysSinceTaken = Math.floor(
      (Date.now() - new Date(batch.dateTaken).getTime()) / (1000 * 60 * 60 * 24)
    );

    return [
      batch.batchNumber,
      batch.species,
      batch.variety ?? '',
      formatMethod(batch.method),
      formatStage(batch.stage),
      batch.quantityStarted,
      batch.quantitySurviving,
      survivalRate,
      formatDateForCSV(batch.dateTaken),
      formatDateForCSV(batch.dateRooted),
      formatDateForCSV(batch.datePottedUp),
      formatDateForCSV(batch.dateHardeningStarted),
      formatDateForCSV(batch.dateReady),
      formatDateForCSV(batch.dateGraduated),
      daysSinceTaken,
      station?.name ?? '',
      motherPlant?.label ?? '',
      batch.rootingMedium ?? '',
      batch.hormoneUsed ?? '',
      batch.isExploded ? 'Yes' : 'No',
      escapeCSV(batch.preparationNotes ?? ''),
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Download batches CSV file.
 */
export async function downloadBatchesCSV(): Promise<void> {
  const csv = await exportBatchesAsCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paddock-batches-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// DATA MANAGEMENT
// ============================================

/**
 * Clear all propagation data from the database.
 */
export async function clearAllPropagationData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await propDb.batchCosts.clear();
    await propDb.graduations.clear();
    await propDb.stageTransitions.clear();
    await propDb.propagules.clear();
    await propDb.batches.clear();
    await propDb.motherPlants.clear();
    await propDb.stationLogs.clear();
    await propDb.stations.clear();
    await propDb.supplies.clear();
    await propDb.speciesConfigs.clear();
  });
}

/**
 * Get propagation database statistics.
 */
export async function getPropagationStats(): Promise<Record<string, number>> {
  return {
    motherPlants: await propDb.motherPlants.count(),
    stations: await propDb.stations.count(),
    stationLogs: await propDb.stationLogs.count(),
    batches: await propDb.batches.count(),
    propagules: await propDb.propagules.count(),
    stageTransitions: await propDb.stageTransitions.count(),
    graduations: await propDb.graduations.count(),
    supplies: await propDb.supplies.count(),
    batchCosts: await propDb.batchCosts.count(),
    speciesConfigs: await propDb.speciesConfigs.count(),
  };
}

/**
 * Get raw propagation data for debug view.
 */
export async function getPropagationRawData(): Promise<PropagationBackup['data']> {
  return {
    motherPlants: await propDb.motherPlants.toArray(),
    stations: await propDb.stations.toArray(),
    stationLogs: await propDb.stationLogs.toArray(),
    batches: await propDb.batches.toArray(),
    propagules: await propDb.propagules.toArray(),
    stageTransitions: await propDb.stageTransitions.toArray(),
    graduations: await propDb.graduations.toArray(),
    supplies: await propDb.supplies.toArray(),
    batchCosts: await propDb.batchCosts.toArray(),
    speciesConfigs: await propDb.speciesConfigs.toArray(),
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a date for CSV output.
 */
function formatDateForCSV(date?: Date): string {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines).
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Strip the id field from an object for import.
 */
function stripId<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _, ...rest } = obj;
  return rest as Omit<T, 'id'>;
}

/**
 * Convert ISO date strings back to Date objects.
 */
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

/**
 * Check if a string looks like an ISO date string.
 */
function isISODateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

/**
 * Format propagation method for display.
 */
function formatMethod(method: string): string {
  return method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format propagation stage for display.
 */
function formatStage(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
