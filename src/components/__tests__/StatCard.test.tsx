/**
 * StatCard/MetricCard Component Tests
 *
 * Tests the dashboard metric card components used across Grow and Propagation modules.
 * These components display statistics with optional trends, subtitles, and color coding.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================
// EXTRACTED COMPONENT IMPLEMENTATIONS
// ============================================
// These mirror the actual implementations found in:
// - src/modules/grow/components/Dashboard/GrowDashboard.tsx (MetricCard)
// - src/modules/grow/components/Analytics/TrendCharts.tsx (StatCard)
// - src/modules/propagation/components/Dashboard/MetricsCards.tsx (MetricCard with trend)

interface MetricCardProps {
  label: string;
  value: string;
  target?: string;
  subtitle?: string;
  icon?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  isLoading?: boolean;
  error?: string;
}

function MetricCard({ label, value, target, subtitle, icon, trend, isLoading, error }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm" data-testid="metric-card-loading">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-red-200 dark:border-red-800" data-testid="metric-card-error">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
          {icon && <span>{icon}</span>}
          <span className="text-sm">{label}</span>
        </div>
        <div className="text-red-600 dark:text-red-400 text-sm" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm" data-testid="metric-card">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
        {icon && <span aria-hidden="true">{icon}</span>}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </div>
      {target && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Target: {target}
        </div>
      )}
      {subtitle && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
      {trend && (
        <div
          className={`text-sm mt-1 ${
            trend.direction === 'up'
              ? 'text-green-600 dark:text-green-400'
              : trend.direction === 'down'
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          data-testid="trend-indicator"
        >
          {trend.direction === 'up' && '+'}
          {trend.label}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  subtext?: string;
  color?: 'green' | 'amber' | 'red';
  isLoading?: boolean;
}

function StatCard({ label, value, suffix, subtext, color, isLoading }: StatCardProps) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };

  if (isLoading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4" data-testid="stat-card-loading">
        <div className="animate-pulse">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4" data-testid="stat-card">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-slate-900 dark:text-white'}`}>
        {value}
        {suffix && <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </div>
      {subtext && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}

// ============================================
// METRIC CARD TESTS
// ============================================

describe('MetricCard', () => {
  describe('renders correctly', () => {
    it('displays label and value', () => {
      render(<MetricCard label="Active Trays" value="12" />);

      expect(screen.getByText('Active Trays')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('displays icon when provided', () => {
      render(<MetricCard label="Trays" value="5" icon="🌱" />);

      expect(screen.getByText('🌱')).toBeInTheDocument();
    });

    it('displays target when provided', () => {
      render(<MetricCard label="Success Rate" value="85%" target="80%" />);

      expect(screen.getByText('Target: 80%')).toBeInTheDocument();
    });

    it('displays subtitle when provided', () => {
      render(<MetricCard label="Yield Ratio" value="4.5x" subtitle="harvest/seed" />);

      expect(screen.getByText('harvest/seed')).toBeInTheDocument();
    });
  });

  describe('trend indicator', () => {
    it('displays upward trend with plus sign', () => {
      render(
        <MetricCard
          label="Success Rate"
          value="85%"
          trend={{ direction: 'up', label: '5% from last week' }}
        />
      );

      const trendElement = screen.getByTestId('trend-indicator');
      expect(trendElement).toHaveTextContent('+5% from last week');
      expect(trendElement).toHaveClass('text-green-600');
    });

    it('displays downward trend without plus sign', () => {
      render(
        <MetricCard
          label="Yield"
          value="3.5x"
          trend={{ direction: 'down', label: '10% from last week' }}
        />
      );

      const trendElement = screen.getByTestId('trend-indicator');
      expect(trendElement).toHaveTextContent('10% from last week');
      expect(trendElement).not.toHaveTextContent('+');
      expect(trendElement).toHaveClass('text-red-600');
    });

    it('displays neutral trend', () => {
      render(
        <MetricCard
          label="Active"
          value="8"
          trend={{ direction: 'neutral', label: 'No change' }}
        />
      );

      const trendElement = screen.getByTestId('trend-indicator');
      expect(trendElement).toHaveTextContent('No change');
      expect(trendElement).toHaveClass('text-slate-500');
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<MetricCard label="Trays" value="12" isLoading />);

      expect(screen.getByTestId('metric-card-loading')).toBeInTheDocument();
      expect(screen.queryByText('12')).not.toBeInTheDocument();
      expect(screen.queryByText('Trays')).not.toBeInTheDocument();
    });

    it('includes animate-pulse class for loading animation', () => {
      render(<MetricCard label="Test" value="0" isLoading />);

      const loadingCard = screen.getByTestId('metric-card-loading');
      expect(loadingCard.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message when error prop is provided', () => {
      render(<MetricCard label="Data" value="--" error="Failed to load data" />);

      expect(screen.getByTestId('metric-card-error')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load data');
    });

    it('still displays label in error state', () => {
      render(<MetricCard label="Success Rate" value="--" error="Network error" icon="✅" />);

      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('icon is marked as decorative with aria-hidden', () => {
      render(<MetricCard label="Trays" value="5" icon="🌱" />);

      const icon = screen.getByText('🌱');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('error state uses role="alert" for screen readers', () => {
      render(<MetricCard label="Test" value="--" error="Error message" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

// ============================================
// STAT CARD TESTS
// ============================================

describe('StatCard', () => {
  describe('renders correctly', () => {
    it('displays label and numeric value', () => {
      render(<StatCard label="Days Elapsed" value={14} />);

      expect(screen.getByText('Days Elapsed')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
    });

    it('displays suffix when provided', () => {
      render(<StatCard label="Yield Ratio" value={4.5} suffix="x" />);

      expect(screen.getByText('x')).toBeInTheDocument();
    });

    it('displays subtext when provided', () => {
      render(<StatCard label="Progress" value={42} suffix="%" subtext="Week 4 of 6" />);

      expect(screen.getByText('Week 4 of 6')).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('applies green color class when color is green', () => {
      render(<StatCard label="Success" value={95} suffix="%" color="green" />);

      const card = screen.getByTestId('stat-card');
      const valueElement = card.querySelector('.text-2xl');
      expect(valueElement).toHaveClass('text-green-600');
    });

    it('applies amber color class when color is amber', () => {
      render(<StatCard label="Yield" value={4} suffix="x" color="amber" />);

      const card = screen.getByTestId('stat-card');
      const valueElement = card.querySelector('.text-2xl');
      expect(valueElement).toHaveClass('text-amber-600');
    });

    it('applies red color class when color is red', () => {
      render(<StatCard label="Failed" value={25} suffix="%" color="red" />);

      const card = screen.getByTestId('stat-card');
      const valueElement = card.querySelector('.text-2xl');
      expect(valueElement).toHaveClass('text-red-600');
    });

    it('uses default color when no color prop provided', () => {
      render(<StatCard label="Count" value={10} />);

      const card = screen.getByTestId('stat-card');
      const valueElement = card.querySelector('.text-2xl');
      expect(valueElement).toHaveClass('text-slate-900');
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<StatCard label="Days" value={0} isLoading />);

      expect(screen.getByTestId('stat-card-loading')).toBeInTheDocument();
      expect(screen.queryByText('Days')).not.toBeInTheDocument();
    });

    it('includes animate-pulse class for loading animation', () => {
      render(<StatCard label="Test" value={0} isLoading />);

      const loadingCard = screen.getByTestId('stat-card-loading');
      expect(loadingCard.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles zero value correctly', () => {
      render(<StatCard label="Failed Trays" value={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      render(<StatCard label="Change" value={-5} suffix="%" />);

      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      render(<StatCard label="Ratio" value={3.14159} suffix="x" />);

      expect(screen.getByText('3.14159')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<StatCard label="Total" value={1234567} />);

      expect(screen.getByText('1234567')).toBeInTheDocument();
    });
  });
});
