/**
 * BatchDetail - Comprehensive view of a single propagation batch
 *
 * Displays:
 * - All batch metadata (species, method, dates, quantities)
 * - Stage timeline visualization
 * - Transition history
 * - Action buttons (Advance Stage, Record Failure, Edit)
 * - Related entity links (mother plant, station)
 *
 * Route: /propagation/batches/:id
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useBatches } from '../../stores/useBatches';
import { useStageTransitions } from '../../stores/useStageTransitions';
import type { FailureReason } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
  getValidNextStages,
  isActiveStage,
} from '../../utils';
import { StageTimeline } from './StageTimeline';
import { StageTransitionModal, type TransitionMode } from './StageTransitionModal';

// ============================================
// CONSTANTS
// ============================================

/**
 * Display names for propagation methods.
 */
const METHOD_DISPLAY_NAMES: Record<string, string> = {
  cutting_softwood: 'Softwood Cutting',
  cutting_semi_hardwood: 'Semi-Hardwood Cutting',
  cutting_hardwood: 'Hardwood Cutting',
  cutting_leaf: 'Leaf Cutting',
  cutting_root: 'Root Cutting',
  division: 'Division',
  layering_simple: 'Simple Layering',
  layering_air: 'Air Layering',
  grafting_whip: 'Whip Graft',
  grafting_cleft: 'Cleft Graft',
  grafting_bud: 'Bud Graft',
  seed: 'Seed',
};

/**
 * Display names for failure reasons.
 */
const FAILURE_REASON_NAMES: Record<FailureReason, string> = {
  rot: 'Rot (Fungal/Bacterial)',
  dried_out: 'Dried Out',
  disease: 'Disease',
  pest: 'Pest Damage',
  no_roots: 'No Root Development',
  transplant_shock: 'Transplant Shock',
  environmental: 'Environmental Issues',
  unknown: 'Unknown',
};


// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Metadata row component for consistent styling.
 */
function MetadataRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      {children || (
        <span className="text-slate-900 dark:text-white font-medium">
          {value ?? '-'}
        </span>
      )}
    </div>
  );
}

/**
 * Section header component.
 */
function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
      {icon && <span>{icon}</span>}
      {title}
    </h3>
  );
}

/**
 * Transition History List.
 */
