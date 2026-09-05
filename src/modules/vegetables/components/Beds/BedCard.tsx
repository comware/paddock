/**
 * BedCard - Individual bed display.
 *
 * A bed's whole purpose is to hold something, so the card leads with what is growing in it
 * now (plantings with status growing or harvesting) rather than treating that as an
 * afterthought.
 */

import { usePlantings } from '../../stores/usePlantings';
import type { VegBed } from '@/lib/db';

interface BedCardProps {
  bed: VegBed;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function BedCard({ bed, onEdit, onDelete, onClick }: BedCardProps) {
  const { plantingsInBed } = usePlantings();

  const inBed = bed.id ? plantingsInBed(bed.id) : [];
  const growingCount = inBed.filter((p) => p.status === 'growing' || p.status === 'harvesting').length;

  const area =
    bed.lengthM !== undefined && bed.widthM !== undefined ? bed.lengthM * bed.widthM : undefined;

  const cardBackground = !bed.isActive
    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 opacity-75'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${cardBackground}`}
      onClick={() => bed.id && onClick?.(bed.id)}
    >
      {/* Header: Name and status */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-slate-900 dark:text-white truncate">{bed.name}</span>
        {!bed.isActive && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
            Inactive
          </span>
        )}
      </div>

      {/* Dimensions */}
      {(bed.lengthM !== undefined || bed.widthM !== undefined) && (
        <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          {bed.lengthM !== undefined && bed.widthM !== undefined
            ? `${bed.lengthM}m x ${bed.widthM}m`
            : bed.lengthM !== undefined
              ? `${bed.lengthM}m long`
              : `${bed.widthM}m wide`}
          {area !== undefined && <span className="ml-1">({area.toFixed(1)} m²)</span>}
        </div>
      )}

      {/* What is growing in it now - the point of the card */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            growingCount > 0
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}
        >
          {growingCount > 0
            ? `${growingCount} planting${growingCount === 1 ? '' : 's'} growing`
            : 'Nothing growing'}
        </span>
      </div>

      {/* Notes */}
      {bed.notes && (
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{bed.notes}</p>
      )}

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (bed.id) onEdit(bed.id);
              }}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (bed.id) onDelete(bed.id);
              }}
              className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
