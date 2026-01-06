/**
 * TrayCard - Individual tray display component
 *
 * Shows tray info with status indicator and quick actions.
 */

import type { TrayWithComputed } from '../../stores';
import { useVarieties } from '../../stores';
import { format, addDays } from 'date-fns';

interface TrayCardProps {
  tray: TrayWithComputed;
  onMoveToLight?: (id: string) => void;
  onHarvest?: (id: string) => void;
  onClick?: (id: string) => void;
}

const statusConfig = {
  blackout: {
    icon: '🌑',
    label: 'Blackout',
    bgClass: 'bg-slate-800 text-white',
    badgeClass: 'bg-slate-700 text-slate-200',
  },
  light: {
    icon: '💡',
    label: 'Light',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100',
    badgeClass: 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200',
  },
  harvested: {
    icon: '🌿',
    label: 'Harvested',
    bgClass: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100',
    badgeClass: 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200',
  },
  failed: {
    icon: '❌',
    label: 'Failed',
    bgClass: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100',
    badgeClass: 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200',
  },
};

const gradeConfig = {
  A: { color: 'bg-green-500', label: 'A' },
  B: { color: 'bg-yellow-500', label: 'B' },
  C: { color: 'bg-orange-500', label: 'C' },
  F: { color: 'bg-red-500', label: 'F' },
};

export function TrayCard({ tray, onMoveToLight, onHarvest, onClick }: TrayCardProps) {
  const config = statusConfig[tray.status];
  const { getVariety } = useVarieties();
  const variety = getVariety(tray.variety);

  // Calculate estimated dates
  const estimatedLightDate = addDays(tray.dateSown, tray.blackoutDays);
  const estimatedHarvestDate = variety?.typicalDaysToHarvest
    ? addDays(tray.dateSown, variety.typicalDaysToHarvest)
    : null;

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 ${config.bgClass} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onClick?.(tray.id!)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <span className="font-bold">{tray.label || `#${tray.trayNumber}`}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}>
          {config.label}
        </span>
      </div>

      {/* Variety */}
      <div className="text-lg font-semibold mb-2">{tray.variety}</div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="opacity-70">Sown:</span>{' '}
          {format(tray.dateSown, 'MMM d')}
        </div>
        <div>
          <span className="opacity-70">Seed:</span> {tray.seedWeight}g
        </div>
        <div>
          <span className="opacity-70">Day:</span> {tray.daysInPhase} in {tray.status}
        </div>
        {tray.yieldRatio && (
          <div>
            <span className="opacity-70">Yield:</span> {tray.yieldRatio}x
          </div>
        )}
        {/* Estimated/Actual Light Date */}
        {tray.status === 'blackout' && (
          <div>
            <span className="opacity-70">Est. Light:</span>{' '}
            {format(estimatedLightDate, 'MMM d')}
          </div>
        )}
        {tray.status === 'light' && tray.dateToLight && (
          <div>
            <span className="opacity-70">Light:</span>{' '}
            {format(tray.dateToLight, 'MMM d')}
          </div>
        )}
        {/* Estimated/Actual Harvest Date */}
        {(tray.status === 'blackout' || tray.status === 'light') && estimatedHarvestDate && (
          <div>
            <span className="opacity-70">Est. Harvest:</span>{' '}
            {format(estimatedHarvestDate, 'MMM d')}
          </div>
        )}
        {tray.status === 'harvested' && tray.dateHarvested && (
          <div>
            <span className="opacity-70">Harvested:</span>{' '}
            {format(tray.dateHarvested, 'MMM d')}
          </div>
        )}
      </div>

      {/* Grade badge for harvested */}
      {tray.qualityGrade && (
        <div className="flex items-center gap-2 mb-3">
          <span className="opacity-70 text-sm">Grade:</span>
          <span
            className={`w-6 h-6 rounded-full ${gradeConfig[tray.qualityGrade].color} text-white text-xs font-bold flex items-center justify-center`}
          >
            {gradeConfig[tray.qualityGrade].label}
          </span>
          {tray.harvestWeight && (
            <span className="text-sm">
              {tray.harvestWeight}g harvested
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {(tray.status === 'blackout' || tray.status === 'light') && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
          {tray.status === 'blackout' && onMoveToLight && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToLight(tray.id!);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors"
            >
              💡 Move to Light
            </button>
          )}
          {tray.status === 'light' && onHarvest && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHarvest(tray.id!);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              🌿 Harvest
            </button>
          )}
        </div>
      )}
    </div>
  );
}
