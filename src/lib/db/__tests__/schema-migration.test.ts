/**
 * Exercises the REAL migration chain declared in `../schema.ts`.
 *
 * Every test in `migrations.test.ts` builds its own throwaway Dexie database and retypes
 * the upgrade logic inline (copyTableRows calls, field backfills). That proves the Dexie
 * upgrade machinery and copyTableRows itself work, but it does NOT prove that schema.ts's
 * own version(11)/version(12)/version(13) upgrade bodies are correct. A typo inside
 * schema.ts - e.g. `copyTableRows(tx, 'growSiteX', 'sites')` - would pass every existing
 * test while silently destroying every user's sites on upgrade.
 *
 * This test seeds a real version-10 'Paddock' database (the pre-extraction shape), then
 * imports schema.ts fresh so that opening its `db` singleton runs the actual 11 -> 12 -> 13
 * upgrade chain against that data.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import type { GrowSite, GrowWeatherHistory, GrowTimeEntry } from '../schema';

// Mirrors schema.ts's version(1) through version(10) store declarations exactly, so a
// fresh Dexie('Paddock') opened at version 10 reconciles to the same shape schema.ts's
// own upgrade chain expects to find when it takes over from version 11 onward.
function declareV10Schema(db: Dexie) {
  db.version(1).stores({
    growTrays: '++id, trayNumber, variety, dateSown, dateHarvested, createdAt',
    growObservations: '++id, &date, week',
    growTimeEntries: '++id, date, week',
    growVarietyConfigs: '++id, &name',
    growExperiments: '++id',
    growDecisions: '++id, completedDate',
    platformSettings: '++id, &key',
  });

  db.version(2).stores({
    growMediumConfigs: '++id, &value',
  });

  db.version(3).stores({
    growTrayComments: '++id, trayId, createdAt',
  });

  db.version(4).stores({
    growSites: '++id, &name, isDefault',
    growWeatherHistory: '++id, siteId, date, [siteId+date]',
    growTrays: '++id, trayNumber, variety, dateSown, dateHarvested, siteId, createdAt',
    growObservations: '++id, date, week, siteId, [siteId+date]',
  });

  db.version(5).stores({
    growTimeEntries: '++id, date, week, siteId, [siteId+date]',
  });

  db.version(6).stores({
    growPlannedPlantings:
      '++id, siteId, variety, plannedSowDate, status, [siteId+plannedSowDate]',
  });

  db.version(7).stores({
    aiConversations: '++id, title, model, lastMessageAt, createdAt',
    aiMessages: '++id, conversationId, role, createdAt',
  });

  db.version(8).stores({
    propMotherPlants: '++id, siteId, species, variety, status, [siteId+status], [siteId+species]',
    propStations: '++id, siteId, name, type, isActive, [siteId+isActive]',
    propStationLogs: '++id, stationId, date, [stationId+date]',
    propBatches:
      '++id, batchNumber, siteId, stationId, species, variety, stage, dateTaken, motherPlantId, isExploded, [siteId+stage], [stationId+stage], [species+stage], [motherPlantId+stage]',
    propPropagules: '++id, batchId, propaguleNumber, siteId, stationId, species, stage, [batchId+stage], [siteId+stage]',
    propStageTransitions:
      '++id, batchId, propaguleId, toStage, transitionDate, [batchId+transitionDate], [propaguleId+transitionDate]',
    propGraduations: '++id, batchId, propaguleId, outcome, graduationDate, [outcome+graduationDate], [batchId+outcome]',
    propSupplies: '++id, name, category, [category+name]',
    propBatchCosts: '++id, batchId, supplyId, [batchId+supplyId]',
    propSpeciesConfigs: '++id, &species',
  });

  db.version(9).stores({
    plannerEvents:
      '++id, siteId, scheduledDate, status, eventType, trayId, batchId, [siteId+scheduledDate], [siteId+status], [siteId+eventType]',
  });

  db.version(10).stores({
    growPlannedPlantings:
      '++id, siteId, variety, plannedSowDate, status, proposalId, [siteId+plannedSowDate], [proposalId+status]',
  });
}

describe('the real migration chain in schema.ts', () => {
  afterEach(async () => {
    vi.resetModules();
    await Dexie.delete('Paddock');
  });

  it('upgrades a version 10 database and carries its data through the real 11-12-13 chain', async () => {
    // 1. Build a real v10 'Paddock' database with the pre-extraction tables and seed it.
    const seedDb = new Dexie('Paddock');
    declareV10Schema(seedDb);
    await seedDb.open();

    // A specific, non-sequential id: growTrays.siteId, propMotherPlants.siteId,
    // propStations.siteId, and plannerEvents.siteId all point at rows in `sites` by id,
    // so a copy that renumbers rows detaches every reference. 42 is chosen precisely
    // because it is not "the next id a fresh autoincrement counter would assign".
    await seedDb.table('growSites').add({
      id: 42,
      name: 'Home Greenhouse',
      latitude: -33.87,
      longitude: 151.21,
      timezone: 'Australia/Sydney',
      isDefault: true,
      isIndoor: false,
      weatherEnabled: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    await seedDb.table('growWeatherHistory').add({
      id: 7,
      siteId: 42,
      date: new Date('2024-06-01'),
      temperature: 18.5,
      humidity: 62,
      conditions: 'Clear',
      source: 'api',
      fetchedAt: new Date('2024-06-01'),
      createdAt: new Date('2024-06-01'),
    });

    await seedDb.table('growTimeEntries').add({
      id: 3,
      siteId: 42,
      date: new Date('2024-06-01'),
      week: 1,
      wateringChecking: 15,
      sowing: 20,
      harvesting: 30,
      packaging: 10,
      cleanup: 5,
      researchLearning: 0,
      other: 0,
      notes: 'seeded v10 row',
      createdAt: new Date('2024-06-01'),
      updatedAt: new Date('2024-06-01'),
    });

    // 2. Close it - the real schema.ts db needs exclusive access to run its upgrade.
    seedDb.close();

    // 3. Reset modules and import schema.ts fresh, so its `db` singleton is constructed
    // now (declaring versions 1-13) rather than at this test file's top-level import time.
    vi.resetModules();
    const { db } = await import('../schema');

    // 4. Opening it runs schema.ts's OWN version(11) copy, version(12) drop, and
    // version(13) backfill - the real upgrade bodies, not a reimplementation of them.
    await db.open();

    // 5a. The site survived with its id intact.
    //
    // GrowSite.id is typed as `string`, but the actual store definition is '++id' (a
    // numeric autoincrement key) - an existing mismatch elsewhere in the codebase, not
    // something this test should paper over. Query by the untyped raw table so the
    // real runtime key type (number) round-trips without a cast fighting the compiler.
    const rawSites = db.table<GrowSite>('sites');
    const site = await rawSites.where('id').equals(42).first();
    expect(site).toBeDefined();
    expect(site?.id).toBe(42);
    expect(site?.name).toBe('Home Greenhouse');

    // 5b. The weather row survived with its siteId intact.
    const rawWeatherHistory = db.table<GrowWeatherHistory>('weatherHistory');
    const weatherRows = await rawWeatherHistory.where('siteId').equals(42).toArray();
    expect(weatherRows).toHaveLength(1);
    expect(weatherRows[0].siteId).toBe(42);
    expect(weatherRows[0].temperature).toBe(18.5);

    // 5c. growSites and growWeatherHistory are gone.
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).not.toContain('growSites');
    expect(tableNames).not.toContain('growWeatherHistory');

    // 5d. The time entry is tagged microgreens by the version(13) backfill, with its
    // minute values unchanged.
    const rawTimeEntries = db.table<GrowTimeEntry>('growTimeEntries');
    const timeEntry = await rawTimeEntries.where('id').equals(3).first();
    expect(timeEntry).toBeDefined();
    expect(timeEntry?.enterprise).toBe('microgreens');
    expect(timeEntry?.wateringChecking).toBe(15);
    expect(timeEntry?.sowing).toBe(20);
    expect(timeEntry?.harvesting).toBe(30);
    expect(timeEntry?.packaging).toBe(10);
    expect(timeEntry?.cleanup).toBe(5);

    db.close();
  });
});
