/**
 * GraduationHistory - planting link display.
 *
 * Rendered against the REAL GraduationHistory, useGraduations, usePlantings and useBeds
 * stores, backed by a real (fake-indexeddb) database. `plantedLocation` still renders
 * unchanged when there is no plantingId; when a plantingId resolves it renders as a link
 * to the planting; when it no longer resolves (the planting was deleted) it degrades
 * gracefully instead of rendering a broken link.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db, propDb, vegDb } from '@/lib/db';
import { useGraduations } from '../../../stores/useGraduations';
import { DEFAULT_FILTERS } from '../../../stores/useGraduations.types';
import { useBatches } from '../../../stores/useBatches';
import { useBeds } from '@/modules/vegetables/stores/useBeds';
import { usePlantings } from '@/modules/vegetables/stores/usePlantings';
import { GraduationHistory } from '../GraduationHistory';

function renderHistory(batchId: string) {
  return render(
    <MemoryRouter>
      <GraduationHistory batchId={batchId} />
    </MemoryRouter>
  );
}

describe('GraduationHistory - planting link', () => {
  beforeEach(async () => {
    await db.open();
    await propDb.graduations.clear();
    await propDb.batches.clear();
    await vegDb.plantings.clear();
    await vegDb.beds.clear();

    useGraduations.setState({
      rawGraduations: [],
      graduations: [],
      graduationsByBatch: new Map(),
      isLoading: false,
      error: null,
      filters: { ...DEFAULT_FILTERS },
    });
    useBatches.setState({ rawBatches: [], batches: [], isLoading: false, error: null });
    useBeds.setState({ beds: [], isLoading: false, error: null });
    usePlantings.setState({ plantings: [], isLoading: false, error: null });
  });

  it('renders a link to the planting when plantingId resolves', async () => {
    const siteId = 'site-1';
    const bedId = await useBeds.getState().addBed({ siteId, name: 'Bed 3', isActive: true });
    const plantingId = await usePlantings.getState().addPlanting({
      siteId,
      bedId,
      crop: 'Chard',
      variety: 'Rainbow',
      method: 'transplanted',
      status: 'growing',
      notes: '',
    });

    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 2,
      outcome: 'planted_garden',
      plantingId,
    });

    renderHistory('batch-1');

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Chard/ });
      expect(link).toHaveAttribute('href', `/vegetables/plantings/${plantingId}`);
    });
    expect(screen.getByText(/Bed 3/)).toBeInTheDocument();
  });

  it('falls back to plantedLocation when there is no plantingId', async () => {
    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 1,
      outcome: 'planted_garden',
      plantedLocation: 'Front verge',
    });

    renderHistory('batch-1');

    await waitFor(() => {
      expect(screen.getByText('Location: Front verge')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('degrades gracefully when plantingId no longer resolves', async () => {
    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 1,
      outcome: 'planted_garden',
      plantingId: 'deleted-planting-id',
    });

    renderHistory('batch-1');

    await waitFor(() => {
      expect(screen.getByText('1 graduation')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Planted location no longer available')).toBeInTheDocument();
  });

  it('degrades to plantedLocation when plantingId is dangling but a note was also kept', async () => {
    await useGraduations.getState().recordGraduation({
      batchId: 'batch-1',
      quantity: 1,
      outcome: 'planted_garden',
      plantingId: 'deleted-planting-id',
      plantedLocation: 'North bed, back row',
    });

    renderHistory('batch-1');

    await waitFor(() => {
      expect(screen.getByText('Location: North bed, back row')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
