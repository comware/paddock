/**
 * The foreign-key-as-number bug, for batches filtered by station.
 *
 * Foreign keys are compared in memory against state ids, which `withId` makes strings.
 * Midway through the id-boundary rollout, `addBatch` briefly wrapped `stationId` in
 * `toKey(...)` to match the primary-key convention - which turns it into a number. Every
 * `b.stationId === station.id` comparison then fails, because `station.id` is a string. A
 * batch added in the same session would silently disappear from its station's batch list,
 * both before and after a reload (loadBatches also normalises stationId - see stripped
 * fields on read below - so the mismatch isn't fixed by reloading).
 *
 * Every assertion reads through the actual selectors used by the app - getBatchesByStation
 * and useStations' own filter of getActiveBatches() - not raw store state, so a regression
 * in either the write side or the comparison itself shows up here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, propDb } from '@/lib/db';
import { useStations } from '../useStations';
import { useBatches } from '../useBatches';

const station = () => ({
  siteId: 'site-1',
  name: 'Mist Bench A',
  type: 'mist_system' as const,
  capacity: 20,
  isIndoor: true,
  isActive: true,
});

const batch = (stationId: string) => ({
  siteId: 'site-1',
  stationId,
  species: 'Rosemary',
  method: 'cutting_softwood' as const,
  quantityStarted: 10,
  dateTaken: new Date('2026-01-01'),
  photoUrls: [],
});

describe('a batch appears under its station, in-session and after reload', () => {
  beforeEach(async () => {
    await db.open();
    await propDb.stations.clear();
    await propDb.batches.clear();
    useStations.setState({
      rawStations: [],
      stations: [],
      isLoading: false,
      error: null,
      filters: useStations.getState().filters,
    });
    useBatches.setState({
      rawBatches: [],
      batches: [],
      isLoading: false,
      error: null,
      filters: useBatches.getState().filters,
      sort: useBatches.getState().sort,
    });
  });

  it('shows a batch under its station without a reload', async () => {
    const stationId = await useStations.getState().addStation(station());
    await useBatches.getState().addBatch(batch(stationId));

    // The selector the app actually uses to filter batches by station.
    const batchesAtStation = useBatches.getState().getBatchesByStation(stationId);
    expect(batchesAtStation).toHaveLength(1);

    // The same in-memory comparison useStations.deleteStation guards against, exercised
    // directly - this is the exact shape that broke.
    const activeBatches = useBatches.getState().getActiveBatches();
    expect(activeBatches.filter((b) => b.stationId === stationId)).toHaveLength(1);
  });

  it('still shows the batch under its station after both stores reload', async () => {
    const stationId = await useStations.getState().addStation(station());
    await useBatches.getState().addBatch(batch(stationId));

    await useStations.getState().loadStations();
    await useBatches.getState().loadBatches();

    const reloadedStationId = useStations.getState().stations[0]?.id;
    expect(reloadedStationId).toBe(stationId);

    const batchesAtStation = useBatches.getState().getBatchesByStation(stationId);
    expect(batchesAtStation).toHaveLength(1);

    const activeBatches = useBatches.getState().getActiveBatches();
    expect(activeBatches.filter((b) => b.stationId === stationId)).toHaveLength(1);
  });
});
