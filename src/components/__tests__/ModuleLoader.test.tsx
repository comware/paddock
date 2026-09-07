/**
 * ModuleLoader Component Tests
 *
 * These are what survived src/components/__tests__/LoadingState.test.tsx, which ran 40 tests
 * against six components. Only ModuleLoader was real. The other five - LoadingSpinner,
 * Skeleton, CardSkeleton, ListSkeleton, LoadingOverlay - were defined inside the test file
 * itself and imported by nothing in src/, so 37 tests exercised their own fixtures and could
 * not fail for any reason that mattered. They are gone.
 *
 * Component location: src/components/shared/ModuleLoader.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleLoader } from '../shared/ModuleLoader';

describe('ModuleLoader', () => {
  /*
   * These tests used to assert on a pulsing seedling emoji and the literal text
   * "Loading...". Both are gone: the module loader now shows the same spinner as every
   * other wait in the app, and its label is read by screen readers rather than displayed.
   * The assertions moved to what the component is actually for - announcing that something
   * is loading, and filling the space while it does.
   */
  it('announces that something is loading', () => {
    render(<ModuleLoader />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading module')).toHaveClass('sr-only');
  });

  it('centers content and fills the available space', () => {
    const { container } = render(<ModuleLoader />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center');
  });

  it('shows a spinner', () => {
    const { container } = render(<ModuleLoader />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
