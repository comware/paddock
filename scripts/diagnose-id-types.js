/**
 * Read-only diagnostic: what type are the ids and foreign keys in YOUR database?
 *
 * Paddock declares every store `++id`, so primary keys are numbers. But most stores
 * stringify ids when adding a row, and a foreign key is a stored VALUE rather than a key -
 * so a row written in one session can hold a string FK while its neighbours hold numbers.
 * A later `.where('siteId').equals(42)` then silently misses it.
 *
 * Whether that has actually happened in your database is a question about your data, not
 * your code. This answers it. Nothing here writes, deletes, or migrates anything - it opens
 * the database read-only and counts.
 *
 * HOW TO RUN
 *   1. Open Paddock in the browser (the real one, with your data in it).
 *   2. Open DevTools -> Console.
 *   3. Paste this whole file and press Enter.
 *   4. Copy the printed report.
 *
 * If it reports zero string-typed values, the repair migration that was going to be
 * written is unnecessary and should not be written.
 */

(async () => {
  const DB_NAME = 'Paddock';

  // Columns that hold a reference to another row's primary key. Kept explicit rather than
  // inferred from names, so a field that merely ends in "Id" without being a foreign key
  // does not get counted.
  const FOREIGN_KEYS = {
    weatherHistory: ['siteId'],
    growWeatherHistory: ['siteId'],
    growTrays: ['siteId'],
    growObservations: ['siteId'],
    growTimeEntries: ['siteId'],
    growPlannedPlantings: ['siteId', 'convertedTrayId'],
    growTrayComments: ['trayId'],
    aiMessages: ['conversationId'],
    plannerEvents: ['siteId', 'trayId', 'batchId'],
    propMotherPlants: ['siteId'],
    propStations: ['siteId'],
    propStationLogs: ['stationId'],
    propBatches: ['siteId', 'stationId', 'motherPlantId'],
    propPropagules: ['batchId', 'siteId', 'stationId'],
    propStageTransitions: ['batchId', 'propaguleId'],
    propGraduations: ['batchId', 'propaguleId'],
    propBatchCosts: ['batchId', 'supplyId'],
  };

  const db = await new Promise((resolve, reject) => {
    // No version argument: opens at whatever version exists and never triggers an upgrade.
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => reject(new Error('Database absent - open Paddock first.'));
  });

  const storeNames = [...db.objectStoreNames];
  const readAll = (name) =>
    new Promise((resolve, reject) => {
      const req = db.transaction(name, 'readonly').objectStore(name).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const typeOf = (v) =>
    v === undefined ? 'absent' : v === null ? 'null' : typeof v;

  const primaryKeys = [];
  const foreignKeys = [];
  let mixedColumns = 0;
  let stringValues = 0;

  for (const name of storeNames) {
    const rows = await readAll(name);
    if (rows.length === 0) continue;

    // Primary keys. These are what `update(key)` and `delete(key)` must match.
    const pkTypes = {};
    for (const row of rows) pkTypes[typeOf(row.id)] = (pkTypes[typeOf(row.id)] || 0) + 1;
    primaryKeys.push({ table: name, rows: rows.length, ...pkTypes });
    if (pkTypes.string) stringValues += pkTypes.string;

    // Foreign keys.
    for (const col of FOREIGN_KEYS[name] || []) {
      const counts = {};
      for (const row of rows) counts[typeOf(row[col])] = (counts[typeOf(row[col])] || 0) + 1;
      const present = Object.keys(counts).filter((k) => k !== 'absent' && k !== 'null');
      const mixed = present.length > 1;
      if (mixed) mixedColumns++;
      if (counts.string) stringValues += counts.string;
      foreignKeys.push({
        table: name,
        column: col,
        rows: rows.length,
        number: counts.number || 0,
        string: counts.string || 0,
        missing: (counts.absent || 0) + (counts.null || 0),
        MIXED: mixed ? 'YES' : '',
      });
    }
  }

  db.close();

  console.log('%cPaddock id-type diagnostic', 'font-weight:bold;font-size:14px');
  console.log(`Database "${DB_NAME}", ${storeNames.length} stores, read-only. Nothing was modified.\n`);

  console.log('%cPrimary keys', 'font-weight:bold');
  console.table(primaryKeys);

  console.log('%cForeign keys', 'font-weight:bold');
  console.table(foreignKeys.filter((r) => r.rows > 0));

  console.log('%cVerdict', 'font-weight:bold');
  if (stringValues === 0) {
    console.log(
      '%cClean. Every id and foreign key is numeric.',
      'color:green;font-weight:bold'
    );
    console.log('No repair migration is needed. The code fix alone prevents future pollution.');
  } else {
    console.log(
      `%c${stringValues} string-typed value(s) found across ${mixedColumns} mixed column(s).`,
      'color:orange;font-weight:bold'
    );
    console.log('A repair migration IS needed. Paste the two tables above back to Claude -');
    console.log('which columns are affected determines what it has to convert.');
  }

  return { primaryKeys, foreignKeys, stringValues, mixedColumns };
})();
