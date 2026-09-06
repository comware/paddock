/**
 * MetricsCards - Summary metrics for the propagation dashboard.
 *
 * Uses the shared StatCard so this row reads the same as the equivalent row in microgreens
 * and vegetables. It used to have its own card: emoji beside the label on the first line,
 * figure underneath. Same four numbers, a different shape to read.
 *
 * The local card also carried a `trend` prop that no caller ever passed. It went with the
 * card rather than being carried over - if a trend is wanted here later, it belongs on the
 * shared StatCard where every module gets it.
 */

import { Boxes, Sprout, CircleCheck, TrendingUp } from 'lucide-react';
import { StatCard, StatCardGrid } from '@/components/shared';

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
    <StatCardGrid>
      <StatCard
        Icon={Boxes}
        value={activeBatches}
        label="Active Batches"
        subValue="in progress"
      />
      <StatCard
        Icon={Sprout}
        value={totalPropagules}
        label="Propagules"
        subValue="in active batches"
      />
      <StatCard
        Icon={CircleCheck}
        value={successRate > 0 ? `${successRate}%` : '--'}
        label="Success Rate"
        subValue="graduated vs failed"
      />
      <StatCard
        Icon={TrendingUp}
        value={averageSurvivalRate > 0 ? `${averageSurvivalRate}%` : '--'}
        label="Survival Rate"
        subValue="average across batches"
      />
    </StatCardGrid>
  );
}
