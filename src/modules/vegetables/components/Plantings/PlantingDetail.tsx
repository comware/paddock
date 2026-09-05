/**
 * PlantingDetail - the screen the vegetables module exists for.
 *
 * Everything about a planting - what it is, what has been picked from it, what happened to
 * it - is read or acted on from here. Two behaviours the harvest log owns and this screen
 * only surfaces (see useHarvests):
 *
 * - Logging a pick against a `finished` planting reopens it to `harvesting`. Refusing the
 *   entry would not stop the picking; it would push someone to falsify the date, which
 *   corrupts the yield curve the log exists to capture. So the reopening happens, and this
 *   screen says so plainly rather than letting it happen invisibly.
 * - Deleting a planting cascades to its harvests. The confirmation names how many pick
 *   records go with it, because someone about to lose eight weeks of records should be told
 *   before, not after.
 *
 * Status actions only ever offer transitions LEGAL_TRANSITIONS allows, imported from the
 * store rather than re-encoded here - see usePlantings for the full graph.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlantings, LEGAL_TRANSITIONS, type PlantingStatus } from '../../stores/usePlantings';
import { useBeds } from '../../stores/useBeds';
import { useHarvests } from '../../stores/useHarvests';
import { Modal, ConfirmDialog } from '@/components/ui';
import { HarvestLogModal, HarvestList } from '../Harvests';
import { PlantingForm } from './PlantingForm';

const STATUS_LABELS: Record<PlantingStatus, string> = {
  planned: 'Planned',
  growing: 'Growing',
  harvesting: 'Harvesting',
  finished: 'Finished',
  failed: 'Failed',
};

const STATUS_STYLES: Record<PlantingStatus, string> = {
  planned: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  growing: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  harvesting: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  finished: 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function MetadataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-slate-900 dark:text-white font-medium">{value}</span>
    </div>
  );
}

export function PlantingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { plantings, loadPlantings, setStatus, finish, deletePlanting, successionChain } = usePlantings();
  const { beds, loadBeds } = useBeds();
  const { harvestsForPlanting, loadForPlanting } = useHarvests();

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [sowNextOpen, setSowNextOpen] = useState(false);
  const [finishReason, setFinishReason] = useState('');
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reopenedNotice, setReopenedNotice] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    loadPlantings();
    loadBeds();
  }, [loadPlantings, loadBeds]);

  useEffect(() => {
    if (id) loadForPlanting(id);
  }, [id, loadForPlanting]);

  // No memoization against a Zustand selector here - plantings/successionChain/beds are
  // subscribed to directly above, so this recomputes on every store write.
  const planting = id ? plantings.find((p) => p.id === id) : undefined;

  if (!planting) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">?</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Planting not found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This planting doesn&apos;t exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/vegetables/plantings')}
          className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Back to plantings
        </button>
      </div>
    );
  }

  const plantingId = planting.id as string;
  const bed = beds.find((b) => b.id === planting.bedId);
  const chain = successionChain(plantingId);
  const harvestCount = harvestsForPlanting(plantingId).length;
  const nextStatuses = LEGAL_TRANSITIONS[planting.status];
  const anchorDate = planting.method === 'transplanted' ? planting.dateTransplanted : planting.dateSown;
  const anchorLabel = planting.method === 'transplanted' ? 'Date transplanted' : 'Date sown';

  const handleAdvance = async (next: PlantingStatus) => {
    setStatusError(null);
    try {
      await setStatus(plantingId, next);
    } catch (error) {
      setStatusError((error as Error).message);
    }
  };

  const handleFinishSubmit = async () => {
    setStatusError(null);
    try {
      await finish(plantingId, finishReason.trim());
      setFinishModalOpen(false);
      setFinishReason('');
    } catch (error) {
      setStatusError((error as Error).message);
    }
  };

  const handleConfirmDelete = async () => {
    await deletePlanting(plantingId);
    setDeleteConfirmOpen(false);
    navigate('/vegetables/plantings');
  };

  const handleHarvestLogged = (result: { reopened: boolean }) => {
    setLogModalOpen(false);
    if (result.reopened) {
      setReopenedNotice(true);
      // logHarvest writes the status change straight to the database, bypassing
      // usePlantings' own update path - reload so the status shown here (and the
      // transitions offered below it) reflect the reopening rather than lying stale.
      loadPlantings();
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/vegetables/plantings"
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span>&larr;</span>
        <span>Back to plantings</span>
      </Link>

      {reopenedNotice && (
        <div
          className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300"
          aria-live="polite"
        >
          This planting was marked finished, so it has been reopened.
        </div>
      )}

      {statusError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          {statusError}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{planting.crop}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[planting.status]}`}>
                {STATUS_LABELS[planting.status]}
              </span>
            </div>
            {planting.variety && <div className="text-slate-600 dark:text-slate-300">{planting.variety}</div>}
          </div>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Delete planting
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <MetadataRow label="Bed" value={bed ? bed.name : 'Unknown bed'} />
            <MetadataRow label="Bed portion" value={planting.bedPortion} />
            <MetadataRow label="Method" value={planting.method === 'transplanted' ? 'Transplanted' : 'Direct sown'} />
            <MetadataRow label={anchorLabel} value={formatDate(anchorDate)} />
          </div>
          <div>
            <MetadataRow label="Plant count" value={planting.plantCount} />
            <MetadataRow label="Spacing (cm)" value={planting.spacingCm} />
            <MetadataRow label="Expected first harvest" value={formatDate(planting.expectedFirstHarvest)} />
            {planting.status === 'finished' && <MetadataRow label="Finish reason" value={planting.finishReason} />}
          </div>
        </div>

        {planting.notes && (
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{planting.notes}</p>
          </div>
        )}

        {/* Status actions - only transitions LEGAL_TRANSITIONS allows from here */}
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            {nextStatuses.map((next) =>
              next === 'finished' ? (
                <button
                  key={next}
                  onClick={() => setFinishModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Finish
                </button>
              ) : (
                <button
                  key={next}
                  onClick={() => handleAdvance(next)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                >
                  Mark as {STATUS_LABELS[next]}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Harvests */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Harvests</h2>
          <button
            onClick={() => setLogModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Log a pick
          </button>
        </div>
        <HarvestList plantingId={plantingId} />
      </div>

      {/* Succession chain */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Succession chain</h2>
          <button
            onClick={() => setSowNextOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
          >
            Sow the next one
          </button>
        </div>
        {chain.length <= 1 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No successions recorded for this planting yet.</p>
        ) : (
          <ol className="space-y-2">
            {chain.map((entry, index) => {
              const isCurrent = entry.id === plantingId;
              return (
                <li key={entry.id}>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
                      {index + 1}. {entry.crop}
                      {entry.variety ? ` (${entry.variety})` : ''} - this planting
                    </span>
                  ) : (
                    <Link
                      to={`/vegetables/plantings/${entry.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {index + 1}. {entry.crop}
                      {entry.variety ? ` (${entry.variety})` : ''}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Log a pick */}
      <HarvestLogModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        plantingId={plantingId}
        onLogged={handleHarvestLogged}
      />

      {/* Sow the next one */}
      <PlantingForm isOpen={sowNextOpen} onClose={() => setSowNextOpen(false)} sowNextFrom={planting} />

      {/* Finish - prompts for a reason */}
      <Modal isOpen={finishModalOpen} onClose={() => setFinishModalOpen(false)} title="Finish planting" size="sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="finish-reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason
            </label>
            <textarea
              id="finish-reason"
              value={finishReason}
              onChange={(e) => setFinishReason(e.target.value)}
              rows={3}
              placeholder="Pulled, tilled in, bolted..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setFinishModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFinishSubmit}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              Finish
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete - names the harvest count so nobody loses records without warning */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete planting"
        message={
          harvestCount > 0
            ? `Are you sure you want to delete "${planting.crop}"? This will also delete ${harvestCount} harvest record${harvestCount === 1 ? '' : 's'}. This cannot be undone.`
            : `Are you sure you want to delete "${planting.crop}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
