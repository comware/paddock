/**
 * PlantingList - rendered against the REAL PlantingForm, PlantingCard, usePlantings/useBeds/
 * useHarvests stores, and a real (fake-indexeddb) database. Assertions that touch
 * persistence read back out of vegDb, never out of store state - see BedList.test.tsx for
 * why that discipline matters here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { db, vegDb, platformDb, type VegHarvest } from '@/lib/db';
import { useBeds } from '../../../stores/useBeds';
import { usePlantings } from '../../../stores/usePlantings';
import { useHarvests } from '../../../stores/useHarvests';
import { useSites } from '@/platform';
import { PlantingList } from '../PlantingList';

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

function renderList() {
  return render(
    <MemoryRouter>
      <PlantingList />
    </MemoryRouter>
  );
}

describe('PlantingList', () => {
  beforeEach(async () => {
    await db.open();
    await vegDb.beds.clear();
    await vegDb.plantings.clear();
    await vegDb.harvests.clear();
    await platformDb.sites.clear();
    localStorage.clear();

    useBeds.setState({ beds: [], isLoading: false, error: null });
    usePlantings.setState({ plantings: [], isLoading: false, error: null });
    useHarvests.setState({ harvests: [], isLoading: false, error: null, lastReopenedPlantingId: null });
    useSites.setState({ sites: [], activeSiteId: null, isLoading: false, error: null });
  });

  it('renders an EmptyState when there are no plantings', async () => {
    await seedActiveSite();
    renderList();

    await waitFor(() => {
      expect(screen.getByText('No plantings yet')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Add planting' })).toBeInTheDocument();
  });

  it('renders a planting that exists, showing its crop and bed name', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 3', isActive: true });
    await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Carrots',
      method: 'direct_sown',
      status: 'growing',
      notes: '',
    });

    renderList();

    const grid = await screen.findByTestId('planting-grid');
    await waitFor(() => {
      expect(within(grid).getByText('Carrots')).toBeInTheDocument();
    });
    expect(within(grid).getByText('Bed 3')).toBeInTheDocument();
  });

  it('adding a planting through the form persists it', async () => {
    const siteId = await seedActiveSite();
    await useBeds.getState().addBed({ siteId, name: 'North Bed', isActive: true });
    const user = userEvent.setup();

    renderList();

    await waitFor(() => {
      expect(screen.getByText('No plantings yet')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add planting' }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/crop/i), 'Lettuce');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^bed/i }), 'North Bed');
    await user.click(within(dialog).getByRole('button', { name: 'Create Planting' }));

    await waitFor(() => {
      expect(within(screen.getByTestId('planting-grid')).getByText('Lettuce')).toBeInTheDocument();
    });

    const stored = await vegDb.plantings.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].crop).toBe('Lettuce');
    expect(stored[0].siteId).toBe(siteId);
  });

  it('hides finished and failed plantings by default, and a filter reveals them', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 1', isActive: true });
    await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Kale',
      method: 'direct_sown',
      status: 'growing',
      notes: '',
    });
    await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Spinach',
      method: 'direct_sown',
      status: 'finished',
      notes: '',
    });
    await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Radish',
      method: 'direct_sown',
      status: 'failed',
      notes: '',
    });

    const user = userEvent.setup();
    renderList();

    let grid = await screen.findByTestId('planting-grid');
    await waitFor(() => {
      expect(within(grid).getByText('Kale')).toBeInTheDocument();
    });
    expect(within(grid).queryByText('Spinach')).not.toBeInTheDocument();
    expect(within(grid).queryByText('Radish')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^status/i), 'all');

    grid = await screen.findByTestId('planting-grid');
    await waitFor(() => {
      expect(within(grid).getByText('Spinach')).toBeInTheDocument();
    });
    expect(within(grid).getByText('Radish')).toBeInTheDocument();
    expect(within(grid).getByText('Kale')).toBeInTheDocument();
  });

  it('a succession pre-fills from its parent and persists previousPlantingId', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 5', isActive: true });
    const parentId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Beetroot',
      variety: 'Detroit Dark Red',
      method: 'direct_sown',
      status: 'finished',
      spacingCm: 10,
      notes: '',
    });

    // Import PlantingForm directly to exercise the succession pre-fill, since PlantingList
    // itself does not yet wire up a "sow next" trigger (that lands with the detail screen).
    const { PlantingForm } = await import('../PlantingForm');
    const parent = (await vegDb.plantings.toArray()).find((p) => String(p.id) === parentId)!;
    await usePlantings.getState().loadPlantings();
    const parentPlanting = usePlantings.getState().plantings.find((p) => p.id === parentId)!;

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PlantingForm isOpen={true} onClose={() => {}} sowNextFrom={parentPlanting} />
      </MemoryRouter>
    );

    const dialog = await screen.findByRole('dialog');

    // Pre-filled from the parent.
    expect(within(dialog).getByLabelText(/crop/i)).toHaveValue('Beetroot');
    expect(within(dialog).getByLabelText(/spacing/i)).toHaveValue(10);
    expect(within(dialog).getByText(/Succession of/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Create Planting' }));

    await waitFor(async () => {
      const stored = await vegDb.plantings.toArray();
      expect(stored).toHaveLength(2);
    });

    const stored = await vegDb.plantings.toArray();
    const child = stored.find((p) => String(p.id) !== parentId);
    expect(child?.previousPlantingId).toBe(parentId);
    expect(child?.crop).toBe('Beetroot');
    void parent;
  });

  it('shows both units on a card for a planting picked in kg and bunches', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 9', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Silverbeet',
      method: 'direct_sown',
      status: 'harvesting',
      notes: '',
    });

    const now = new Date();
    await vegDb.harvests.add({
      plantingId,
      date: now,
      quantity: 3,
      unit: 'kg',
      sellable: true,
      createdAt: now,
    } as VegHarvest);
    await vegDb.harvests.add({
      plantingId,
      date: now,
      quantity: 5,
      unit: 'bunches',
      sellable: true,
      createdAt: now,
    } as VegHarvest);
    await useHarvests.getState().loadForPlanting(plantingId);

    renderList();

    const grid = await screen.findByTestId('planting-grid');
    await waitFor(() => {
      expect(within(grid).getByText('Silverbeet')).toBeInTheDocument();
    });

    expect(within(grid).getByText('3 kg')).toBeInTheDocument();
    expect(within(grid).getByText('5 bunches')).toBeInTheDocument();
  });
});
