/**
 * ReadyToGraduate - Dashboard widget for batches ready to graduate
 *
 * Displays batches in the "ready" stage that are waiting to be graduated.
 * Helps users know when propagules are ready to plant, gift, or sell.
 *
 * Features:
 * - List batches in "ready" stage
 * - Days in ready stage display
 * - Quantity available display
 * - Species and method badges
 * - Quick graduation action button
 * - Collapse if no items ready
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PropBatchWithComputed } from '../../types';
import {
  STAGE_COLORS,
  formatDaysInStage,
} from '../../utils/stageHelpers';
import { GraduationModal } from './GraduationModal';

// ============================================
// CONSTANTS
// ============================================

/**
 * Display names for propagation methods (short form).
 */
const METHOD_SHORT_NAMES: Record<string, string> = {
  cutting_softwood: 'Softwood',
  cutting_semi_hardwood: 'Semi-HW',
  cutting_hardwood: 'Hardwood',
  cutting_leaf: 'Leaf',
  cutting_root: 'Root',
  division: 'Division',
  layering_simple: 'Layer',
  layering_air: 'Air Layer',
  grafting_whip: 'Whip Graft',
  grafting_cleft: 'Cleft Graft',
  grafting_bud: 'Bud Graft',
  seed: 'Seed',
};

/**
 * Get short display name for method.
 */
function getMethodShortName(method: string): string {
  return METHOD_SHORT_NAMES[method] || method;
}

// ============================================
// TYPES
// ============================================

interface ReadyToGraduateProps {
  /** Batches in ready stage */
  readyBatches: PropBatchWithComputed[];
  /** Maximum items to display before showing "view all" */
  maxItems?: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ReadyToGraduate({
  readyBatches,
  maxItems = 5,
}: ReadyToGraduateProps) {
  const navigate = useNavigate();

  // Modal state
  const [graduationModalOpen, setGraduationModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Sort by days in ready stage (longest first)
  const sortedBatches = useMemo(
    () => [...readyBatches].sort((a, b) => b.daysInStage - a.daysInStage),
    [readyBatches]
  );

  const totalReady = readyBatches.length;
  const totalQuantity = readyBatches.reduce((sum, b) => sum + b.quantitySurviving, 0);

  // Handle graduation button click
  const handleGraduate = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBatchId(batchId);
    setGraduationModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setGraduationModalOpen(false);
    setSelectedBatchId(null);
  };

  // Handle successful graduation
  const handleGraduationSuccess = () => {
    // The modal handles closing itself, batches will auto-refresh
    // through the store subscription
  };

  // Empty state - collapse if no items
  if (totalReady === 0) {
    return null;
  }

  const stageColors = STAGE_COLORS['ready'];

  return (
    <>
      <div className="card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Ready to Graduate
            </h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}>
              {totalReady} batch{totalReady !== 1 ? 'es' : ''}
            </span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {totalQuantity} total propagule{totalQuantity !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Summary Banner */}
        <div
          className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          onClick={() => navigate('/propagation/batches?stage=ready')}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">^</span>
            <div>
              <span className="font-medium text-purple-800 dark:text-purple-200">
                {totalQuantity} propagule{totalQuantity !== 1 ? 's' : ''} ready
              </span>
              <span className="text-sm text-purple-600 dark:text-purple-300 ml-2">
                across {totalReady} batch{totalReady !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Batch List */}
        <div className="space-y-2">
          {sortedBatches.slice(0, maxItems).map((batch) => (
            <div
              key={batch.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/propagation/batches/${batch.id}`)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg shrink-0">^</span>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">
                    {batch.batchNumber} - {batch.species}
                    {batch.variety && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        '{batch.variety}'
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {/* Method Badge */}
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {getMethodShortName(batch.method)}
                    </span>
                    {/* Days in Ready */}
                    <span className="text-slate-500 dark:text-slate-400">
                      Ready for {formatDaysInStage(batch.daysInStage)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Quantity and Action */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Quantity Badge */}
                <span className="px-2 py-1 rounded text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {batch.quantitySurviving} available
                </span>
                {/* Graduate Button */}
                <button
                  onClick={(e) => handleGraduate(batch.id!, e)}
                  className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  Graduate
                </button>
              </div>
            </div>
          ))}

          {/* Show more link */}
          {sortedBatches.length > maxItems && (
            <button
              onClick={() => navigate('/propagation/batches?stage=ready')}
              className="w-full py-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              View all {sortedBatches.length} ready batches
            </button>
          )}
        </div>
      </div>

      {/* Graduation Modal */}
      {selectedBatchId && (
        <GraduationModal
          batchId={selectedBatchId}
          isOpen={graduationModalOpen}
          onClose={handleModalClose}
          onSuccess={handleGraduationSuccess}
        />
      )}
    </>
  );
}
