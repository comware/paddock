/**
 * PropaguleDetail - Comprehensive view of a single propagule
 *
 * Displays:
 * - Full metadata (species, method, dates, measurements)
 * - Photo gallery
 * - Stage timeline (reusing batch timeline component)
 * - Measurement history
 * - Health score history
 * - Link back to parent batch
 *
 * Route: /propagation/propagules/:id
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { usePropagules } from '../../stores/usePropagules';
import { useBatches } from '../../stores/useBatches';
import { useStageTransitions, type TransitionWithDuration } from '../../stores/useStageTransitions';
import type { PropagationStage, FailureReason } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
  getValidNextStages,
  isActiveStage,
  getMethodDisplayName,
} from '../../utils';
import { PropaguleUpdateForm } from './PropaguleUpdateForm';

// ============================================
// CONSTANTS
// ============================================

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
 * Health score display with stars.
 */
function HealthDisplay({ score }: { score?: number }) {
  const filledStars = score ?? 0;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={`text-xl ${
          i <= filledStars
            ? 'text-yellow-400'
            : 'text-slate-300 dark:text-slate-600'
        }`}
      >
        *
      </span>
    );
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const label = score ? labels[score] : 'Not rated';

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">{stars}</div>
      <span className="text-sm text-slate-500 dark:text-slate-400">({label})</span>
    </div>
  );
}

/**
 * Transition History for propagule.
 */
