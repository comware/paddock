/**
 * MetricsCards - Summary metrics for propagation dashboard
 *
 * Displays at-a-glance statistics:
 * - Active batches count
 * - Propagules in progress
 * - Overall success rate
 */

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
}

function MetricCard({ label, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </div>
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
        >
          {trend.direction === 'up' && '+'}
          {trend.label}
        </div>
      )}
    </div>
  );
}

interface MetricsCardsProps {
  activeBatches: number;
  totalPropagules: number;
  successRate: number;
  averageSurvivalRate: number;
}

export function MetricsCards({
  activeBatches,
  totalPropagules,
  successRate,
  averageSurvivalRate,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label="Active Batches"
        value={String(activeBatches)}
        icon="📦"
        subtitle="in progress"
      />
      <MetricCard
        label="Propagules"
        value={String(totalPropagules)}
        icon="🌱"
        subtitle="in active batches"
      />
      <MetricCard
        label="Success Rate"
        value={successRate > 0 ? `${successRate}%` : '--'}
        icon="✅"
        subtitle="graduated vs failed"
      />
      <MetricCard
        label="Survival Rate"
        value={averageSurvivalRate > 0 ? `${averageSurvivalRate}%` : '--'}
        icon="💪"
        subtitle="average across batches"
      />
    </div>
  );
}
