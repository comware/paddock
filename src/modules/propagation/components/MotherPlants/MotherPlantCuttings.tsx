/**
 * MotherPlantCuttings - Propagation history list for a mother plant.
 *
 * Extracted from MotherPlantDetail.tsx for code health.
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { PropBatchWithComputed } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils';
import { SectionHeader } from './MotherPlantInfo';

interface MotherPlantCuttingsProps {
  batches: PropBatchWithComputed[];
  isActive: boolean;
  onTakeCutting: () => void;
}

export function MotherPlantCuttings({
  batches,
  isActive,
  onTakeCutting,
}: MotherPlantCuttingsProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <SectionHeader title="Propagation History" />
      {batches.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No batches have been taken from this mother plant yet.
          {isActive && (
            <div className="mt-4">
              <button
                onClick={onTakeCutting}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                Take First Cutting
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {batches.slice(0, 10).map((batch) => {
            const stageColors = getStageColors(batch.stage);
            return (
              <Link
                key={batch.id}
                to={`/propagation/batches/${batch.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {batch.batchNumber}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(batch.dateTaken), 'MMM d, yyyy')} - {batch.quantityStarted} started
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
                  >
                    {getStageDisplayName(batch.stage)}
                  </span>
                  <span className="text-slate-400">&rarr;</span>
                </div>
              </Link>
            );
          })}
          {batches.length > 10 && (
            <div className="text-center py-2 text-sm text-slate-500 dark:text-slate-400">
              ... and {batches.length - 10} more batches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
