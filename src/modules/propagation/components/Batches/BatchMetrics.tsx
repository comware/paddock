/**
 * BatchMetrics - Shared sub-components for BatchDetail display.
 *
 * Contains MetadataRow, SectionHeader, and TransitionHistory.
 * Extracted from BatchDetail.tsx for code health.
 */

import { format } from 'date-fns';
import { useStageTransitions } from '../../stores/useStageTransitions';
import type { FailureReason } from '../../types';
import {
  getStageDisplayName,
  getStageColors,
  formatDaysInStage,
} from '../../utils';

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

/**
 * Display names for propagation methods.
 */
export const METHOD_DISPLAY_NAMES: Record<string, string> = {
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

// ============================================
// SHARED SUB-COMPONENTS
// ============================================

/**
 * Metadata row component for consistent styling.
 */
export function MetadataRow({
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
export function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
      {icon && <span>{icon}</span>}
      {title}
    </h3>
  );
}

// ============================================
// TRANSITION HISTORY
// ============================================

/**
 * Transition History List.
 */
export function TransitionHistory({
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
