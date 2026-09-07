/**
 * Spinner and LoadingState tests.
 *
 * These did not exist. LoadingState.test.tsx had eight tests named for a "LoadingSpinner",
 * but that component was declared inside the test file and imported by nothing - so the
 * spinner the app actually renders, in fifteen or so places, had no coverage at all while
 * the suite reported forty passing loading-state tests.
 *
 * What is worth asserting here is the part that is easy to get wrong and impossible to see:
 * a spinning div announces nothing, so a screen reader user is told the region is empty
 * rather than that it is loading. That is the reason LoadingState exists rather than each
 * call site rolling its own div.
 *
 * Component location: src/components/shared/Spinner.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingState } from '../shared/Spinner';

describe('Spinner', () => {
  it('renders something that spins', () => {
    const { container } = render(<Spinner />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('takes a size from the caller', () => {
    const { container } = render(<Spinner className="w-4 h-4" />);

    expect(container.firstChild).toHaveClass('w-4', 'h-4');
  });
});

describe('LoadingState', () => {
  it('announces that it is busy', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('has a label for screen readers that is not shown', () => {
    render(<LoadingState />);

    expect(screen.getByText('Loading')).toHaveClass('sr-only');
  });

  it('says what is being waited on when told', () => {
    render(<LoadingState label="Loading guide" />);

    expect(screen.getByText('Loading guide')).toBeInTheDocument();
  });

  it('takes its spacing from the caller', () => {
    render(<LoadingState className="py-12" />);

    expect(screen.getByRole('status')).toHaveClass('py-12');
  });
});
