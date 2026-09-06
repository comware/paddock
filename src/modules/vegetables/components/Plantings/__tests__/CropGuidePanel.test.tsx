/**
 * CropGuidePanel - rendered against a mocked fetch of /guides/vegetables/index.json,
 * since the test environment has no dev server to serve /public from. Follows the
 * mocking style of VegetableGuideLibrary.test.tsx.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CropGuidePanel } from '../CropGuidePanel';

const fakeIndex = {
  version: '1.0',
  lastUpdated: '2026-09-02',
  categories: [{ id: 'leafy-greens', name: 'Leafy Greens', description: 'Fast and forgiving', icon: '🥬' }],
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
      id: 'pumpkin',
      name: 'Pumpkin',
      category: 'cucurbits',
      difficulty: 'moderate',
      daysToMaturity: '90-120',
      sowingMethod: 'direct',
      spacingCm: 90,
      rowSpacingCm: 180,
      sowingDepthMm: 25,
      soilTempC: '18-30',
      successionDays: null,
      file: 'cucurbits/pumpkin.md',
      status: 'complete',
    },
    {
      id: 'chard',
      name: 'Chard',
      category: 'leafy-greens',
      difficulty: 'easy',
      daysToMaturity: '50-60',
      sowingMethod: 'either',
      spacingCm: 20,
      rowSpacingCm: 30,
      sowingDepthMm: 10,
      soilTempC: '10-27',
      successionDays: 21,
      file: 'leafy-greens/chard.md',
      status: 'complete',
    },
  ],
};

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.endsWith('/guides/vegetables/index.json')) {
      return { ok: true, json: async () => fakeIndex } as Response;
    }
    return { ok: true, text: async () => '# Guide content' } as Response;
  });
}

describe('CropGuidePanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the facts for a known crop', async () => {
    const { container } = render(<CropGuidePanel cropName="Lettuce" />);

    await waitFor(() => {
      expect(screen.getByText('Growing guide: Lettuce')).toBeInTheDocument();
    });

    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders nothing for an unknown crop', async () => {
    const { container } = render(<CropGuidePanel cropName="Yacon" />);

    // Give any async lookup a chance to settle before asserting silence.
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('renders nothing for an empty crop name', () => {
    const { container } = render(<CropGuidePanel cropName="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Not a succession crop" when successionDays is null', async () => {
    const user = userEvent.setup();
    render(<CropGuidePanel cropName="Pumpkin" />);

    await waitFor(() => {
      expect(screen.getByText('Growing guide: Pumpkin')).toBeInTheDocument();
    });

    // Expand the collapsed panel to reveal the facts.
    await user.click(screen.getByText('Growing guide: Pumpkin'));

    await waitFor(() => {
      expect(screen.getByText('Not a succession crop')).toBeInTheDocument();
    });
  });

  it('shows the interval in days when it is a number', async () => {
    const user = userEvent.setup();
    render(<CropGuidePanel cropName="Lettuce" />);

    await waitFor(() => {
      expect(screen.getByText('Growing guide: Lettuce')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Growing guide: Lettuce'));

    await waitFor(() => {
      expect(screen.getByText('Every 14 days')).toBeInTheDocument();
    });
  });

  it('resolves an alias - Silverbeet shows Chard\'s facts', async () => {
    render(<CropGuidePanel cropName="Silverbeet" />);

    await waitFor(() => {
      expect(screen.getByText('Growing guide: Chard')).toBeInTheDocument();
    });
  });
});
