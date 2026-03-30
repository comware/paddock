/**
 * Unified Data Export/Import Utilities
 *
 * Combines Grow and Propagation module data into a single backup file.
 * This provides a complete Paddock backup for data durability.
 */

import { format } from 'date-fns';
import { db, growDb, propDb } from '@/lib/db';
import type {
  GrowTray,
  GrowObservation,
  GrowTimeEntry,
  GrowVarietyConfig,
  GrowExperiment,
  GrowDecision,
} from '@/lib/db';
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
} from '@/modules/propagation/types';

// ============================================
// TYPES
// ============================================

/**
 * Unified backup format combining Grow and Propagation modules.
 */
export interface UnifiedPaddockBackup {
  version: number;
  exportedAt: string;
  modules: ['grow', 'propagation'];
  grow: {
    trays: GrowTray[];
    observations: GrowObservation[];
    timeEntries: GrowTimeEntry[];
    varietyConfigs: GrowVarietyConfig[];
    experiments: GrowExperiment[];
    decisions: GrowDecision[];
  };
  propagation: {
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

// ============================================
// UNIFIED EXPORT
// ============================================

/**
 * Export all Paddock data (Grow + Propagation) as unified JSON backup.
 */
export async function exportUnifiedBackup(): Promise<string> {
  const backup: UnifiedPaddockBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    modules: ['grow', 'propagation'],
    grow: {
      trays: await growDb.trays.toArray(),
      observations: await growDb.observations.toArray(),
      timeEntries: await growDb.timeEntries.toArray(),
      varietyConfigs: await growDb.varietyConfigs.toArray(),
      experiments: await growDb.experiments.toArray(),
      decisions: await growDb.decisions.toArray(),
    },
    propagation: {
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
 * Download unified JSON backup file containing all Paddock data.
 */
export async function downloadUnifiedBackup(): Promise<void> {
  const json = await exportUnifiedBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paddock-full-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// UNIFIED IMPORT
// ============================================

/**
 * Import unified backup file (Grow + Propagation).
 * Restores both modules from a single file.
 */
export async function importUnifiedBackup(
  jsonString: string,
  options: { merge?: boolean } = {}
): Promise<{ imported: Record<string, number>; errors: string[] }> {
  const errors: string[] = [];
  const imported: Record<string, number> = {};

  try {
    const backup = JSON.parse(jsonString);

    // Check if this is a unified backup
    if (!backup.modules || !backup.modules.includes('grow') || !backup.modules.includes('propagation')) {
      throw new Error('Invalid unified backup format. Expected both grow and propagation modules.');
    }

    // Clear existing data if not merging
    if (!options.merge) {
      await clearAllUnifiedData();
    }

    // Import Grow module data
    if (backup.grow) {
      if (backup.grow.trays?.length) {
        const trays = backup.grow.trays.map(convertDates);
        await growDb.trays.bulkAdd(trays.map(stripIds));
        imported.trays = trays.length;
      }
      if (backup.grow.observations?.length) {
        const observations = backup.grow.observations.map(convertDates);
        await growDb.observations.bulkAdd(observations.map(stripIds));
        imported.observations = observations.length;
      }
      if (backup.grow.timeEntries?.length) {
        const timeEntries = backup.grow.timeEntries.map(convertDates);
        await growDb.timeEntries.bulkAdd(timeEntries.map(stripIds));
        imported.timeEntries = timeEntries.length;
      }
      if (backup.grow.varietyConfigs?.length) {
        await growDb.varietyConfigs.bulkAdd(backup.grow.varietyConfigs.map(stripIds));
        imported.varietyConfigs = backup.grow.varietyConfigs.length;
      }
      if (backup.grow.experiments?.length) {
        const experiments = backup.grow.experiments.map(convertDates);
        await growDb.experiments.bulkAdd(experiments.map(stripIds));
        imported.experiments = experiments.length;
      }
      if (backup.grow.decisions?.length) {
        const decisions = backup.grow.decisions.map(convertDates);
        await growDb.decisions.bulkAdd(decisions.map(stripIds));
        imported.decisions = decisions.length;
      }
    }

    // Import Propagation module data (order matters for foreign keys)
    if (backup.propagation) {
      if (backup.propagation.speciesConfigs?.length) {
        const configs = backup.propagation.speciesConfigs.map(convertDates);
        await propDb.speciesConfigs.bulkAdd(configs.map(stripIds));
        imported.propSpeciesConfigs = configs.length;
      }
      if (backup.propagation.supplies?.length) {
        const supplies = backup.propagation.supplies.map(convertDates);
        await propDb.supplies.bulkAdd(supplies.map(stripIds));
        imported.supplies = supplies.length;
      }
      if (backup.propagation.stations?.length) {
        const stations = backup.propagation.stations.map(convertDates);
        await propDb.stations.bulkAdd(stations.map(stripIds));
        imported.stations = stations.length;
      }
      if (backup.propagation.stationLogs?.length) {
        const logs = backup.propagation.stationLogs.map(convertDates);
        await propDb.stationLogs.bulkAdd(logs.map(stripIds));
        imported.stationLogs = logs.length;
      }
      if (backup.propagation.motherPlants?.length) {
        const plants = backup.propagation.motherPlants.map(convertDates);
        await propDb.motherPlants.bulkAdd(plants.map(stripIds));
        imported.motherPlants = plants.length;
      }
      if (backup.propagation.batches?.length) {
        const batches = backup.propagation.batches.map(convertDates);
        await propDb.batches.bulkAdd(batches.map(stripIds));
        imported.batches = batches.length;
      }
      if (backup.propagation.propagules?.length) {
        const propagules = backup.propagation.propagules.map(convertDates);
        await propDb.propagules.bulkAdd(propagules.map(stripIds));
        imported.propagules = propagules.length;
      }
      if (backup.propagation.stageTransitions?.length) {
        const transitions = backup.propagation.stageTransitions.map(convertDates);
        await propDb.stageTransitions.bulkAdd(transitions.map(stripIds));
        imported.stageTransitions = transitions.length;
      }
      if (backup.propagation.graduations?.length) {
        const graduations = backup.propagation.graduations.map(convertDates);
        await propDb.graduations.bulkAdd(graduations.map(stripIds));
        imported.graduations = graduations.length;
      }
      if (backup.propagation.batchCosts?.length) {
        const costs = backup.propagation.batchCosts.map(convertDates);
        await propDb.batchCosts.bulkAdd(costs.map(stripIds));
        imported.batchCosts = costs.length;
      }
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  return { imported, errors };
}

// ============================================
// CLEAR ALL DATA
// ============================================

/**
 * Clear all data from both Grow and Propagation modules.
 */
export async function clearAllUnifiedData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    // Clear Grow module
    await growDb.trays.clear();
    await growDb.observations.clear();
    await growDb.timeEntries.clear();
    await growDb.varietyConfigs.clear();
    await growDb.experiments.clear();
    await growDb.decisions.clear();

    // Clear Propagation module
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

// ============================================
// STATISTICS
// ============================================

/**
 * Get unified database statistics.
 */
export async function getUnifiedDatabaseStats(): Promise<{
  grow: Record<string, number>;
  propagation: Record<string, number>;
  total: number;
}> {
  const grow = {
    trays: await growDb.trays.count(),
    observations: await growDb.observations.count(),
    timeEntries: await growDb.timeEntries.count(),
    varietyConfigs: await growDb.varietyConfigs.count(),
    experiments: await growDb.experiments.count(),
    decisions: await growDb.decisions.count(),
  };

  const propagation = {
    motherPlants: await propDb.motherPlants.count(),
    stations: await propDb.stations.count(),
    batches: await propDb.batches.count(),
    propagules: await propDb.propagules.count(),
    graduations: await propDb.graduations.count(),
    supplies: await propDb.supplies.count(),
    batchCosts: await propDb.batchCosts.count(),
  };

  const growTotal = Object.values(grow).reduce((a, b) => a + b, 0);
  const propTotal = Object.values(propagation).reduce((a, b) => a + b, 0);

  return {
    grow,
    propagation,
    total: growTotal + propTotal,
  };
}

// ============================================
// HELPERS
// ============================================

function stripIds<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
