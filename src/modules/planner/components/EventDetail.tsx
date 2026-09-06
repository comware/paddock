/**
 * EventDetail - Single event view with lifecycle actions
 *
 * Full-page detail view for a planner event.
 * Supports edit, delete, and status lifecycle transitions.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { usePlannerStore, type PlannerEventWithComputed } from '../stores/usePlannerStore';
import {
  EVENT_TYPE_METADATA,
  type PlannerEventType,
  type PlannerEventStatus,
} from '../types';

/**
 * Icons for event types.
 */
const EVENT_ICONS: Record<PlannerEventType, string> = {
  sow: '🌱',
  blackout_end: '☀️',
  harvest: '🌾',
  water: '💧',
  inspection: '🔍',
  take_cuttings: '✂️',
  rooting_check: '🌿',
  pot_up: '🪴',
  harden_off: '🌤️',
  graduation: '🎓',
  maintenance: '🔧',
  purchase: '🛒',
  other: '📌',
};

/**
 * Status badge styling.
 */
const STATUS_STYLES: Record<PlannerEventStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  skipped: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const STATUS_LABELS: Record<PlannerEventStatus, string> = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading, loadEvents, getEvent, completeEvent, skipEvent, cancelEvent, deleteEvent } = usePlannerStore();

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const event: PlannerEventWithComputed | undefined = id ? getEvent(id) : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-slate-500 dark:text-slate-400">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-slate-500 dark:text-slate-400 text-lg">Event not found.</p>
        <button
          type="button"
          onClick={() => navigate('/planner/events')}
          className="mt-4 text-green-600 dark:text-green-400 hover:underline"
        >
          Back to event list
        </button>
      </div>
    );
  }

  const icon = EVENT_ICONS[event.eventType] || '📌';
  const typeLabel = EVENT_TYPE_METADATA[event.eventType]?.label || event.eventType;
  const statusStyle = STATUS_STYLES[event.status];
  const statusLabel = STATUS_LABELS[event.status];
  const isTerminal = event.status === 'completed' || event.status === 'cancelled' || event.status === 'skipped';

  async function handleComplete() {
    if (!id) return;
    setIsProcessing(true);
    try {
      await completeEvent(id);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSkip() {
    if (!id) return;
    setIsProcessing(true);
    try {
      await skipEvent(id);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setIsProcessing(true);
    try {
      await cancelEvent(id);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await deleteEvent(id);
      navigate('/planner/events');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Navigation */}
      <button
        type="button"
        onClick={() => navigate('/planner/events')}
        className="mb-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        &larr; Back to events
      </button>

      {/* Event Card */}
      <div className="card p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <span className="text-4xl">{icon}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {typeLabel}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}>
                {statusLabel}
              </span>
              {event.isOverdue && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  Overdue
                </span>
              )}
              {event.isAutoGenerated && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Auto-generated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Scheduled Date
            </label>
            <p className="mt-1 text-slate-900 dark:text-white font-medium">
              {format(new Date(event.scheduledDate), 'EEEE, MMMM d, yyyy')}
            </p>
            {!isTerminal && event.daysUntil !== 0 && (
              <p className={`text-sm mt-0.5 ${event.daysUntil < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {event.daysUntil > 0
                  ? `In ${event.daysUntil} day${event.daysUntil === 1 ? '' : 's'}`
                  : `${Math.abs(event.daysUntil)} day${Math.abs(event.daysUntil) === 1 ? '' : 's'} overdue`}
              </p>
            )}
          </div>

          {event.completedDate && (
            <div>
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Completed Date
              </label>
              <p className="mt-1 text-slate-900 dark:text-white font-medium">
                {format(new Date(event.completedDate), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          )}

          {event.siteId && (
            <div>
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Site ID
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{event.siteId}</p>
            </div>
          )}

          {event.speciesId && (
            <div>
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Species
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{event.speciesId}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {event.notes && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Notes
            </label>
            <p className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">
              {event.notes}
            </p>
          </div>
        )}

        {/* Linked Entity */}
        {(event.trayId || event.batchId) && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Linked Entity
            </label>
            <div className="mt-2 flex gap-2">
              {event.trayId && (
                <button
                  type="button"
                  onClick={() => navigate(`/grow/trays/${event.trayId}`)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <span>🌱</span>
                  <span>View Tray</span>
                </button>
              )}
              {event.batchId && (
                <button
                  type="button"
                  onClick={() => navigate(`/propagation/batches/${event.batchId}`)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                >
                  <span>🌿</span>
                  <span>View Batch</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status Actions */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isProcessing}
              className="flex-1 min-w-[120px] px-4 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              Complete
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isProcessing}
              className="flex-1 min-w-[120px] px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 min-w-[120px] px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              Cancel Event
            </button>
          </div>
        )}

        {/* Delete */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-lg text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            Delete Event
          </button>
        </div>

        {/* Metadata Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          <p>Created: {format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</p>
          <p>Updated: {format(new Date(event.updatedAt), 'MMM d, yyyy h:mm a')}</p>
          {event.id && <p>ID: {event.id}</p>}
        </div>
      </div>
    </div>
  );
}

export default EventDetail;
