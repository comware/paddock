/**
 * Read-only diagnostic: what type are the ids and foreign keys in YOUR database?
 *
 * Paddock's settled convention: PRIMARY KEYS are numbers (every store is `++id`), and
 * FOREIGN KEYS are strings, because they are compared in memory against state ids, which
 * are strings above the database boundary. See src/lib/db/keys.ts.
 *
 * A foreign key is a stored VALUE rather than a key, written from whatever the caller held
 * at the time. Before the boundary existed that was a number for a row loaded from the
 * database and a string for one added in the same session - so a column can hold BOTH, and
 * a later `.where('siteId').equals(x)` silently misses whichever form x is not.
 *
 * So a string foreign key is CORRECT. What this looks for is a column holding a MIX.
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
 * If no column is MIXED, the repair migration that was going to be written is unnecessary
 * and should not be written - `fkMatch` can be simplified away instead.
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
  let nonNumericPrimaryKeys = 0;

  for (const name of storeNames) {
    const rows = await readAll(name);
    if (rows.length === 0) continue;

    // Primary keys. These are what `update(key)` and `delete(key)` must match.
    const pkTypes = {};
    for (const row of rows) pkTypes[typeOf(row.id)] = (pkTypes[typeOf(row.id)] || 0) + 1;
    primaryKeys.push({ table: name, rows: rows.length, ...pkTypes });
    // A primary key should always be a number - the stores are `++id`.
    if (pkTypes.string) nonNumericPrimaryKeys += pkTypes.string;

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
  console.log(
    'Expected: primary keys all number, foreign keys all string, no column holding both.\n'
  );

  if (nonNumericPrimaryKeys > 0) {
    console.log(
      `%c${nonNumericPrimaryKeys} primary key(s) are not numbers. That is unexpected - report it.`,
      'color:red;font-weight:bold'
    );
  }

  if (mixedColumns === 0) {
    console.log(
      '%cClean. No foreign-key column holds both forms.',
      'color:green;font-weight:bold'
    );
    console.log('No repair migration is needed, and the fkMatch tolerance in the stores can');
    console.log('be simplified to a plain .equals() - grep for fkMatch to find the call sites.');
  } else {
    console.log(
      `%c${mixedColumns} foreign-key column(s) hold BOTH numbers and strings.`,
      'color:orange;font-weight:bold'
    );
    console.log('Those rows are only reachable because the stores query with fkMatch, which');
    console.log('tolerates both. A repair migration would normalise them to strings and let');
    console.log('that tolerance go. Paste the foreign-key table above back to Claude.');
  }

  return { primaryKeys, foreignKeys, stringValues, mixedColumns, nonNumericPrimaryKeys };
})();
