/**
 * BedList - rendered against the REAL BedForm, BedCard, useBeds/usePlantings stores, and a
 * real (fake-indexeddb) database. Assertions that touch persistence read back out of
 * vegDb/platformDb, never out of store state - see useBeds.test.ts for why that discipline
 * matters here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, vegDb, platformDb, type VegPlanting } from '@/lib/db';
import { useBeds } from '../../../stores/useBeds';
import { usePlantings } from '../../../stores/usePlantings';
import { useSites } from '@/platform';
import { BedList } from '../BedList';

async function seedActiveSite(name = 'Home Site') {
  const now = new Date();
  const id = await platformDb.sites.add({
    name,
    latitude: 0,
    longitude: 0,
    timezone: 'Australia/Sydney',
    isDefault: true,
    isIndoor: false,
    weatherEnabled: false,
    createdAt: now,
    updatedAt: now,
  } as never);
  const siteId = String(id);
  useSites.setState({ sites: [], activeSiteId: null, isLoading: false, error: null });
  await useSites.getState().loadSites();
  useSites.getState().setActiveSite(siteId);
  return siteId;
}

function planting(siteId: string, bedId: string, overrides: Partial<VegPlanting> = {}): Omit<VegPlanting, 'id'> {
  return {
    siteId,
    bedId,
    crop: 'Carrots',
    method: 'direct_sown',
    status: 'growing',
    notes: '',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('BedList', () => {
  beforeEach(async () => {
    await db.open();
    await vegDb.beds.clear();
    await vegDb.plantings.clear();
    await platformDb.sites.clear();
    localStorage.clear();

    useBeds.setState({ beds: [], isLoading: false, error: null });
    usePlantings.setState({ plantings: [], isLoading: false, error: null });
    useSites.setState({ sites: [], activeSiteId: null, isLoading: false, error: null });
  });

  it('renders an EmptyState when there are no beds', async () => {
    await seedActiveSite();
    render(<BedList />);

    await waitFor(() => {
      expect(screen.getByText('No beds yet')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Add Bed' })).toBeInTheDocument();
  });

  it('renders a bed that exists in the database', async () => {
    const siteId = await seedActiveSite();
    await useBeds.getState().addBed({ siteId, name: 'Bed 3', isActive: true });

    render(<BedList />);

    await waitFor(() => {
      expect(screen.getByText('Bed 3')).toBeInTheDocument();
    });
  });

  it('adding a bed through the form persists it to the database', async () => {
    const siteId = await seedActiveSite();
    const user = userEvent.setup();

    render(<BedList />);

    await waitFor(() => {
      expect(screen.getByText('No beds yet')).toBeInTheDocument();
    });

    // Open the form from the empty state action.
    await user.click(screen.getByRole('button', { name: 'Add Bed' }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'North Bed');
    await user.click(within(dialog).getByRole('button', { name: 'Create Bed' }));

    // The card should now render for the new bed...
    await waitFor(() => {
      expect(screen.getByText('North Bed')).toBeInTheDocument();
    });

    // ...and it should actually be in the database, scoped to the active site.
    const stored = await vegDb.beds.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('North Bed');
    expect(stored[0].siteId).toBe(siteId);
  });

  it('deleting a bed that has a planting in it shows the refusal, and the bed survives', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Occupied Bed', isActive: true });
    await vegDb.plantings.add(planting(siteId, bedId) as VegPlanting);
    await usePlantings.getState().loadPlantings();

    const user = userEvent.setup();
    render(<BedList />);

    await waitFor(() => {
      expect(screen.getByText('Occupied Bed')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const confirmDialog = await screen.findByRole('dialog');
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    // The store's refusal message names how many plantings are in the way.
    await waitFor(() => {
      expect(screen.getByText(/1 planting still reference it/i)).toBeInTheDocument();
    });

    // The bed is still there - the UI must not pretend otherwise.
    expect(await vegDb.beds.count()).toBe(1);
    expect(screen.getByText('Occupied Bed')).toBeInTheDocument();
  });

  it('shows the count of plantings growing in a bed on its card', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Busy Bed', isActive: true });
    await vegDb.plantings.add(planting(siteId, bedId, { status: 'growing' }) as VegPlanting);
    await vegDb.plantings.add(planting(siteId, bedId, { status: 'harvesting' }) as VegPlanting);
    await vegDb.plantings.add(planting(siteId, bedId, { status: 'finished' }) as VegPlanting);
    await usePlantings.getState().loadPlantings();

    render(<BedList />);

    await waitFor(() => {
      expect(screen.getByText('Busy Bed')).toBeInTheDocument();
    });

    // Two plantings (growing + harvesting) count; the finished one does not.
    expect(screen.getByText('2 plantings growing')).toBeInTheDocument();
  });
});
