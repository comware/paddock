/**
 * EmptyState Component Tests
 *
 * Tests the reusable empty state component that displays friendly messages
 * when lists are empty, with optional action buttons.
 *
 * Four tests were removed when the icon changed from an emoji string to a Lucide
 * component: three fed it emoji, special characters and compound emoji to prove the string
 * was rendered verbatim, and one asserted the opacity applied to that text. There is no
 * longer a string to render verbatim - the prop is a component - so they were testing a
 * capability that has deliberately gone rather than behaviour that regressed.
 *
 * Component location: src/components/shared/EmptyState.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sprout } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';

describe('EmptyState', () => {
  describe('renders correctly', () => {
    /**
     * The icon is decorative - it repeats what the heading already says - so it is
     * aria-hidden and has no accessible name to query by. What matters is that it is
     * present and hidden from assistive technology, not which glyph it is.
     */
    it('renders the icon, hidden from screen readers', () => {
      const { container } = render(
        <EmptyState
          Icon={Sprout}
          title="No Trays"
          description="Start by planting your first tray"
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('displays title', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Batches Yet"
          description="Create your first batch"
        />
      );

      expect(screen.getByRole('heading', { name: 'No Batches Yet' })).toBeInTheDocument();
    });

    it('displays description', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Data"
          description="Harvest some trays to see analytics"
        />
      );

      expect(screen.getByText('Harvest some trays to see analytics')).toBeInTheDocument();
    });
  });

  describe('action button', () => {
    it('renders action button when action prop is provided', () => {
      const onClickMock = vi.fn();

      render(
        <EmptyState
          Icon={Sprout}
          title="Empty"
          description="No items"
          action={{
            label: 'Add New',
            onClick: onClickMock,
          }}
        />
      );

      expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
    });

    it('does not render action button when action prop is not provided', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="Empty"
          description="Nothing here"
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onClick handler when action button is clicked', () => {
      const onClickMock = vi.fn();

      render(
        <EmptyState
          Icon={Sprout}
          title="Empty"
          description="No items"
          action={{
            label: 'Create First',
            onClick: onClickMock,
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Create First' }));

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('various content scenarios', () => {
    it('handles long description text', () => {
      const longDescription =
        'This is a very long description that explains in detail why there are no items to display and what the user should do to see some content here.';

      render(
        <EmptyState
          Icon={Sprout}
          title="No Items"
          description={longDescription}
        />
      );

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });



  });

  describe('different use cases in the app', () => {
    it('renders for empty tray list', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Trays Yet"
          description="Plant your first tray to get started on your microgreens journey!"
          action={{
            label: 'Plant First Tray',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByRole('heading', { name: 'No Trays Yet' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Plant First Tray' })).toBeInTheDocument();
    });

    it('renders for empty batch list', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Propagation Batches"
          description="Start a new batch to begin propagating plants."
          action={{
            label: 'Create Batch',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByRole('heading', { name: 'No Propagation Batches' })).toBeInTheDocument();
    });

    it('renders for empty analytics', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Analytics Data"
          description="Complete some harvests to see your analytics and trends."
        />
      );

      expect(screen.getByRole('heading', { name: 'No Analytics Data' })).toBeInTheDocument();
      // No action button for analytics empty state
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders for empty mother plants', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Mother Plants"
          description="Add your first mother plant to start taking cuttings."
          action={{
            label: 'Add Mother Plant',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByRole('heading', { name: 'No Mother Plants' })).toBeInTheDocument();
    });

    it('renders for empty search results', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Results Found"
          description="Try adjusting your search terms or filters."
        />
      );

      expect(screen.getByRole('heading', { name: 'No Results Found' })).toBeInTheDocument();
    });

    it('renders for empty calendar events', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="No Events This Day"
          description="No trays need attention today. Enjoy the break!"
        />
      );

      expect(screen.getByRole('heading', { name: 'No Events This Day' })).toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(
        <EmptyState
          Icon={Sprout}
          title="Test"
          description="Description"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('applies text-center class for centered text', () => {
      const { container } = render(
        <EmptyState
          Icon={Sprout}
          title="Test"
          description="Description"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('text-center');
    });

    it('applies proper padding', () => {
      const { container } = render(
        <EmptyState
          Icon={Sprout}
          title="Test"
          description="Description"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('py-12', 'px-4');
    });

  });

  describe('accessibility', () => {
    it('title is an h3 heading', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="Accessible Title"
          description="Description"
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Accessible Title');
    });

    it('description is in a paragraph element', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="Title"
          description="This is the description"
        />
      );

      const paragraph = screen.getByText('This is the description');
      expect(paragraph.tagName).toBe('P');
    });

    it('action button is a proper button element', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="Title"
          description="Description"
          action={{
            label: 'Click Me',
            onClick: vi.fn(),
          }}
        />
      );

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    /**
     * The action carries the app's primary button classes rather than rendering as bare
     * text. It looked like a paragraph for as long as `.btn-primary` went undefined, and
     * the test above still passed throughout, because it was a <button> the whole time.
     *
     * happy-dom applies no stylesheet, so this can only assert that the contract is asked
     * for. That the classes are actually defined is asserted in buttonClasses.test.ts,
     * which reads index.css - the two together are what cover the original bug.
     */
    it('asks for the app primary button styling', () => {
      render(
        <EmptyState
          Icon={Sprout}
          title="Title"
          description="Description"
          action={{ label: 'Click Me', onClick: vi.fn() }}
        />
      );

      expect(screen.getByRole('button').className).toContain('btn btn-primary');
    });
  });
});
