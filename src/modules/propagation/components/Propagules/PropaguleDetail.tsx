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
import { useStageTransitions } from '../../stores/useStageTransitions';
import {
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
  getValidNextStages,
  isActiveStage,
  getMethodDisplayName,
} from '../../utils';
import { PropaguleUpdateForm } from './PropaguleUpdateForm';
import { MetadataRow, SectionHeader, HealthDisplay, PhotoGallery } from './PropaguleInfo';
import { PropaguleTransitionHistory, PropaguleStageTimeline } from './PropaguleObservations';
import { NotFound } from '@/components/shared';

// ============================================
// MAIN COMPONENT
// ============================================

export function PropaguleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stores
  const { getPropaguleById, loadPropagules, isLoading: propagulesLoading } = usePropagules();
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
  const handleOpenUpdateModal = () => { setUpdateMode('update'); setUpdateModalOpen(true); };
  const handleOpenAdvanceModal = () => { setUpdateMode('advance'); setUpdateModalOpen(true); };
  const handleOpenFailureModal = () => { setUpdateMode('fail'); setUpdateModalOpen(true); };

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
      <NotFound
        thing="Propagule"
        backTo={{ label: 'Back to batches', onClick: () => navigate('/propagation/batches') }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      {parentBatch ? (
        <Link to={`/propagation/batches/${parentBatch.id}`} className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <span>&larr;</span>
          <span>Back to Batch {parentBatch.batchNumber}</span>
        </Link>
      ) : (
        <Link to="/propagation/batches" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <span>&larr;</span>
          <span>Back to Batches</span>
        </Link>
      )}

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{propagule.propaguleNumber}</h1>
              {stageColors && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors.bg} ${stageColors.text}`}>
                  {getStageDisplayName(propagule.stage)}
                </span>
              )}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-300">
              {propagule.species}
              {propagule.variety && <span className="text-slate-400"> - {propagule.variety}</span>}
            </div>
            {propagule.label && (
              <div className="text-primary-600 dark:text-primary-400 font-medium mt-1">{propagule.label}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleOpenUpdateModal} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors">Update</button>
            {canAdvance && (
              <button onClick={handleOpenAdvanceModal} className="btn btn-primary">Advance Stage</button>
            )}
            {canRecordFailure && (
              <button onClick={handleOpenFailureModal} className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors">Record Failure</button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health and Measurements */}
          <div className="card p-6">
            <SectionHeader title="Health & Measurements" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Health Score"><HealthDisplay score={propagule.healthScore} /></MetadataRow>
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
          <div className="card p-6">
            <SectionHeader title="Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <MetadataRow label="Species" value={propagule.species} />
                <MetadataRow label="Variety" value={propagule.variety} />
                <MetadataRow label="Method" value={getMethodDisplayName(propagule.method)} />
              </div>
              <div>
                <MetadataRow label="Created" value={format(new Date(propagule.createdAt), 'MMM d, yyyy')} />
                <MetadataRow label="Days Since Taken" value={propagule.daysSinceTaken} />
                {propagule.stationName && <MetadataRow label="Station" value={propagule.stationName} />}
              </div>
            </div>

            {/* Grafting Details */}
            {(propagule.scionSource || propagule.rootstockType) && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Grafting Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  {propagule.scionSource && <MetadataRow label="Scion Source" value={propagule.scionSource} />}
                  {propagule.rootstockType && <MetadataRow label="Rootstock Type" value={propagule.rootstockType} />}
                </div>
              </div>
            )}

            {/* Notes */}
            {propagule.notes && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notes</h4>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{propagule.notes}</p>
              </div>
            )}
          </div>

          {/* Photo Gallery */}
          <div className="card p-6">
            <SectionHeader title="Photos" />
            <PhotoGallery photoUrls={propagule.photoUrls} />
          </div>

          {/* Transition History */}
          <div className="card p-6">
            <SectionHeader title="Transition History" />
            <PropaguleTransitionHistory propaguleId={id!} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Stage Timeline */}
          <div className="card p-6">
            <SectionHeader title="Stage Timeline" />
            <PropaguleStageTimeline currentStage={propagule.stage} createdAt={new Date(propagule.createdAt)} />
          </div>

          {/* Related Links */}
          <div className="card p-6">
            <SectionHeader title="Related" />
            <div className="space-y-3">
              {parentBatch && (
                <Link to={`/propagation/batches/${parentBatch.id}`} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Parent Batch</div>
                    <div className="text-xs text-purple-700 dark:text-purple-300">{parentBatch.batchNumber}</div>
                  </div>
                  <span className="text-purple-500">&rarr;</span>
                </Link>
              )}
              <Link to={`/propagation/stations/${propagule.stationId}`} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Station</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">{propagule.stationName || propagule.stationId}</div>
                </div>
                <span className="text-blue-500">&rarr;</span>
              </Link>
              {propagule.motherPlantId && (
                <Link to={`/propagation/mother-plants/${propagule.motherPlantId}`} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">Mother Plant</div>
                    <div className="text-xs text-green-700 dark:text-green-300">View Source Plant</div>
                  </div>
                  <span className="text-green-500">&rarr;</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card p-6">
            <SectionHeader title="Quick Stats" />
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-slate-600 dark:text-slate-400">Total Days</span>
                <span className="font-bold text-slate-900 dark:text-white">{propagule.daysSinceTaken}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-slate-600 dark:text-slate-400">Current Stage</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors?.bg} ${stageColors?.text}`}>
                  {getStageDisplayName(propagule.stage)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-slate-600 dark:text-slate-400">Days in Stage</span>
                <span className="font-bold text-slate-900 dark:text-white">{propagule.daysInStage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {id && <PropaguleUpdateForm propaguleId={id} isOpen={updateModalOpen} onClose={() => setUpdateModalOpen(false)} mode={updateMode} />}
    </div>
  );
}
