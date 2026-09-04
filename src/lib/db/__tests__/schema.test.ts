/**
 * Database Schema Tests
 *
 * Tests for the PaddockDB Dexie schema, table definitions,
 * convenience exports, and index configuration.
 */

import { describe, it, expect } from 'vitest';
import { db, growDb, platformDb, propDb, plannerDb, vegDb } from '../schema';
import Dexie from 'dexie';

// Also import aiDb from schema (exported there but re-exported via index)
import { aiDb } from '../schema';

describe('PaddockDB Schema', () => {
  it('should be a Dexie instance', () => {
    expect(db).toBeInstanceOf(Dexie);
    expect(db.name).toBe('Paddock');
  });

  it('should be at schema version 12', () => {
    expect(db.verno).toBe(13);
  });

  it('should have all 30 expected tables', () => {
    const tableNames = db.tables.map((t) => t.name).sort();
    const expectedTables = [
      // Grow module (11 tables)
      'growTrays',
      'growObservations',
      'growTimeEntries',
      'growVarietyConfigs',
      'growMediumConfigs',
      'growTrayComments',
      'growExperiments',
      'growDecisions',
      'growPlannedPlantings',
      'growSites',
      'growWeatherHistory',
      // AI module (2 tables)
      'aiConversations',
      'aiMessages',
      // Platform (3 tables)
      'platformSettings',
      'sites',
      'weatherHistory',
      // Planner (1 table)
      'plannerEvents',
      // Propagation module (10 tables)
      'propMotherPlants',
      'propStations',
      'propStationLogs',
      'propBatches',
      'propPropagules',
      'propStageTransitions',
      'propGraduations',
      'propSupplies',
      'propBatchCosts',
      'propSpeciesConfigs',
      // Vegetables module (3 tables)
      'vegBeds',
      'vegPlantings',
      'vegHarvests',
    ].sort();

    expect(tableNames).toEqual(expectedTables);
    expect(tableNames).toHaveLength(30);
  });

  it('should have compound indexes on propBatches for common query patterns', () => {
    const batchesTable = db.tables.find((t) => t.name === 'propBatches');
    expect(batchesTable).toBeDefined();

    // Get all index key paths (including compound indexes)
    const indexKeyPaths = batchesTable!.schema.indexes.map((idx) => idx.keyPath);

    // Verify key compound indexes exist
    // [siteId+stage] for dashboard queries
    expect(indexKeyPaths).toContainEqual(['siteId', 'stage']);
    // [stationId+stage] for station view
    expect(indexKeyPaths).toContainEqual(['stationId', 'stage']);
    // [species+stage] for analytics
    expect(indexKeyPaths).toContainEqual(['species', 'stage']);
    // [motherPlantId+stage] for mother plant detail
    expect(indexKeyPaths).toContainEqual(['motherPlantId', 'stage']);
  });

  it('should have compound indexes on plannerEvents', () => {
    const eventsTable = db.tables.find((t) => t.name === 'plannerEvents');
    expect(eventsTable).toBeDefined();

    const indexKeyPaths = eventsTable!.schema.indexes.map((idx) => idx.keyPath);

    // [siteId+scheduledDate] for calendar queries
    expect(indexKeyPaths).toContainEqual(['siteId', 'scheduledDate']);
    // [siteId+status] for dashboard pending events
    expect(indexKeyPaths).toContainEqual(['siteId', 'status']);
    // [siteId+eventType] for type filtering
    expect(indexKeyPaths).toContainEqual(['siteId', 'eventType']);
  });

  it('should have unique indexes where required', () => {
    // growVarietyConfigs should have unique name
    const varietyTable = db.tables.find((t) => t.name === 'growVarietyConfigs');
    const nameIndex = varietyTable!.schema.indexes.find(
      (idx) => idx.keyPath === 'name'
    );
    expect(nameIndex).toBeDefined();
    expect(nameIndex!.unique).toBe(true);

    // platformSettings should have unique key
    const settingsTable = db.tables.find((t) => t.name === 'platformSettings');
    const keyIndex = settingsTable!.schema.indexes.find(
      (idx) => idx.keyPath === 'key'
    );
    expect(keyIndex).toBeDefined();
    expect(keyIndex!.unique).toBe(true);

    // propSpeciesConfigs should have unique species
    const speciesTable = db.tables.find((t) => t.name === 'propSpeciesConfigs');
    const speciesIndex = speciesTable!.schema.indexes.find(
      (idx) => idx.keyPath === 'species'
    );
    expect(speciesIndex).toBeDefined();
    expect(speciesIndex!.unique).toBe(true);
  });

  it('should have auto-incrementing primary keys on all tables', () => {
    for (const table of db.tables) {
      expect(table.schema.primKey.auto).toBe(true);
    }
  });
});