function TransitionHistory({
  batchId,
}: {
  batchId: string;
}) {
  const { getTransitionsWithDuration } = useStageTransitions();
  const transitions = getTransitionsWithDuration(batchId);

  if (transitions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No transition history recorded.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transitions.map((transition) => (
        <div
          key={transition.id}
          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {transition.fromStage ? (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStageColors(transition.fromStage).bg} ${getStageColors(transition.fromStage).text}`}>
                    {getStageDisplayName(transition.fromStage)}
                  </span>
                  <span className="text-slate-400">-&gt;</span>
                </>
              ) : null}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStageColors(transition.toStage).bg} ${getStageColors(transition.toStage).text}`}>
                {getStageDisplayName(transition.toStage)}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {format(new Date(transition.transitionDate), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          {/* Quantity change */}
          {transition.quantityBefore !== undefined &&
            transition.quantityAfter !== undefined &&
            transition.quantityBefore !== transition.quantityAfter && (
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                Quantity: {transition.quantityBefore} -&gt; {transition.quantityAfter}
                <span className="text-red-500 ml-1">
                  (-{transition.quantityBefore - transition.quantityAfter})
                </span>
              </div>
            )}

          {/* Failure reason */}
          {transition.failureReason && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Reason: {FAILURE_REASON_NAMES[transition.failureReason]}
            </div>
          )}

          {/* Notes */}
          {transition.notes && (
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">
              "{transition.notes}"
            </div>
          )}

          {/* Duration in stage */}
          {transition.durationDays !== null && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Spent {formatDaysInStage(transition.durationDays)} in this stage
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stores
  const {
    getBatchById,
    loadBatches,
    isLoading,
  } = useBatches();
  const {
    loadTransitions,
    getTransitionsWithDuration,
  } = useStageTransitions();

  // Modal state
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>('advance');

  // Load data
  useEffect(() => {
    loadBatches();
    loadTransitions();
  }, [loadBatches, loadTransitions]);

  // Get batch data
  const batch = useMemo(() => {
    if (!id) return null;
    return getBatchById(id);
  }, [id, getBatchById]);

  // Get transitions
  const transitions = useMemo(() => {
    if (!id) return [];
    return getTransitionsWithDuration(id);
  }, [id, getTransitionsWithDuration]);

  // Computed values
  const validNextStages = batch ? getValidNextStages(batch.stage) : [];
  const canAdvance = validNextStages.length > 0 && batch?.stage !== 'failed';
  const canRecordFailure = batch ? isActiveStage(batch.stage) : false;
  const stageColors = batch ? getStageColors(batch.stage) : null;

  // Modal handlers
  const handleOpenAdvanceModal = () => {
    setTransitionMode('advance');
    setTransitionModalOpen(true);
  };

  const handleOpenFailureModal = () => {
    setTransitionMode('fail');
    setTransitionModalOpen(true);
  };

  const handleModalClose = () => {
    setTransitionModalOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading batch...</div>
      </div>
    );
  }

  // Batch not found (404 state)
  if (!batch) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">?</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Batch Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This batch doesn't exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/propagation/batches')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to Batches
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/propagation/batches"
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span>&larr;</span>
        <span>Back to Batches</span>
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {batch.batchNumber}
              </h1>
              {stageColors && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors.bg} ${stageColors.text}`}
                >
                  {getStageDisplayName(batch.stage)}
                </span>
              )}
              {batch.isOverdue && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Overdue
                </span>
              )}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-300">
              {batch.species}
              {batch.variety && <span className="text-slate-400"> - {batch.variety}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canAdvance && (
              <button
                onClick={handleOpenAdvanceModal}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                Advance Stage
              </button>
            )}
            {canRecordFailure && (
              <button
                onClick={handleOpenFailureModal}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
              >
                Record Failure
              </button>
            )}
            <button
              onClick={() => navigate(`/propagation/batches/${id}/edit`)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Edit Batch
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Metadata */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Batch Details" icon="?" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Batch Number" value={batch.batchNumber} />
                <MetadataRow label="Species" value={batch.species} />
                <MetadataRow label="Variety" value={batch.variety} />
                <MetadataRow
                  label="Method"
                  value={METHOD_DISPLAY_NAMES[batch.method] || batch.method}
                />
                <MetadataRow
                  label="Date Taken"
                  value={format(new Date(batch.dateTaken), 'MMM d, yyyy')}
                />
              </div>
              <div>
                <MetadataRow label="Started" value={batch.quantityStarted} />
                <MetadataRow label="Surviving" value={batch.quantitySurviving} />
                <MetadataRow
                  label="Survival Rate"
                  value={`${batch.survivalRate}%`}
                />
                <MetadataRow
                  label="Days Since Taken"
                  value={batch.daysSinceTaken}
                />
                <MetadataRow
                  label="Days in Stage"
                  value={formatDaysInStage(batch.daysInStage)}
                />
              </div>
            </div>
          </div>

          {/* Preparation Notes */}
          {(batch.preparationNotes || batch.rootingMedium || batch.hormoneUsed) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <SectionHeader title="Preparation Details" icon="?" />
              {batch.rootingMedium && (
                <MetadataRow label="Rooting Medium" value={batch.rootingMedium} />
              )}
              {batch.hormoneUsed && (
                <MetadataRow label="Hormone Used" value={batch.hormoneUsed} />
              )}
              {batch.preparationNotes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Notes
                  </label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {batch.preparationNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Transition History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Transition History" icon="?" />
            <TransitionHistory batchId={id!} />
          </div>
        </div>

        {/* Right Column - Timeline and Links */}
        <div className="space-y-6">
          {/* Stage Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Stage Timeline" icon="?" />
            <StageTimeline
              batch={batch}
              transitions={transitions}
              orientation="vertical"
            />
          </div>

          {/* Related Links */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Related" icon="?" />
            <div className="space-y-3">
              {/* Station Link */}
              <Link
                to={`/propagation/stations/${batch.stationId}`}
                className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Station
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {batch.stationName || batch.stationId}
                  </div>
                </div>
                <span className="text-blue-500">&rarr;</span>
              </Link>

              {/* Mother Plant Link (if linked) */}
              {batch.motherPlantId && (
                <Link
                  to={`/propagation/mother-plants/${batch.motherPlantId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">
                      Mother Plant
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      {batch.motherPlantLabel || batch.motherPlantId}
                    </div>
                  </div>
                  <span className="text-green-500">&rarr;</span>
                </Link>
              )}

              {/* Cost Summary Placeholder */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Cost Summary
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  Coming in v2
                </div>
              </div>

              {/* Photo Gallery Placeholder */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Photo Gallery
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {batch.photoUrls.length > 0
                    ? `${batch.photoUrls.length} photos`
                    : 'No photos yet'}
                </div>
              </div>
            </div>
          </div>

          {/* Key Dates */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Key Dates" icon="?" />
            <div className="space-y-2 text-sm">
              <MetadataRow
                label="Taken"
                value={format(new Date(batch.dateTaken), 'MMM d, yyyy')}
              />
              {batch.dateRooted && (
                <MetadataRow
                  label="Rooted"
                  value={format(new Date(batch.dateRooted), 'MMM d, yyyy')}
                />
              )}
              {batch.datePottedUp && (
                <MetadataRow
                  label="Potted Up"
                  value={format(new Date(batch.datePottedUp), 'MMM d, yyyy')}
                />
              )}
              {batch.dateHardeningStarted && (
                <MetadataRow
                  label="Hardening Started"
                  value={format(new Date(batch.dateHardeningStarted), 'MMM d, yyyy')}
                />
              )}
              {batch.dateReady && (
                <MetadataRow
                  label="Ready"
                  value={format(new Date(batch.dateReady), 'MMM d, yyyy')}
                />
              )}
              {batch.dateGraduated && (
                <MetadataRow
                  label="Graduated"
                  value={format(new Date(batch.dateGraduated), 'MMM d, yyyy')}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Transition Modal */}
      {id && (
        <StageTransitionModal
          batchId={id}
          isOpen={transitionModalOpen}
          onClose={handleModalClose}
          mode={transitionMode}
        />
      )}
    </div>
  );
}
