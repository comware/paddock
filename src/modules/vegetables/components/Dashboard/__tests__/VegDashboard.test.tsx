/**
 * VegDashboard - rendered against the REAL component and REAL stores, backed by a real
 * (fake-indexeddb) database. See PlantingDetail.test.tsx for the seeding pattern this
 * follows.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db, vegDb, platformDb } from '@/lib/db';
import { useBeds } from '../../../stores/useBeds';
import { usePlantings } from '../../../stores/usePlantings';
import { useHarvests } from '../../../stores/useHarvests';
import { useSites } from '@/platform';
import { VegDashboard } from '../VegDashboard';

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

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <VegDashboard />
    </MemoryRouter>
  );
}

describe('VegDashboard', () => {
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

  it('shows the no-beds empty state on a fresh install, pointing at adding the first bed', async () => {
    await seedActiveSite();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No beds yet')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Add a bed' })).toBeInTheDocument();
  });

  it('shows a different message when there are beds but no plantings', async () => {
    const siteId = await seedActiveSite();
    await useBeds.getState().addBed({ siteId, name: 'Bed 1', isActive: true });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No plantings yet')).toBeInTheDocument();
    });
    expect(screen.queryByText('No beds yet')).not.toBeInTheDocument();
  });

  it('lists an overdue planting in the ready panel and says how overdue it is', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 3', isActive: true });
    await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Carrots',
      method: 'direct_sown',
      status: 'growing',
      expectedFirstHarvest: daysAgo(6),
      notes: '',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Carrots')).toBeInTheDocument();
    });
    expect(screen.getByText('expected 6 days ago')).toBeInTheDocument();
  });

  it('lists a planting that is already harvesting in the ready panel', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 4', isActive: true });
    await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Lettuce',
      method: 'direct_sown',
      status: 'harvesting',
      notes: '',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Lettuce')).toBeInTheDocument();
    });
    expect(screen.getByText('Harvesting')).toBeInTheDocument();
  });

  it('counts beds in use versus free correctly', async () => {
    const siteId = await seedActiveSite();
    const bedInUse = await useBeds.getState().addBed({ siteId, name: 'Bed A', isActive: true });
    await useBeds.getState().addBed({ siteId, name: 'Bed B', isActive: true });
    await useBeds.getState().addBed({ siteId, name: 'Bed C (inactive)', isActive: false });

    await usePlantings.getState().addPlanting({
      siteId,
      bedId: bedInUse,
      crop: 'Kale',
      method: 'direct_sown',
      status: 'growing',
      notes: '',
    });

    renderDashboard();

    // Two active beds (Bed A, Bed B); one holds a growing planting, one is free. The
    // inactive bed doesn't count either way.
    await waitFor(() => {
      expect(screen.getByTestId('beds-panel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('beds-in-use')).toHaveTextContent('1');
    expect(screen.getByTestId('beds-free')).toHaveTextContent('1');
    expect(screen.getByTestId('beds-active-total')).toHaveTextContent('2');
  });

  it('shows a logged harvest in recent picks with its crop and quantity', async () => {
    const siteId = await seedActiveSite();
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 5', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Spinach',
      method: 'direct_sown',
      status: 'harvesting',
      notes: '',
    });

    const now = new Date();
    await vegDb.harvests.add({
      plantingId,
      date: now,
      quantity: 2.5,
      unit: 'kg',
      sellable: true,
      createdAt: now,
    } as never);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('2.5 kg')).toBeInTheDocument();
    });
    const recentPanel = screen.getByTestId('recent-picks-panel');
    expect(within(recentPanel).getByText('Spinach')).toBeInTheDocument();
  });

  it('renders two different units in recent picks without combining them', async () => {
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
    await vegDb.harvests.add({
      plantingId,
      date: now,
      quantity: 3,
      unit: 'kg',
      sellable: true,
      createdAt: now,
    } as never);
    await vegDb.harvests.add({
      plantingId,
      date: daysAgo(1),
      quantity: 5,
      unit: 'bunches',
      sellable: true,
      createdAt: now,
    } as never);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('3 kg')).toBeInTheDocument();
    });
    expect(screen.getByText('5 bunches')).toBeInTheDocument();
  });
});
