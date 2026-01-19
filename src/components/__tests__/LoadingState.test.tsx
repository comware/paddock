/**
 * LoadingState Component Tests
 *
 * Tests loading state components including:
 * - ModuleLoader (src/components/shared/ModuleLoader.tsx)
 * - Skeleton loading variants
 * - Spinner variants
 * - Loading overlays
 *
 * These components provide visual feedback during async operations.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleLoader } from '../shared/ModuleLoader';

// ============================================
// LOADING COMPONENT IMPLEMENTATIONS
// ============================================
// Additional loading components following patterns in the codebase

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

function LoadingSpinner({ size = 'md', label = 'Loading...' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-2"
      role="status"
      aria-live="polite"
      data-testid="loading-spinner"
    >
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-slate-200 border-t-primary-500`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      data-testid={`skeleton-${variant}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}

interface CardSkeletonProps {
  showIcon?: boolean;
  showSubtitle?: boolean;
  lines?: number;
}

function CardSkeleton({ showIcon = true, showSubtitle = true, lines = 2 }: CardSkeletonProps) {
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm"
      data-testid="card-skeleton"
      role="status"
      aria-label="Loading card content"
    >
      <div className="animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          {showIcon && <Skeleton variant="circular" width={24} height={24} />}
          <Skeleton variant="text" width="60%" />
        </div>
        <Skeleton variant="text" width="40%" height={28} />
        {showSubtitle && <Skeleton variant="text" width="50%" />}
        {[...Array(lines)].map((_, i) => (
          <Skeleton key={i} variant="text" width={`${80 - i * 10}%`} />
        ))}
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
}

function ListSkeleton({ count = 3, showAvatar = true }: ListSkeletonProps) {
  return (
    <div
      className="space-y-4"
      data-testid="list-skeleton"
      role="status"
      aria-label={`Loading ${count} items`}
    >
      <span className="sr-only">Loading list items</span>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

function LoadingOverlay({ isLoading, message = 'Loading...', children }: LoadingOverlayProps) {
  return (
    <div className="relative" data-testid="loading-overlay-container">
      {children}
      {isLoading && (
        <div
          className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10"
          data-testid="loading-overlay"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center">
            <div className="text-4xl animate-pulse mb-2">🌱</div>
            <p className="text-slate-600 dark:text-slate-400">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MODULE LOADER TESTS
// ============================================

describe('ModuleLoader', () => {
  it('renders loading state', () => {
    render(<ModuleLoader />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays seedling emoji as loading indicator', () => {
    render(<ModuleLoader />);

    expect(screen.getByText('🌱')).toBeInTheDocument();
  });

  it('centers content vertically and horizontally', () => {
    const { container } = render(<ModuleLoader />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center');
  });

  it('has animate-pulse class on icon for animation', () => {
    const { container } = render(<ModuleLoader />);

    const icon = container.querySelector('.animate-pulse');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveTextContent('🌱');
  });
});

// ============================================
// LOADING SPINNER TESTS
// ============================================

describe('LoadingSpinner', () => {
  describe('renders correctly', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('includes screen reader text', () => {
      render(<LoadingSpinner label="Please wait" />);

      expect(screen.getByText('Please wait')).toHaveClass('sr-only');
    });
  });

  describe('size variants', () => {
    it('applies small size classes', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.querySelector('.w-4.h-4');
      expect(spinner).toBeInTheDocument();
    });

    it('applies medium size classes (default)', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.w-8.h-8');
      expect(spinner).toBeInTheDocument();
    });

    it('applies large size classes', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinner = container.querySelector('.w-12.h-12');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="status" for screen readers', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('spinner is aria-hidden from screen readers', () => {
      const { container } = render(<LoadingSpinner />);

      const spinnerVisual = container.querySelector('[aria-hidden="true"]');
      expect(spinnerVisual).toBeInTheDocument();
    });
  });
});

// ============================================
// SKELETON TESTS
// ============================================

describe('Skeleton', () => {
  describe('variant types', () => {
    it('renders text variant by default', () => {
      render(<Skeleton />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveClass('rounded', 'h-4');
    });

    it('renders circular variant', () => {
      render(<Skeleton variant="circular" />);

      const skeleton = screen.getByTestId('skeleton-circular');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders rectangular variant', () => {
      render(<Skeleton variant="rectangular" />);

      const skeleton = screen.getByTestId('skeleton-rectangular');
      expect(skeleton).toHaveClass('rounded-lg');
    });
  });

  describe('dimensions', () => {
    it('applies width as pixels when number provided', () => {
      render(<Skeleton width={200} />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveStyle({ width: '200px' });
    });

    it('applies width as string when string provided', () => {
      render(<Skeleton width="50%" />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveStyle({ width: '50%' });
    });

    it('applies custom height', () => {
      render(<Skeleton height={32} />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveStyle({ height: '32px' });
    });
  });

  describe('animation', () => {
    it('has animate-pulse class', () => {
      render(<Skeleton />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('accessibility', () => {
    it('is hidden from screen readers with aria-hidden', () => {
      render(<Skeleton />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('has role="presentation"', () => {
      render(<Skeleton />);

      expect(screen.getByRole('presentation', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('accepts additional CSS classes', () => {
      render(<Skeleton className="custom-class" />);

      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveClass('custom-class');
    });
  });
});

// ============================================
// CARD SKELETON TESTS
// ============================================

describe('CardSkeleton', () => {
  it('renders card structure', () => {
    render(<CardSkeleton />);

    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
  });

  it('shows icon skeleton by default', () => {
    render(<CardSkeleton />);

    expect(screen.getByTestId('skeleton-circular')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(<CardSkeleton showIcon={false} />);

    expect(screen.queryByTestId('skeleton-circular')).not.toBeInTheDocument();
  });

  it('renders multiple text lines', () => {
    render(<CardSkeleton lines={4} />);

    const skeletons = screen.getAllByTestId('skeleton-text');
    // 4 lines + title + value + subtitle = 7 total
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<CardSkeleton />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label describing content', () => {
      render(<CardSkeleton />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading card content');
    });
  });
});

// ============================================
// LIST SKELETON TESTS
// ============================================

describe('ListSkeleton', () => {
  it('renders specified number of items', () => {
    render(<ListSkeleton count={5} />);

    const avatars = screen.getAllByTestId('skeleton-circular');
    expect(avatars).toHaveLength(5);
  });

  it('renders 3 items by default', () => {
    render(<ListSkeleton />);

    const avatars = screen.getAllByTestId('skeleton-circular');
    expect(avatars).toHaveLength(3);
  });

  it('hides avatars when showAvatar is false', () => {
    render(<ListSkeleton showAvatar={false} />);

    expect(screen.queryByTestId('skeleton-circular')).not.toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has aria-label with count', () => {
      render(<ListSkeleton count={5} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading 5 items');
    });

    it('includes screen reader only text', () => {
      render(<ListSkeleton />);

      expect(screen.getByText('Loading list items')).toHaveClass('sr-only');
    });
  });
});

// ============================================
// LOADING OVERLAY TESTS
// ============================================

describe('LoadingOverlay', () => {
  it('renders children always', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Child Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('shows overlay when isLoading is true', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
  });

  it('hides overlay when isLoading is false', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
  });

  it('displays custom message', () => {
    render(
      <LoadingOverlay isLoading={true} message="Saving changes...">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
  });

  it('displays default message when not specified', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('overlay has role="alert"', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="assertive" for immediate announcement', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );

      const overlay = screen.getByRole('alert');
      expect(overlay).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('shows seedling emoji as visual indicator', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('🌱')).toBeInTheDocument();
  });
});
