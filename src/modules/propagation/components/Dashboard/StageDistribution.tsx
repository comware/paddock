/**
 * StageDistribution - Visual breakdown of batches by propagation stage
 *
 * Shows counts for each stage with clickable badges that can filter the batch list.
 */

import { clickable } from '@/lib/a11y/clickable';
import { useNavigate } from 'react-router-dom';
import type { PropagationStage } from '../../types';
import { STAGE_DISPLAY_NAMES, STAGE_COLORS, STAGE_ORDER } from '../../utils/stageHelpers';

interface StageDistributionProps {
  stageCounts: Record<PropagationStage | 'active', number>;
  onStageClick?: (stage: PropagationStage | 'active') => void;
}

export function StageDistribution({ stageCounts, onStageClick }: StageDistributionProps) {
  const navigate = useNavigate();

  // Calculate total active for bar widths
  const maxCount = Math.max(
    ...STAGE_ORDER.filter((s) => s !== 'graduated').map((s) => stageCounts[s] || 0),
    1 // Prevent division by zero
  );

  const handleStageClick = (stage: PropagationStage) => {
    if (onStageClick) {
      onStageClick(stage);
    } else {
      // Default: navigate to batch list with stage filter
      navigate(`/propagation/batches?stage=${stage}`);
    }
  };

  // Active (non-terminal) stages for the main display
  const activeStages = STAGE_ORDER.filter((s) => s !== 'graduated');

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Stage Distribution
        </h2>
        <button
          onClick={() => navigate('/propagation/batches')}
          className="text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          View All Batches
        </button>
      </div>

      {/* Stage bars */}
      <div className="space-y-3">
        {activeStages.map((stage) => {
          const count = stageCounts[stage] || 0;
          const colors = STAGE_COLORS[stage];
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div
              key={stage}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              {...clickable(() => handleStageClick(stage))}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {STAGE_DISPLAY_NAMES[stage]}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {count}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bg} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal states summary */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleStageClick('graduated')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg ${STAGE_COLORS.graduated.bg} ${STAGE_COLORS.graduated.text} hover:opacity-80 transition-opacity`}
            >
              <span>Graduated:</span>
              <span className="font-semibold">{stageCounts.graduated || 0}</span>
            </button>
            <button
              onClick={() => handleStageClick('failed')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg ${STAGE_COLORS.failed.bg} ${STAGE_COLORS.failed.text} hover:opacity-80 transition-opacity`}
            >
              <span>Failed:</span>
              <span className="font-semibold">{stageCounts.failed || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
