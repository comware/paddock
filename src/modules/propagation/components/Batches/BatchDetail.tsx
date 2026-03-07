/** BatchDetail - Comprehensive view of a single propagation batch. */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useBatches } from '../../stores/useBatches';
import { useStageTransitions } from '../../stores/useStageTransitions';
import { useBatchCosts } from '../../stores/useBatchCosts';
import { useGraduations } from '../../stores/useGraduations';
import { getStageDisplayName, getStageColors, formatDaysInStage, getValidNextStages, isActiveStage } from '../../utils';
import { StageTimeline } from './StageTimeline';
import { StageTransitionModal, type TransitionMode } from './StageTransitionModal';
import { ExplodeBatchModal } from './ExplodeBatchModal';
import { CostBreakdown, CostSummary } from '../Costs';
import { GraduationForm, GraduationHistory } from '../Graduation';
import { usePropagules } from '../../stores/usePropagules';
import { MetadataRow, SectionHeader, TransitionHistory, METHOD_DISPLAY_NAMES } from './BatchMetrics';
import { BatchPropagulesList } from './BatchActions';

export function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stores
  const { getBatchById, loadBatches, isLoading } = useBatches();
  const { loadTransitions, getTransitionsWithDuration } = useStageTransitions();
  const { loadCosts } = useBatchCosts();
  const { loadGraduations } = useGraduations();
  const { getPropagulesByBatch, loadPropagules } = usePropagules();

  // Modal state
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>('advance');
  const [explodeModalOpen, setExplodeModalOpen] = useState(false);
  const [graduationModalOpen, setGraduationModalOpen] = useState(false);

  // Load data
  useEffect(() => {
    loadBatches();
    loadTransitions();
    loadCosts();
    loadPropagules();
    loadGraduations();
  }, [loadBatches, loadTransitions, loadCosts, loadPropagules, loadGraduations]);

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

  // Get propagules for this batch (if exploded)
  const batchPropagules = useMemo(() => {
    if (!id) return [];
    return getPropagulesByBatch(id);
  }, [id, getPropagulesByBatch]);

  // Computed values
  const validNextStages = batch ? getValidNextStages(batch.stage) : [];
  const canAdvance = validNextStages.length > 0 && batch?.stage !== 'failed';
  const canRecordFailure = batch ? isActiveStage(batch.stage) : false;
  const canExplode = batch
    ? !batch.isExploded && isActiveStage(batch.stage) && batch.quantitySurviving > 0
    : false;
  const canGraduate = batch
    ? (batch.stage === 'ready' || batch.stage === 'graduated') && batch.quantitySurviving > 0
    : false;
  const stageColors = batch ? getStageColors(batch.stage) : null;

  // Modal handlers
  const handleOpenAdvanceModal = () => { setTransitionMode('advance'); setTransitionModalOpen(true); };
  const handleOpenFailureModal = () => { setTransitionMode('fail'); setTransitionModalOpen(true); };
  const handleModalClose = () => { setTransitionModalOpen(false); };
  const handleExplodeSuccess = () => { loadBatches(); loadPropagules(); };
  const handleGraduationSuccess = () => { loadBatches(); loadGraduations(); };

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
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {batch.batchNumber}
              </h1>
              {stageColors && (
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${stageColors.bg} ${stageColors.text}`}>
                  {getStageDisplayName(batch.stage)}
                </span>
              )}
              {batch.isOverdue && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Overdue</span>
              )}
              {batch.isExploded && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Exploded</span>
              )}
            </div>
            <div className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {batch.species}
              {batch.variety && <span className="text-slate-400"> - {batch.variety}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {canGraduate && (
              <button onClick={() => setGraduationModalOpen(true)} className="min-h-[44px] px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 active:bg-green-700 transition-colors text-sm sm:text-base">Graduate</button>
            )}
            {canAdvance && (
              <button onClick={handleOpenAdvanceModal} className="min-h-[44px] px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors text-sm sm:text-base">Advance Stage</button>
            )}
            {canRecordFailure && (
              <button onClick={handleOpenFailureModal} className="min-h-[44px] px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 active:bg-red-300 transition-colors text-sm sm:text-base">Record Failure</button>
            )}
            {canExplode && (
              <button onClick={() => setExplodeModalOpen(true)} className="min-h-[44px] px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-medium hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 active:bg-purple-300 transition-colors text-sm sm:text-base col-span-2 sm:col-span-1">Explode to Individuals</button>
            )}
            {!batch.isExploded && (
              <button onClick={() => navigate(`/propagation/batches/${id}/edit`)} className="min-h-[44px] px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 active:bg-slate-300 transition-colors text-sm sm:text-base">Edit Batch</button>
            )}
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
                <MetadataRow label="Method" value={METHOD_DISPLAY_NAMES[batch.method] || batch.method} />
                <MetadataRow label="Date Taken" value={format(new Date(batch.dateTaken), 'MMM d, yyyy')} />
              </div>
              <div>
                <MetadataRow label="Started" value={batch.quantityStarted} />
                <MetadataRow label="Surviving" value={batch.quantitySurviving} />
                <MetadataRow label="Survival Rate" value={`${batch.survivalRate}%`} />
                <MetadataRow label="Days Since Taken" value={batch.daysSinceTaken} />
                <MetadataRow label="Days in Stage" value={formatDaysInStage(batch.daysInStage)} />
              </div>
            </div>
          </div>

          {/* Preparation Notes */}
          {(batch.preparationNotes || batch.rootingMedium || batch.hormoneUsed) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <SectionHeader title="Preparation Details" icon="?" />
              {batch.rootingMedium && <MetadataRow label="Rooting Medium" value={batch.rootingMedium} />}
              {batch.hormoneUsed && <MetadataRow label="Hormone Used" value={batch.hormoneUsed} />}
              {batch.preparationNotes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{batch.preparationNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Transition History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Transition History" icon="?" />
            <TransitionHistory batchId={id!} />
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Cost Breakdown" icon="$" />
            <CostBreakdown batchId={id!} />
          </div>

          {/* Graduation History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Graduation History" />
              {canGraduate && (
                <button onClick={() => setGraduationModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors">+ Graduate</button>
              )}
            </div>
            <GraduationHistory batchId={id!} />
          </div>

          {/* Individual Propagules (if exploded) */}
          {batch.isExploded && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <SectionHeader title="Individual Propagules" icon="*" />
              <BatchPropagulesList propagules={batchPropagules} />
            </div>
          )}
        </div>

        {/* Right Column - Timeline and Links */}
        <div className="space-y-6">
          {/* Stage Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Stage Timeline" icon="?" />
            <StageTimeline batch={batch} transitions={transitions} orientation="vertical" />
          </div>

          {/* Related Links */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Related" icon="?" />
            <div className="space-y-3">
              <Link to={`/propagation/stations/${batch.stationId}`} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Station</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">{batch.stationName || batch.stationId}</div>
                </div>
                <span className="text-blue-500">&rarr;</span>
              </Link>
              {batch.motherPlantId && (
                <Link to={`/propagation/mother-plants/${batch.motherPlantId}`} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">Mother Plant</div>
                    <div className="text-xs text-green-700 dark:text-green-300">{batch.motherPlantLabel || batch.motherPlantId}</div>
                  </div>
                  <span className="text-green-500">&rarr;</span>
                </Link>
              )}
              <CostSummary batchId={id!} compact />
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Photo Gallery</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{batch.photoUrls.length > 0 ? `${batch.photoUrls.length} photos` : 'No photos yet'}</div>
              </div>
            </div>
          </div>

          {/* Key Dates */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <SectionHeader title="Key Dates" icon="?" />
            <div className="space-y-2 text-sm">
              <MetadataRow label="Taken" value={format(new Date(batch.dateTaken), 'MMM d, yyyy')} />
              {batch.dateRooted && <MetadataRow label="Rooted" value={format(new Date(batch.dateRooted), 'MMM d, yyyy')} />}
              {batch.datePottedUp && <MetadataRow label="Potted Up" value={format(new Date(batch.datePottedUp), 'MMM d, yyyy')} />}
              {batch.dateHardeningStarted && <MetadataRow label="Hardening Started" value={format(new Date(batch.dateHardeningStarted), 'MMM d, yyyy')} />}
              {batch.dateReady && <MetadataRow label="Ready" value={format(new Date(batch.dateReady), 'MMM d, yyyy')} />}
              {batch.dateGraduated && <MetadataRow label="Graduated" value={format(new Date(batch.dateGraduated), 'MMM d, yyyy')} />}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {id && <StageTransitionModal batchId={id} isOpen={transitionModalOpen} onClose={handleModalClose} mode={transitionMode} />}
      {id && <ExplodeBatchModal batchId={id} isOpen={explodeModalOpen} onClose={() => setExplodeModalOpen(false)} onSuccess={handleExplodeSuccess} />}
      {id && <GraduationForm batchId={id} isOpen={graduationModalOpen} onClose={() => setGraduationModalOpen(false)} onSuccess={handleGraduationSuccess} />}
    </div>
  );
}
