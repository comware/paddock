/**
 * Chart Component Tests
 *
 * Tests the CSS-based chart components used in analytics dashboards.
 * These components render bar charts, trend lines, and progress indicators
 * without external charting libraries.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================
// EXTRACTED CHART IMPLEMENTATIONS
// ============================================
// These mirror patterns from:
// - src/modules/microgreens/components/Analytics/TrendCharts.tsx
// - src/modules/propagation/components/Analytics/AnalyticsDashboard.tsx

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: 'green' | 'amber' | 'red' | 'primary';
  }>;
  maxValue?: number;
  height?: number;
  showLabels?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

function BarChart({
  data,
  maxValue,
  height = 128,
  showLabels = true,
  isLoading,
  emptyMessage = 'No data available',
}: BarChartProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-end gap-2"
        style={{ height }}
        data-testid="bar-chart-loading"
        role="img"
        aria-label="Loading chart data"
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t animate-pulse"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 dark:text-slate-400"
        style={{ height }}
        data-testid="bar-chart-empty"
        role="img"
        aria-label={emptyMessage}
      >
        {emptyMessage}
      </div>
    );
  }

  const calculatedMax = maxValue || Math.max(...data.map((d) => d.value), 1);

  const colorClasses = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    primary: 'bg-primary-500',
  };

  return (
    <div
      className="flex items-end gap-2"
      style={{ height }}
      data-testid="bar-chart"
      role="img"
      aria-label={`Bar chart showing ${data.length} data points`}
    >
      {data.map((item, i) => {
        const heightPercent = (item.value / calculatedMax) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {showLabels && (
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {item.value}
              </div>
            )}
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t transition-all ${
                  colorClasses[item.color || 'primary']
                }`}
                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                data-testid={`bar-${i}`}
                role="graphics-symbol"
                aria-label={`${item.label}: ${item.value}`}
              />
            </div>
            {showLabels && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {item.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'green' | 'amber' | 'red' | 'primary';
  isLoading?: boolean;
}

function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'primary',
  isLoading,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const colorClasses = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    primary: 'bg-primary-500',
  };

  if (isLoading) {
    return (
      <div data-testid="progress-bar-loading" role="progressbar" aria-busy="true">
        {label && (
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2 animate-pulse" />
        )}
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div data-testid="progress-bar">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}
      <div
        className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${percentage}%`}
      >
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
          data-testid="progress-fill"
        />
      </div>
    </div>
  );
}

interface MoodTrendProps {
  data: Array<{
    date: string;
    mood: number;
  }>;
  isLoading?: boolean;
}

function MoodTrend({ data, isLoading }: MoodTrendProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-end gap-1 h-24"
        data-testid="mood-trend-loading"
        role="img"
        aria-label="Loading mood data"
      >
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t animate-pulse"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-24 text-slate-500 dark:text-slate-400"
        data-testid="mood-trend-empty"
        role="img"
        aria-label="No mood data recorded"
      >
        No mood data recorded yet
      </div>
    );
  }

  return (
    <div data-testid="mood-trend" role="img" aria-label={`Mood trend over ${data.length} days`}>
      <div className="flex items-end gap-1 h-24">
        {data.map((day, i) => {
          const heightPercent = (day.mood / 10) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t transition-all ${
                    day.mood >= 7
                      ? 'bg-green-500'
                      : day.mood >= 5
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${day.date}: ${day.mood}/10`}
                  data-testid={`mood-bar-${i}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ============================================
// BAR CHART TESTS
// ============================================

describe('BarChart', () => {
  describe('renders data correctly', () => {
    it('displays all data points as bars', () => {
      const data = [
        { label: 'Week 1', value: 4 },
        { label: 'Week 2', value: 6 },
        { label: 'Week 3', value: 5 },
      ];

      render(<BarChart data={data} />);

      expect(screen.getByTestId('bar-0')).toBeInTheDocument();
      expect(screen.getByTestId('bar-1')).toBeInTheDocument();
      expect(screen.getByTestId('bar-2')).toBeInTheDocument();
    });

    it('displays labels when showLabels is true', () => {
      const data = [
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 20 },
      ];

      render(<BarChart data={data} showLabels />);

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('hides labels when showLabels is false', () => {
      const data = [{ label: 'Hidden', value: 5 }];

      render(<BarChart data={data} showLabels={false} />);

      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('calculates bar heights proportionally', () => {
      const data = [
        { label: 'A', value: 50 },
        { label: 'B', value: 100 },
      ];

      render(<BarChart data={data} />);

      const barA = screen.getByTestId('bar-0');
      const barB = screen.getByTestId('bar-1');

      // Bar B should be at 100%, Bar A at ~50%
      expect(barB.style.height).toBe('100%');
      expect(barA.style.height).toBe('50%');
    });
  });

  describe('color coding', () => {
    it('applies specified colors to bars', () => {
      const data = [
        { label: 'Good', value: 80, color: 'green' as const },
        { label: 'Warning', value: 60, color: 'amber' as const },
        { label: 'Bad', value: 30, color: 'red' as const },
      ];

      render(<BarChart data={data} />);

      expect(screen.getByTestId('bar-0')).toHaveClass('bg-green-500');
      expect(screen.getByTestId('bar-1')).toHaveClass('bg-amber-500');
      expect(screen.getByTestId('bar-2')).toHaveClass('bg-red-500');
    });

    it('uses primary color as default', () => {
      const data = [{ label: 'Default', value: 50 }];

      render(<BarChart data={data} />);

      expect(screen.getByTestId('bar-0')).toHaveClass('bg-primary-500');
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<BarChart data={[]} isLoading />);

      expect(screen.getByTestId('bar-chart-loading')).toBeInTheDocument();
    });

    it('includes accessible loading label', () => {
      render(<BarChart data={[]} isLoading />);

      expect(screen.getByRole('img', { name: 'Loading chart data' })).toBeInTheDocument();
    });

    it('shows animated pulse on loading bars', () => {
      render(<BarChart data={[]} isLoading />);

      const loadingChart = screen.getByTestId('bar-chart-loading');
      const animatedBars = loadingChart.querySelectorAll('.animate-pulse');
      expect(animatedBars.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('displays empty message when data is empty', () => {
      render(<BarChart data={[]} />);

      expect(screen.getByTestId('bar-chart-empty')).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('displays custom empty message when provided', () => {
      render(<BarChart data={[]} emptyMessage="Start tracking to see trends" />);

      expect(screen.getByText('Start tracking to see trends')).toBeInTheDocument();
    });

    it('includes accessible label for empty state', () => {
      render(<BarChart data={[]} emptyMessage="Custom message" />);

      expect(screen.getByRole('img', { name: 'Custom message' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has appropriate role and aria-label', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];

      render(<BarChart data={data} />);

      expect(screen.getByRole('img', { name: 'Bar chart showing 2 data points' })).toBeInTheDocument();
    });

    it('individual bars have accessible labels', () => {
      const data = [{ label: 'Week 1', value: 75 }];

      render(<BarChart data={data} />);

      expect(screen.getByRole('graphics-symbol', { name: 'Week 1: 75' })).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles zero values with minimum height', () => {
      const data = [{ label: 'Zero', value: 0 }];

      render(<BarChart data={data} />);

      const bar = screen.getByTestId('bar-0');
      // Should have minimum 5% height even for zero value
      expect(bar.style.height).toBe('5%');
    });

    it('respects custom maxValue', () => {
      const data = [{ label: 'A', value: 50 }];

      render(<BarChart data={data} maxValue={200} />);

      const bar = screen.getByTestId('bar-0');
      // 50/200 = 25%
      expect(bar.style.height).toBe('25%');
    });

    it('handles single data point', () => {
      const data = [{ label: 'Only', value: 100 }];

      render(<BarChart data={data} />);

      expect(screen.getByTestId('bar-0')).toBeInTheDocument();
    });
  });
});

// ============================================
// PROGRESS BAR TESTS
// ============================================

describe('ProgressBar', () => {
  describe('renders correctly', () => {
    it('displays label when provided', () => {
      render(<ProgressBar value={50} label="Progress to Goal" />);

      expect(screen.getByText('Progress to Goal')).toBeInTheDocument();
    });

    it('displays percentage when showPercentage is true', () => {
      render(<ProgressBar value={75} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
      render(<ProgressBar value={75} showPercentage={false} />);

      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('calculates percentage correctly with custom max', () => {
      render(<ProgressBar value={30} max={60} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('fill width', () => {
    it('sets correct fill width based on percentage', () => {
      render(<ProgressBar value={40} />);

      const fill = screen.getByTestId('progress-fill');
      expect(fill.style.width).toBe('40%');
    });

    it('caps at 100% for values exceeding max', () => {
      render(<ProgressBar value={150} max={100} />);

      const fill = screen.getByTestId('progress-fill');
      expect(fill.style.width).toBe('100%');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('color variants', () => {
    it('applies green color', () => {
      render(<ProgressBar value={50} color="green" />);

      expect(screen.getByTestId('progress-fill')).toHaveClass('bg-green-500');
    });

    it('applies amber color', () => {
      render(<ProgressBar value={50} color="amber" />);

      expect(screen.getByTestId('progress-fill')).toHaveClass('bg-amber-500');
    });

    it('applies red color', () => {
      render(<ProgressBar value={50} color="red" />);

      expect(screen.getByTestId('progress-fill')).toHaveClass('bg-red-500');
    });

    it('uses primary as default', () => {
      render(<ProgressBar value={50} />);

      expect(screen.getByTestId('progress-fill')).toHaveClass('bg-primary-500');
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton', () => {
      render(<ProgressBar value={0} isLoading />);

      expect(screen.getByTestId('progress-bar-loading')).toBeInTheDocument();
    });

    it('has aria-busy when loading', () => {
      render(<ProgressBar value={0} isLoading />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('accessibility', () => {
    it('has correct progressbar role and aria attributes', () => {
      render(<ProgressBar value={60} label="Upload Progress" />);

      const progressbar = screen.getByRole('progressbar', { name: 'Upload Progress' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '60');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('provides fallback label when no label prop', () => {
      render(<ProgressBar value={25} />);

      expect(screen.getByRole('progressbar', { name: 'Progress: 25%' })).toBeInTheDocument();
    });
  });
});

// ============================================
// MOOD TREND TESTS
// ============================================

describe('MoodTrend', () => {
  describe('renders data correctly', () => {
    it('displays bars for each data point', () => {
      const data = [
        { date: 'Jan 1', mood: 7 },
        { date: 'Jan 2', mood: 8 },
        { date: 'Jan 3', mood: 6 },
      ];

      render(<MoodTrend data={data} />);

      expect(screen.getByTestId('mood-bar-0')).toBeInTheDocument();
      expect(screen.getByTestId('mood-bar-1')).toBeInTheDocument();
      expect(screen.getByTestId('mood-bar-2')).toBeInTheDocument();
    });

    it('displays date range', () => {
      const data = [
        { date: 'Jan 1', mood: 7 },
        { date: 'Jan 14', mood: 8 },
      ];

      render(<MoodTrend data={data} />);

      expect(screen.getByText('Jan 1')).toBeInTheDocument();
      expect(screen.getByText('Jan 14')).toBeInTheDocument();
    });
  });

  describe('mood-based colors', () => {
    it('applies green for high mood (7+)', () => {
      const data = [{ date: 'Today', mood: 8 }];

      render(<MoodTrend data={data} />);

      expect(screen.getByTestId('mood-bar-0')).toHaveClass('bg-green-500');
    });

    it('applies amber for medium mood (5-6)', () => {
      const data = [{ date: 'Today', mood: 5 }];

      render(<MoodTrend data={data} />);

      expect(screen.getByTestId('mood-bar-0')).toHaveClass('bg-amber-500');
    });

    it('applies red for low mood (<5)', () => {
      const data = [{ date: 'Today', mood: 3 }];

      render(<MoodTrend data={data} />);

      expect(screen.getByTestId('mood-bar-0')).toHaveClass('bg-red-500');
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton', () => {
      render(<MoodTrend data={[]} isLoading />);

      expect(screen.getByTestId('mood-trend-loading')).toBeInTheDocument();
    });

    it('has accessible loading label', () => {
      render(<MoodTrend data={[]} isLoading />);

      expect(screen.getByRole('img', { name: 'Loading mood data' })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('displays empty message when no data', () => {
      render(<MoodTrend data={[]} />);

      expect(screen.getByTestId('mood-trend-empty')).toBeInTheDocument();
      expect(screen.getByText('No mood data recorded yet')).toBeInTheDocument();
    });

    it('has accessible empty state label', () => {
      render(<MoodTrend data={[]} />);

      expect(screen.getByRole('img', { name: 'No mood data recorded' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has chart role with data count label', () => {
      const data = [
        { date: 'Jan 1', mood: 7 },
        { date: 'Jan 2', mood: 8 },
      ];

      render(<MoodTrend data={data} />);

      expect(screen.getByRole('img', { name: 'Mood trend over 2 days' })).toBeInTheDocument();
    });

    it('bars have title tooltips', () => {
      const data = [{ date: 'Jan 15', mood: 9 }];

      render(<MoodTrend data={data} />);

      const bar = screen.getByTestId('mood-bar-0');
      expect(bar).toHaveAttribute('title', 'Jan 15: 9/10');
    });
  });
});