function PropaguleTransitionHistory({
  propaguleId,
}: {
  propaguleId: string;
}) {
  const { transitions } = useStageTransitions();

  const propaguleTransitions = useMemo(() => {
    return transitions
      .filter((t) => t.propaguleId === propaguleId)
      .sort((a, b) => new Date(b.transitionDate).getTime() - new Date(a.transitionDate).getTime());
  }, [transitions, propaguleId]);

  if (propaguleTransitions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No transition history recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {propaguleTransitions.map((transition) => (
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

          {/* Failure reason */}
          {transition.failureReason && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Reason: {FAILURE_REASON_NAMES[transition.failureReason as FailureReason]}
            </div>
          )}

          {/* Notes */}
          {transition.notes && (
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">
              "{transition.notes}"
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Simple Stage Timeline for propagule (vertical).
 */
function PropaguleStageTimeline({
  currentStage,
  createdAt,
}: {
  currentStage: PropagationStage;
  createdAt: Date;
}) {
  const stages: PropagationStage[] = [
    'taken',
    'rooting',
    'rooted',
    'potted_up',
    'hardening',
    'ready',
    'graduated',
  ];

  const currentIndex = stages.indexOf(currentStage);
  const isFailed = currentStage === 'failed';

  return (
    <div className="py-2">
      {stages.map((stage, index) => {
        const isCompleted = !isFailed && index < currentIndex;
        const isCurrent = !isFailed && index === currentIndex;
        const isFuture = !isFailed && index > currentIndex;
        const colors = getStageColors(stage);

        return (
          <div key={stage} className="flex items-start gap-3">
            {/* Node and Connector */}
            <div className="flex flex-col items-center">
              {/* Node */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  isCompleted
                    ? `${colors.bg} ${colors.text}`
                    : isCurrent
                      ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ring-primary-500`
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              {/* Connector */}
              {index < stages.length - 1 && (
                <div
                  className={`w-0.5 h-10 ${
                    isCompleted || isCurrent
                      ? 'bg-primary-300 dark:bg-primary-600'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pt-1 pb-3">
              <div className={`font-medium ${isFuture ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                {getStageDisplayName(stage)}
              </div>
              {isCurrent && (
                <div className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  Current Stage
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Failed indicator if applicable */}
      {isFailed && (
        <div className="flex items-start gap-3 mt-2">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-800 border-2 border-red-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="pt-1">
            <div className="font-medium text-red-700 dark:text-red-400">
              Failed
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Propagule did not complete
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Photo Gallery component.
 */
function PhotoGallery({ photoUrls }: { photoUrls: string[] }) {
  if (photoUrls.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No photos yet. Add photos via the update form.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photoUrls.map((url, index) => (
        <div
          key={index}
          className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700"
        >
          <img
            src={url}
            alt={`Photo ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PropaguleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stores
  const {
    getPropaguleById,
    loadPropagules,
    isLoading: propagulesLoading,
  } = usePropagules();
  const { getBatchById, loadBatches } = useBatches();
  const { loadTransitions } = useStageTransitions();

  // Modal state
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateMode, setUpdateMode] = useState<'update' | 'advance' | 'fail'>('update');

  // Load data
  useEffect(() => {
    loadPropagules();
    loadBatches();
    loadTransitions();
  }, [loadPropagules, loadBatches, loadTransitions]);

  // Get propagule data
  const propagule = useMemo(() => {
    if (!id) return null;
    return getPropaguleById(id);
  }, [id, getPropaguleById]);

  // Get parent batch data
  const parentBatch = useMemo(() => {
    if (!propagule?.batchId) return null;
    return getBatchById(propagule.batchId);
  }, [propagule?.batchId, getBatchById]);

  // Computed values
  const validNextStages = propagule ? getValidNextStages(propagule.stage) : [];
  const canAdvance = validNextStages.length > 0 && propagule?.stage !== 'failed';
  const canRecordFailure = propagule ? isActiveStage(propagule.stage) : false;
  const stageColors = propagule ? getStageColors(propagule.stage) : null;

  // Modal handlers
  const handleOpenUpdateModal = () => {
    setUpdateMode('update');
    setUpdateModalOpen(true);
  };

  const handleOpenAdvanceModal = () => {
    setUpdateMode('advance');
    setUpdateModalOpen(true);
  };

  const handleOpenFailureModal = () => {
    setUpdateMode('fail');
    setUpdateModalOpen(true);
  };

  const handleModalClose = () => {
    setUpdateModalOpen(false);
  };

  // Loading state
  if (propagulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading propagule...</div>
      </div>
    );
  }

  // Propagule not found (404 state)
  if (!propagule) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">?</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Propagule Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This propagule doesn't exist or may have been deleted.
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
      {parentBatch ? (
        <Link
          to={`/propagation/batches/${parentBatch.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span>&larr;</span>
          <span>Back to Batch {parentBatch.batchNumber}</span>
        </Link>
      ) : (
        <Link
          to="/propagation/batches"
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span>&larr;</span>
          <span>Back to Batches</span>
        </Link>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {propagule.propaguleNumber}
              </h1>
              {stageColors && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors.bg} ${stageColors.text}`}
                >
                  {getStageDisplayName(propagule.stage)}
                </span>
              )}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-300">
              {propagule.species}
              {propagule.variety && <span className="text-slate-400"> - {propagule.variety}</span>}
            </div>
            {propagule.label && (
              <div className="text-primary-600 dark:text-primary-400 font-medium mt-1">
                {propagule.label}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleOpenUpdateModal}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Update
            </button>
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
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details and History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health and Measurements */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Health & Measurements" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Health Score">
                  <HealthDisplay score={propagule.healthScore} />
                </MetadataRow>
                <MetadataRow label="Height" value={propagule.heightCm ? `${propagule.heightCm} cm` : undefined} />
                <MetadataRow label="Stem Diameter" value={propagule.stemDiameterMm ? `${propagule.stemDiameterMm} mm` : undefined} />
              </div>
              <div>
                <MetadataRow label="Leaf Count" value={propagule.leafCount} />
                <MetadataRow label="Root Score" value={propagule.rootScore ? `${propagule.rootScore}/5` : undefined} />
                <MetadataRow label="Days in Stage" value={formatDaysInStage(propagule.daysInStage)} />
              </div>
            </div>
          </div>

          {/* Propagule Details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Species" value={propagule.species} />
                <MetadataRow label="Variety" value={propagule.variety} />
                <MetadataRow label="Method" value={getMethodDisplayName(propagule.method)} />
              </div>
              <div>
                <MetadataRow
                  label="Created"
                  value={format(new Date(propagule.createdAt), 'MMM d, yyyy')}
                />
                <MetadataRow label="Days Since Taken" value={propagule.daysSinceTaken} />
                {propagule.stationName && (
                  <MetadataRow label="Station" value={propagule.stationName} />
                )}
              </div>
            </div>

            {/* Grafting Details */}
            {(propagule.scionSource || propagule.rootstockType) && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Grafting Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {propagule.scionSource && (
                    <MetadataRow label="Scion Source" value={propagule.scionSource} />
                  )}
                  {propagule.rootstockType && (
                    <MetadataRow label="Rootstock Type" value={propagule.rootstockType} />
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {propagule.notes && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes
                </h4>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {propagule.notes}
                </p>
              </div>
            )}
          </div>

          {/* Photo Gallery */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Photos" />
            <PhotoGallery photoUrls={propagule.photoUrls} />
          </div>

          {/* Transition History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Transition History" />
            <PropaguleTransitionHistory propaguleId={id!} />
          </div>
        </div>

        {/* Right Column - Timeline and Links */}
        <div className="space-y-6">
          {/* Stage Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Stage Timeline" />
            <PropaguleStageTimeline
              currentStage={propagule.stage}
              createdAt={new Date(propagule.createdAt)}
            />
          </div>

          {/* Related Links */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Related" />
            <div className="space-y-3">
              {/* Parent Batch Link */}
              {parentBatch && (
                <Link
                  to={`/propagation/batches/${parentBatch.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      Parent Batch
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                      {parentBatch.batchNumber}
                    </div>
                  </div>
                  <span className="text-purple-500">&rarr;</span>
                </Link>
              )}

              {/* Station Link */}
              <Link
                to={`/propagation/stations/${propagule.stationId}`}
                className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Station
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {propagule.stationName || propagule.stationId}
                  </div>
                </div>
                <span className="text-blue-500">&rarr;</span>
              </Link>

              {/* Mother Plant Link (if linked) */}
              {propagule.motherPlantId && (
                <Link
                  to={`/propagation/mother-plants/${propagule.motherPlantId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">
                      Mother Plant
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      View Source Plant
                    </div>
                  </div>
                  <span className="text-green-500">&rarr;</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Quick Stats" />
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-slate-600 dark:text-slate-400">Total Days</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {propagule.daysSinceTaken}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-slate-600 dark:text-slate-400">Current Stage</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors?.bg} ${stageColors?.text}`}>
                  {getStageDisplayName(propagule.stage)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-slate-600 dark:text-slate-400">Days in Stage</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {propagule.daysInStage}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {id && (
        <PropaguleUpdateForm
          propaguleId={id}
          isOpen={updateModalOpen}
          onClose={handleModalClose}
          mode={updateMode}
        />
      )}
    </div>
  );
}
