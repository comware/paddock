/**
 * EventCreateForm - Create new planner events
 *
 * Full-page form for creating planner events.
 * Can be opened from calendar slot selection (pre-filled date)
 * or directly via /planner/events/new route.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { usePlannerStore } from '../stores/usePlannerStore';
import { useSites } from '@/platform';
import {
  ALL_EVENT_TYPES,
  EVENT_TYPE_METADATA,
  type PlannerEventType,
} from '../types';

/**
 * Parse a date string from search params, falling back to today.
 */
function parseDateParam(dateStr: string | null): string {
  if (!dateStr) return format(new Date(), 'yyyy-MM-dd');
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return format(new Date(), 'yyyy-MM-dd');
    return format(d, 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
}

export function EventCreateForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createEvent } = usePlannerStore();
  const { sites, loadSites } = useSites();

  // Pre-fill date from query param (set by calendar slot click)
  const initialDate = parseDateParam(searchParams.get('date'));

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<PlannerEventType>('sow');
  const [scheduledDate, setScheduledDate] = useState(initialDate);
  const [siteId, setSiteId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [notes, setNotes] = useState('');
  const [trayId, setTrayId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load sites on mount
  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Auto-select first site if none selected
  useEffect(() => {
    if (!siteId && sites.length > 0 && sites[0].id) {
      setSiteId(sites[0].id);
    }
  }, [sites, siteId]);

  /**
   * Validate required fields.
   */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!eventType) newErrors.eventType = 'Event type is required';
    if (!scheduledDate) newErrors.scheduledDate = 'Date is required';
    if (!siteId) newErrors.siteId = 'Site is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /**
   * Handle form submission.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        eventType,
        scheduledDate: new Date(scheduledDate),
        status: 'scheduled',
        siteId,
        speciesId: speciesId || undefined,
        trayId: trayId || undefined,
        batchId: batchId || undefined,
        notes: notes.trim() || undefined,
      });

      // Navigate back to calendar on the event's date
      navigate(`/planner?date=${scheduledDate}`);
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Group event types by module for the selector.
   */
  const groupedTypes = {
    grow: ALL_EVENT_TYPES.filter((t) => EVENT_TYPE_METADATA[t].module === 'grow'),
    propagation: ALL_EVENT_TYPES.filter((t) => EVENT_TYPE_METADATA[t].module === 'propagation'),
    general: ALL_EVENT_TYPES.filter((t) => EVENT_TYPE_METADATA[t].module === 'general'),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          New Event
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Schedule a new activity on the planner calendar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="event-title"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="event-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sow sunflower tray #12"
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Event Type */}
        <div>
          <label
            htmlFor="event-type"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Event Type <span className="text-red-500">*</span>
          </label>
          <select
            id="event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as PlannerEventType)}
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <optgroup label="Microgreens">
              {groupedTypes.grow.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_METADATA[type].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Propagation">
              {groupedTypes.propagation.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_METADATA[type].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="General">
              {groupedTypes.general.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_METADATA[type].label}
                </option>
              ))}
            </optgroup>
          </select>
          {errors.eventType && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.eventType}</p>
          )}
        </div>

        {/* Scheduled Date */}
        <div>
          <label
            htmlFor="event-date"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Scheduled Date <span className="text-red-500">*</span>
          </label>
          <input
            id="event-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          {errors.scheduledDate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scheduledDate}</p>
          )}
        </div>

        {/* Site Selection */}
        <div>
          <label
            htmlFor="event-site"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Site <span className="text-red-500">*</span>
          </label>
          <select
            id="event-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">Select a site...</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {errors.siteId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.siteId}</p>
          )}
        </div>

        {/* Species (Optional) */}
        <div>
          <label
            htmlFor="event-species"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Species / Variety <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="event-species"
            type="text"
            value={speciesId}
            onChange={(e) => setSpeciesId(e.target.value)}
            placeholder="e.g. Sunflower, Basil"
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Linked Entity (Optional) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="event-tray"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Tray ID <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="event-tray"
              type="text"
              value={trayId}
              onChange={(e) => {
                setTrayId(e.target.value);
                if (e.target.value) setBatchId(''); // Mutual exclusivity
              }}
              placeholder="Link to tray"
              disabled={!!batchId}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="event-batch"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Batch ID <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="event-batch"
              type="text"
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                if (e.target.value) setTrayId(''); // Mutual exclusivity
              }}
              placeholder="Link to batch"
              disabled={!!trayId}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="event-notes"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Notes <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional details..."
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/planner')}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EventCreateForm;
