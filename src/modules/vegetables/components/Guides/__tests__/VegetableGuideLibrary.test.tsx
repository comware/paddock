/**
 * VegetableGuideLibrary - rendered against a mocked fetch of
 * /guides/vegetables/index.json (and per-crop markdown files), since the
 * test environment has no dev server to serve /public from.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VegetableGuideLibrary } from '../VegetableGuideLibrary';

const fakeIndex = {
  version: '1.0',
  lastUpdated: '2026-09-02',
  categories: [
    { id: 'leafy-greens', name: 'Leafy Greens', description: 'Fast and forgiving', icon: '🥬' },
    { id: 'alliums', name: 'Alliums', description: 'Long in the ground', icon: '🧅' },
  ],
  guides: [
    {
      id: 'lettuce',
      name: 'Lettuce',
      category: 'leafy-greens',
      difficulty: 'easy',
      daysToMaturity: '45-65',
      sowingMethod: 'either',
      spacingCm: 25,
      rowSpacingCm: 30,
      sowingDepthMm: 5,
      soilTempC: '7-24',
      successionDays: 14,
      file: 'leafy-greens/lettuce.md',
      status: 'complete',
    },
    {
      id: 'garlic',
      name: 'Garlic',
      category: 'alliums',
      difficulty: 'moderate',
      daysToMaturity: '180-240',
      sowingMethod: 'direct',
      spacingCm: 10,
      rowSpacingCm: 20,
      sowingDepthMm: 50,
      soilTempC: '10-20',
      successionDays: null,
      file: 'alliums/garlic.md',
      status: 'stub',
    },
  ],
};

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.endsWith('/guides/vegetables/index.json')) {
      return { ok: true, json: async () => fakeIndex } as Response;
    }
    if (url.endsWith('leafy-greens/lettuce.md')) {
      return { ok: true, text: async () => '# Lettuce\n\nCut-and-come-again leafy green.' } as Response;
    }
    if (url.endsWith('alliums/garlic.md')) {
      return { ok: true, text: async () => '' } as Response;
    }
    if (url.endsWith('getting-started/first-bed.md')) {
      return {
        ok: true,
        text: async () => '# Your First Bed\n\nFind your season below and follow that path only.',
      } as Response;
    }
    return { ok: false, json: async () => ({}), text: async () => '' } as Response;
  });
}

describe('VegetableGuideLibrary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the categories from the index', async () => {
    render(<VegetableGuideLibrary />);

    await waitFor(() => {
      expect(screen.getByText('Leafy Greens')).toBeInTheDocument();
    });
    expect(screen.getByText('Alliums')).toBeInTheDocument();
  });

  it('renders crops within their category', async () => {
    render(<VegetableGuideLibrary />);

    await waitFor(() => {
      expect(screen.getByText('Lettuce')).toBeInTheDocument();
    });
    expect(screen.getByText('Garlic')).toBeInTheDocument();
    // Headline facts from the index show up without opening anything.
    expect(screen.getByText('45-65')).toBeInTheDocument();
    expect(screen.getByText('25cm × 30cm')).toBeInTheDocument();
  });

  it('search filters the list', async () => {
    const user = userEvent.setup();
    render(<VegetableGuideLibrary />);

    await waitFor(() => {
      expect(screen.getByText('Lettuce')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search crops...'), 'garlic');

    await waitFor(() => {
      expect(screen.queryByText('Lettuce')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Garlic')).toBeInTheDocument();
  });

  it('carries the climate caveat in the header', async () => {
    render(<VegetableGuideLibrary />);

    await waitFor(() => {
      expect(screen.getByText(/temperate southern australia/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/soil temperature is the reliable signal/i)).toBeInTheDocument();
  });

  it('clicking a crop opens the detail modal', async () => {
    const user = userEvent.setup();
    render(<VegetableGuideLibrary />);

    await waitFor(() => {
      expect(screen.getByText('Lettuce')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Lettuce'));

    const dialog = await screen.findByText('Cut-and-come-again leafy green.');
    expect(dialog).toBeInTheDocument();
  });

  it('shows a plain message for a guide whose status is still stub', async () => {
    const user = userEvent.setup();
    render(<VegetableGuideLibrary />);

    await waitFor(() => {
      expect(screen.getByText('Garlic')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Garlic'));

    await waitFor(() => {
      expect(screen.getByText(/hasn't been written yet/i)).toBeInTheDocument();
    });
  });

  it('puts the beginner track ahead of the crop list', async () => {
    render(<VegetableGuideLibrary />);
    await screen.findByText('Leafy Greens');

    // The heading a novice is meant to land on, and the seasonal page it points at.
    expect(screen.getByRole('heading', { name: /new to growing vegetables/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Your First Bed/ })).toBeInTheDocument();

    // Order matters here, not just presence: the section is above the catalogue because the
    // season decides the crop, not the other way round. compareDocumentPosition returns
    // DOCUMENT_POSITION_FOLLOWING (4) when the argument comes after the node.
    const intro = screen.getByRole('heading', { name: /new to growing vegetables/i });
    const crops = screen.getByRole('heading', { name: 'Leafy Greens' });
    expect(intro.compareDocumentPosition(crops) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('clicking a getting-started card opens it', async () => {
    const user = userEvent.setup();
    render(<VegetableGuideLibrary />);
    await screen.findByText('Leafy Greens');

    await user.click(screen.getByRole('button', { name: /Your First Bed/ }));

    await waitFor(() => {
      expect(screen.getByText(/find your season below/i)).toBeInTheDocument();
    });
  });
});
