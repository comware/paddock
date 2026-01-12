/**
 * GraduationHistory - Display past graduations for a batch
 *
 * Shows a list of graduation records with:
 * - Outcome badges with icons
 * - Quantity and date
 * - Recipient/location info where applicable
 * - Notes if present
 *
 * Uses the useGraduations store to fetch data.
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { useGraduations, type EnrichedGraduation } from '../../stores/useGraduations';
import type { GraduationOutcome } from '../../types';

// ============================================
// TYPES
// ============================================

export interface GraduationHistoryProps {
  /** The batch ID to show graduations for */
  batchId: string;
  /** Whether to show a compact view (no notes) */
  compact?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Outcome display configuration.
 */
const OUTCOME_CONFIG: Record<
  GraduationOutcome,
  {
    label: string;
    bgColor: string;
    textColor: string;
    icon: string;
  }
> = {
  planted_garden: {
    label: 'Planted',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  },
  personal_use: {
    label: 'Personal',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  },
  gifted: {
    label: 'Gifted',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: 'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  },
  sold: {
    label: 'Sold',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  },
  composted: {
    label: 'Composted',
    bgColor: 'bg-slate-100 dark:bg-slate-700',
    textColor: 'text-slate-600 dark:text-slate-400',
    icon: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  },
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Outcome badge with icon.
 */
export function OutcomeBadge({
  outcome,
  size = 'md',
}: {
  outcome: GraduationOutcome;
  size?: 'sm' | 'md';
}) {
  const config = OUTCOME_CONFIG[outcome];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        config.bgColor
      } ${config.textColor} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <svg
        className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
      </svg>
      {config.label}
    </span>
  );
}

/**
 * Single graduation entry display.
 */
function GraduationEntry({
  graduation,
  compact = false,
}: {
  graduation: EnrichedGraduation;
  compact?: boolean;
}) {
  const config = OUTCOME_CONFIG[graduation.outcome];

  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}
          >
            <svg
              className={`w-4 h-4 ${config.textColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
            </svg>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <OutcomeBadge outcome={graduation.outcome} size="sm" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {graduation.quantity} plant{graduation.quantity !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Additional info based on outcome */}
            {graduation.outcome === 'gifted' && graduation.recipientName && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                To: {graduation.recipientName}
              </div>
            )}
            {graduation.outcome === 'planted_garden' && graduation.plantedLocation && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Location: {graduation.plantedLocation}
              </div>
            )}
            {graduation.outcome === 'sold' && graduation.salePrice !== undefined && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Price: ${graduation.salePrice.toFixed(2)}
              </div>
            )}

            {/* Notes */}
            {!compact && graduation.notes && (
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">
                "{graduation.notes}"
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          {format(graduation.graduationDateObj, 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}

/**
 * Summary statistics for graduations.
 */
function GraduationSummary({
  graduations,
}: {
  graduations: EnrichedGraduation[];
}) {
  const summary = useMemo(() => {
    const totals: Record<GraduationOutcome, number> = {
      planted_garden: 0,
      personal_use: 0,
      gifted: 0,
      sold: 0,
      composted: 0,
    };

    let totalQuantity = 0;
    let totalRevenue = 0;

    for (const g of graduations) {
      totals[g.outcome] += g.quantity;
      totalQuantity += g.quantity;
      if (g.outcome === 'sold' && g.salePrice) {
        totalRevenue += g.salePrice;
      }
    }

    return { totals, totalQuantity, totalRevenue };
  }, [graduations]);

  // Only show outcomes that have quantities
  const activeOutcomes = (Object.keys(summary.totals) as GraduationOutcome[]).filter(
    (outcome) => summary.totals[outcome] > 0
  );

  if (activeOutcomes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeOutcomes.map((outcome) => (
        <div
          key={outcome}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${OUTCOME_CONFIG[outcome].bgColor} ${OUTCOME_CONFIG[outcome].textColor}`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={OUTCOME_CONFIG[outcome].icon}
            />
          </svg>
          <span>
            {summary.totals[outcome]} {OUTCOME_CONFIG[outcome].label.toLowerCase()}
          </span>
        </div>
      ))}
      {summary.totalRevenue > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          ${summary.totalRevenue.toFixed(2)} revenue
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GraduationHistory({ batchId, compact = false }: GraduationHistoryProps) {
  const { getGraduationsByBatch, getTotalGraduatedForBatch } = useGraduations();

  // Get graduations for this batch
  const graduations = useMemo(
    () => getGraduationsByBatch(batchId),
    [batchId, getGraduationsByBatch]
  );

  const totalGraduated = useMemo(
    () => getTotalGraduatedForBatch(batchId),
    [batchId, getTotalGraduatedForBatch]
  );

  // Empty state
  if (graduations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
          />
        </svg>
        <p className="text-sm">No graduations recorded yet</p>
        <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
          Graduations will appear here once plants are graduated from this batch.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <GraduationSummary graduations={graduations} />

      {/* Header with total */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {graduations.length} graduation{graduations.length !== 1 ? 's' : ''}
        </h4>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {totalGraduated} total plant{totalGraduated !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Graduation list */}
      <div className="space-y-2">
        {graduations.map((graduation) => (
          <GraduationEntry
            key={graduation.id}
            graduation={graduation}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
