/**
 * StationDetail sub-components
 *
 * Extracted from StationDetail.tsx for maintainability.
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { PropStationLog, PropBatchWithComputed } from '../../types';
import { getStageDisplayName, getStageColors } from '../../utils';

// ============================================
// TYPE DISPLAY NAMES
// ============================================

export const TYPE_DISPLAY_NAMES: Record<string, string> = {
  heated_propagator: 'Heated Propagator',
  unheated_propagator: 'Unheated Propagator',
  water_propagation: 'Water Propagation',
  outdoor_bed: 'Outdoor Bed',
  cold_frame: 'Cold Frame',
  greenhouse_bench: 'Greenhouse Bench',
  mist_system: 'Mist System',
  other: 'Other',
};

// ============================================
// SUB-COMPONENTS
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
export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
      {title}
    </h3>
  );
}

/**
 * Batch list item for station detail.
 */
export function BatchListItem({ batch }: { batch: PropBatchWithComputed }) {
  const stageColors = getStageColors(batch.stage);

  return (
    <Link
      to={`/propagation/batches/${batch.id}`}
      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white">
            {batch.batchNumber}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors.bg} ${stageColors.text}`}
          >
            {getStageDisplayName(batch.stage)}
          </span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {batch.species}
          {batch.variety && ` - ${batch.variety}`}
        </div>
      </div>
      <div className="text-right text-sm">
        <div className="text-slate-700 dark:text-slate-300">
          {batch.quantitySurviving} propagules
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-xs">
          Day {batch.daysSinceTaken}
        </div>
      </div>
    </Link>
  );
}

/**
 * Environment log entry display.
 */
export function EnvironmentLogEntry({ log }: { log: PropStationLog }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-4">
        {log.temperature !== undefined && (
          <span className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Temp:</span>{' '}
            <span className="text-slate-900 dark:text-white font-medium">{log.temperature}C</span>
          </span>
        )}
        {log.humidity !== undefined && (
          <span className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Humidity:</span>{' '}
            <span className="text-slate-900 dark:text-white font-medium">{log.humidity}%</span>
          </span>
        )}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {format(new Date(log.date), 'MMM d, h:mm a')}
      </span>
    </div>
  );
}

/**
 * Get occupancy color based on percentage.
 */
export function getOccupancyColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}
