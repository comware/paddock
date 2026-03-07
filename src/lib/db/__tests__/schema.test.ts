/**
 * Database Schema Tests
 *
 * Tests for the PaddockDB Dexie schema, table definitions,
 * convenience exports, and index configuration.
 */

import { describe, it, expect } from 'vitest';
import { db, growDb, platformDb, propDb, plannerDb } from '../schema';
import Dexie from 'dexie';

// Also import aiDb from schema (exported there but re-exported via index)
import { aiDb } from '../schema';

describe('PaddockDB Schema', () => {
  it('should be a Dexie instance', () => {
    expect(db).toBeInstanceOf(Dexie);
    expect(db.name).toBe('Paddock');
  });

  it('should be at schema version 9', () => {
    expect(db.verno).toBe(9);
  });

  it('should have all 21 expected tables', () => {
    const tableNames = db.tables.map((t) => t.name).sort();
    const expectedTables = [
      // Grow module (11 tables)
      'growSites',
      'growWeatherHistory',
      'growTrays',
      'growObservations',
      'growTimeEntries',
      'growVarietyConfigs',
      'growMediumConfigs',
      'growTrayComments',
      'growExperiments',
      'growDecisions',
      'growPlannedPlantings',
      // AI module (2 tables)
      'aiConversations',
      'aiMessages',
      // Platform (1 table)
      'platformSettings',
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
    ].sort();

    expect(tableNames).toEqual(expectedTables);
    expect(tableNames).toHaveLength(25);
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
    expect(growDb.sites).toBe(db.growSites);
    expect(growDb.weatherHistory).toBe(db.growWeatherHistory);
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