describe('Convenience Exports', () => {
  it('should export growDb with correct table references', () => {
    // sites/weatherHistory used to be deprecated aliases on growDb; they now live only
    // on platformDb, so growDb should not carry them at all.
    expect(growDb).not.toHaveProperty('sites');
    expect(growDb).not.toHaveProperty('weatherHistory');
    expect(growDb.trays).toBe(db.growTrays);
    expect(growDb.observations).toBe(db.growObservations);
    expect(growDb.timeEntries).toBe(db.growTimeEntries);
    expect(growDb.varietyConfigs).toBe(db.growVarietyConfigs);
    expect(growDb.mediumConfigs).toBe(db.growMediumConfigs);
    expect(growDb.trayComments).toBe(db.growTrayComments);
    expect(growDb.experiments).toBe(db.growExperiments);
    expect(growDb.decisions).toBe(db.growDecisions);
    expect(growDb.plannedPlantings).toBe(db.growPlannedPlantings);
  });

  it('should export platformDb with settings table', () => {
    expect(platformDb.settings).toBe(db.platformSettings);
  });

  it('should export aiDb with conversations and messages tables', () => {
    expect(aiDb.conversations).toBe(db.aiConversations);
    expect(aiDb.messages).toBe(db.aiMessages);
  });

  it('should export propDb with all propagation tables', () => {
    expect(propDb.motherPlants).toBe(db.propMotherPlants);
    expect(propDb.stations).toBe(db.propStations);
    expect(propDb.stationLogs).toBe(db.propStationLogs);
    expect(propDb.batches).toBe(db.propBatches);
    expect(propDb.propagules).toBe(db.propPropagules);
    expect(propDb.stageTransitions).toBe(db.propStageTransitions);
    expect(propDb.graduations).toBe(db.propGraduations);
    expect(propDb.supplies).toBe(db.propSupplies);
    expect(propDb.batchCosts).toBe(db.propBatchCosts);
    expect(propDb.speciesConfigs).toBe(db.propSpeciesConfigs);
  });

  it('should export plannerDb with events table', () => {
    expect(plannerDb.events).toBe(db.plannerEvents);
  });
});

describe('version 11 platform extraction', () => {
  it('is at schema version 12', () => {
    expect(db.verno).toBe(13);
  });

  it('exposes sites and weatherHistory as tables', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('sites');
    expect(names).toContain('weatherHistory');
  });

  it('keeps the originals so a bad copy stays recoverable', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('growSites');
    expect(names).toContain('growWeatherHistory');
  });
});

describe('platform facade', () => {
  it('exposes sites and weather on platformDb', () => {
    expect(platformDb.sites.name).toBe('sites');
    expect(platformDb.weatherHistory.name).toBe('weatherHistory');
  });

  it('no longer carries the deprecated growDb.sites/weatherHistory aliases', () => {
    // The rename finished touching every call site, so the aliases are gone: platformDb
    // is the only way in now.
    expect(growDb).not.toHaveProperty('sites');
    expect(growDb).not.toHaveProperty('weatherHistory');
    expect(platformDb.sites.name).toBe('sites');
    expect(platformDb.weatherHistory.name).toBe('weatherHistory');
  });
});

describe('version 13 vegetables', () => {
  it('is at schema version 13', () => {
    expect(db.verno).toBe(13);
  });

  it('exposes the three vegetable tables', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('vegBeds');
    expect(names).toContain('vegPlantings');
    expect(names).toContain('vegHarvests');
  });

  it('indexes a planting by bed and sow date, so rotation history is a query', () => {
    // Beds stay thin precisely because "what was in bed 3 last season" is derivable.
    const indexes = db.table('vegPlantings').schema.indexes.map((i) => i.name);
    expect(indexes).toContain('[bedId+dateSown]');
  });

  it('exposes vegDb', () => {
    expect(vegDb.beds.name).toBe('vegBeds');
    expect(vegDb.plantings.name).toBe('vegPlantings');
    expect(vegDb.harvests.name).toBe('vegHarvests');
  });
});
