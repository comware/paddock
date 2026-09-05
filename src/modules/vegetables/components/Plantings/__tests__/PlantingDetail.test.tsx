/**
 * PlantingDetail - rendered against the REAL PlantingDetail, HarvestLogModal, HarvestList,
 * PlantingForm, and the usePlantings/useBeds/useHarvests stores, backed by a real
 * (fake-indexeddb) database. Assertions that touch persistence read back out of vegDb,
 * never store state - see PlantingList.test.tsx for why that discipline matters here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { db, vegDb, platformDb } from '@/lib/db';
import { useBeds } from '../../../stores/useBeds';
import { usePlantings } from '../../../stores/usePlantings';
import { useHarvests } from '../../../stores/useHarvests';
import { useSites } from '@/platform';
import { PlantingDetail } from '../PlantingDetail';

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

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/vegetables/plantings/${id}`]}>
      <Routes>
        <Route path="/vegetables/plantings/:id" element={<PlantingDetail />} />
        <Route path="/vegetables/plantings" element={<div>Plantings list</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlantingDetail', () => {
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

  it('renders not-found when there is no matching planting', async () => {
    await seedActiveSite();
    renderDetail('does-not-exist');

    await waitFor(() => {
      expect(screen.getByText('Planting not found')).toBeInTheDocument();
    });
  });

  it("renders a planting's crop, bed name and status", async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 7', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Carrots',
      variety: 'Nantes',
      method: 'direct_sown',
      status: 'growing',
      notes: '',
    });

    renderDetail(plantingId);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Carrots' })).toBeInTheDocument();
    });
    expect(screen.getByText('Bed 7')).toBeInTheDocument();
    expect(screen.getByText('Growing')).toBeInTheDocument();
  });

  it('logging a pick persists it and shows it in the list', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 1', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Lettuce',
      method: 'direct_sown',
      status: 'harvesting',
      notes: '',
    });

    const user = userEvent.setup();
    renderDetail(plantingId);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lettuce' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Log a pick' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByLabelText(/quantity/i));
    await user.type(within(dialog).getByLabelText(/quantity/i), '2.5');
    await user.click(within(dialog).getByRole('button', { name: 'Log Pick' }));

    await waitFor(async () => {
      const stored = await vegDb.harvests.toArray();
      expect(stored).toHaveLength(1);
    });
    const stored = await vegDb.harvests.toArray();
    expect(stored[0].plantingId).toBe(plantingId);
    expect(stored[0].quantity).toBe(2.5);
    expect(stored[0].unit).toBe('kg');

    await waitFor(() => {
      expect(within(screen.getByTestId('harvest-picks')).getByText('2.5 kg')).toBeInTheDocument();
    });
  });

  it('logging a pick against a finished planting reopens it, in the database and in the UI', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 2', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Spinach',
      method: 'direct_sown',
      status: 'finished',
      dateFinished: new Date(),
      finishReason: 'Bolted',
      notes: '',
    });

    const user = userEvent.setup();
    renderDetail(plantingId);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Spinach' })).toBeInTheDocument();
    });
    expect(screen.getByText('Finished')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log a pick' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByLabelText(/quantity/i));
    await user.type(within(dialog).getByLabelText(/quantity/i), '1');
    await user.click(within(dialog).getByRole('button', { name: 'Log Pick' }));

    await waitFor(() => {
      expect(screen.getByText(/marked finished, so it has been reopened/i)).toBeInTheDocument();
    });

    const dbPlanting = await vegDb.plantings.get(Number(plantingId));
    expect(dbPlanting?.status).toBe('harvesting');
    await waitFor(() => {
      expect(screen.getByText('Harvesting')).toBeInTheDocument();
    });
  });

  it('logging a pick against a failed planting is refused, keeps the modal open and keeps the entry', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 4', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Radish',
      method: 'direct_sown',
      status: 'failed',
      notes: '',
    });

    const user = userEvent.setup();
    renderDetail(plantingId);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Radish' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Log a pick' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByLabelText(/quantity/i));
    await user.type(within(dialog).getByLabelText(/quantity/i), '3');
    await user.type(within(dialog).getByLabelText(/notes/i), 'late pick, wrong planting maybe');
    await user.click(within(dialog).getByRole('button', { name: 'Log Pick' }));

    await waitFor(() => {
      expect(within(dialog).getByText(/cannot log a harvest/i)).toBeInTheDocument();
    });

    // Modal stays open with the entered values intact.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/quantity/i)).toHaveValue(3);
    expect(within(dialog).getByLabelText(/notes/i)).toHaveValue('late pick, wrong planting maybe');

    const stored = await vegDb.harvests.toArray();
    expect(stored).toHaveLength(0);
  });

  it('the delete confirmation names the harvest count', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 5', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Kale',
      method: 'direct_sown',
      status: 'harvesting',
      notes: '',
    });

    const now = new Date();
    await vegDb.harvests.add({ plantingId, date: now, quantity: 1, unit: 'kg', sellable: true, createdAt: now } as never);
    await vegDb.harvests.add({ plantingId, date: now, quantity: 2, unit: 'kg', sellable: true, createdAt: now } as never);

    const user = userEvent.setup();
    renderDetail(plantingId);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Kale' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete planting' }));

    await waitFor(() => {
      expect(screen.getByText(/This will also delete 2 harvest records/i)).toBeInTheDocument();
    });
  });

  it('shows both kg and bunches in the summary when picked in both', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 6', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Silverbeet',
      method: 'direct_sown',
      status: 'harvesting',
      notes: '',
    });

    const now = new Date();
    await vegDb.harvests.add({ plantingId, date: now, quantity: 3, unit: 'kg', sellable: true, createdAt: now } as never);
    await vegDb.harvests.add({ plantingId, date: now, quantity: 5, unit: 'bunches', sellable: true, createdAt: now } as never);

    renderDetail(plantingId);

    await waitFor(() => {
      expect(screen.getByTestId('harvest-summary')).toBeInTheDocument();
    });
    const summary = screen.getByTestId('harvest-summary');
    expect(within(summary).getByText('3 kg')).toBeInTheDocument();
    expect(within(summary).getByText('5 bunches')).toBeInTheDocument();
  });

  it('renders the succession chain in order, with links, and marks the current planting', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 8', isActive: true });
    const firstId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Beetroot',
      method: 'direct_sown',
      status: 'finished',
      notes: '',
    });
    await usePlantings.getState().loadPlantings();
    const firstPlanting = usePlantings.getState().plantings.find((p) => p.id === firstId)!;
    const secondId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Beetroot',
      method: 'direct_sown',
      status: 'growing',
      notes: '',
      previousPlantingId: firstPlanting.id,
    });

    renderDetail(secondId);

    await waitFor(() => {
      expect(screen.getByText(/this planting/i)).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.includes('/vegetables/plantings/'));
    expect(links.some((a) => a.getAttribute('href') === `/vegetables/plantings/${firstId}`)).toBe(true);

    // Order: earliest first.
    const items = screen.getAllByText(/^1\.|^2\./);
    expect(items[0].textContent).toMatch(/^1\./);
    expect(items[1].textContent).toMatch(/^2\./);
  });
});
