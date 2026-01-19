/**
 * EventDetailModal - View and manage event details
 *
 * Displays full event information when clicking on a calendar event.
 * Provides status lifecycle actions and navigation to linked entities.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { usePlannerStore, type PlannerEventWithComputed } from '../stores/usePlannerStore';
import type { PlannerEventType, PlannerEventStatus } from '@/lib/db';

interface EventDetailModalProps {
  event: PlannerEventWithComputed | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Human-readable labels for event types.
 */
const EVENT_TYPE_LABELS: Record<PlannerEventType, string> = {
  sow: 'Sow Seeds',
  blackout_end: 'End Blackout',
  harvest: 'Harvest',
  water: 'Watering',
  inspection: 'Inspection',
  take_cuttings: 'Take Cuttings',
  rooting_check: 'Rooting Check',
  pot_up: 'Pot Up',
  harden_off: 'Harden Off',
  graduation: 'Graduation',
  maintenance: 'Maintenance',
  purchase: 'Purchase',
  other: 'Other',
};

/**
 * Human-readable labels for statuses.
 */
const STATUS_LABELS: Record<PlannerEventStatus, string> = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

/**
 * Status badge color classes.
 */
const STATUS_COLORS: Record<PlannerEventStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  skipped: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

/**
 * Get icon for event type.
 */
function getEventIcon(eventType: PlannerEventType): string {
  const icons: Record<PlannerEventType, string> = {
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
  return icons[eventType] || '📌';
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { completeEvent, skipEvent, cancelEvent, deleteEvent } = usePlannerStore();

  if (!event) return null;

  const icon = getEventIcon(event.eventType);
  const typeLabel = EVENT_TYPE_LABELS[event.eventType];
  const statusLabel = STATUS_LABELS[event.status];
  const statusColor = STATUS_COLORS[event.status];

  const isTerminalStatus = event.status === 'completed' || event.status === 'cancelled' || event.status === 'skipped';

  const handleComplete = async () => {
    if (!event.id) return;
    setIsProcessing(true);
    try {
      await completeEvent(event.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!event.id) return;
    setIsProcessing(true);
    try {
      await skipEvent(event.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!event.id) return;
    setIsProcessing(true);
    try {
      await cancelEvent(event.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!event.id) return;
    if (!confirm('Are you sure you want to delete this event?')) return;
    setIsProcessing(true);
    try {
      await deleteEvent(event.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigateToTray = () => {
    if (event.trayId) {
      navigate(`/grow/trays/${event.trayId}`);
      onClose();
    }
  };

  const handleNavigateToBatch = () => {
    if (event.batchId) {
      navigate(`/propagation/batches/${event.batchId}`);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${icon} ${event.title}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Event Type & Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {typeLabel}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          {event.isOverdue && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Overdue
            </span>
          )}
          {event.isAutoGenerated && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Auto-generated
            </span>
          )}
        </div>

        {/* Scheduled Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Scheduled Date
            </label>
            <p className="mt-1 text-slate-900 dark:text-white font-medium">
              {format(new Date(event.scheduledDate), 'EEEE, MMMM d, yyyy')}
            </p>
            {event.daysUntil !== 0 && !isTerminalStatus && (
              <p className={`text-sm ${event.daysUntil < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
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
        </div>

        {/* Notes */}
        {event.notes && (
          <div>
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
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Linked To
            </label>
            <div className="mt-2">
              {event.trayId && (
                <button
                  type="button"
                  onClick={handleNavigateToTray}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <span>🌱</span>
                  <span>View Tray</span>
                </button>
              )}
              {event.batchId && (
                <button
                  type="button"
                  onClick={handleNavigateToBatch}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                >
                  <span>🌿</span>
                  <span>View Batch</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isTerminalStatus && (
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
              Cancel
            </button>
          </div>
        )}

        {/* Delete Button */}
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
        </div>
      </div>
    </Modal>
  );
}
