/**
 * EventList - Filterable list of all planner events
 *
 * Displays events with status badges, type icons, and filtering
 * by type, status, and date range. Navigates to EventDetail on click.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { usePlannerStore, type PlannerEventWithComputed } from '../stores/usePlannerStore';
import {
  ALL_EVENT_TYPES,
  EVENT_TYPE_METADATA,
  type PlannerEventType,
  type PlannerEventStatus,
  ALL_EVENT_STATUSES,
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

export function EventList() {
  const navigate = useNavigate();
  const { events, isLoading, loadEvents } = usePlannerStore();

  const [typeFilter, setTypeFilter] = useState<PlannerEventType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PlannerEventStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (typeFilter !== 'all') {
      result = result.filter((e) => e.eventType === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((e) => new Date(e.scheduledDate) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.scheduledDate) <= to);
    }

    // Sort by scheduled date descending (newest first)
    result.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

    return result;
  }, [events, typeFilter, statusFilter, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-slate-500 dark:text-slate-400">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/planner/events/new')}
          className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
        >
          + New Event
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PlannerEventType | 'all')}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="all">All Types</option>
          {ALL_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_METADATA[type].label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PlannerEventStatus | 'all')}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          {ALL_EVENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
          <p className="text-slate-500 dark:text-slate-400">No events match your filters.</p>
          <button
            type="button"
            onClick={() => navigate('/planner/events/new')}
            className="mt-4 text-green-600 dark:text-green-400 hover:underline"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onClick={() => navigate(`/planner/events/${event.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Single event row in the list.
 */
function EventRow({
  event,
  onClick,
}: {
  event: PlannerEventWithComputed;
  onClick: () => void;
}) {
  const icon = EVENT_ICONS[event.eventType] || '📌';
  const typeLabel = EVENT_TYPE_METADATA[event.eventType]?.label || event.eventType;
  const statusStyle = STATUS_STYLES[event.status];
  const statusLabel = STATUS_LABELS[event.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 card hover:shadow-md transition-shadow flex items-center gap-4"
    >
      {/* Icon */}
      <span className="text-2xl flex-shrink-0">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-slate-900 dark:text-white truncate">
            {event.title}
          </h3>
          {event.isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
              Overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{typeLabel}</span>
          <span>{format(new Date(event.scheduledDate), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Status Badge */}
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusStyle}`}>
        {statusLabel}
      </span>
    </button>
  );
}

export default EventList;
