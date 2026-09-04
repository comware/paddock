/**
 * TrayCard - Individual tray display component
 *
 * Shows tray info with status indicator, harvest countdown, and quick actions.
 */

import type { TrayWithComputed } from '../../stores';
import { useVarieties, useSites } from '../../stores';
import { format, addDays, isAfter, startOfDay } from 'date-fns';
import { getHarvestForecast, getHarvestBadgeClasses } from '../../utils';

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
  const { sites } = useSites();
  const variety = getVariety(tray.variety);

  // Find site name for this tray
  const site = tray.siteId ? sites.find((s) => s.id === tray.siteId) : null;

  // Calculate estimated dates
  const estimatedLightDate = addDays(tray.dateSown, tray.blackoutDays);
  const estimatedHarvestDate = variety?.typicalDaysToHarvest
    ? addDays(tray.dateSown, variety.typicalDaysToHarvest)
    : null;

  // Check if overdue for state change
  const today = startOfDay(new Date());
  const isOverdueForLight = tray.status === 'blackout' && isAfter(today, estimatedLightDate);
  const isReadyToHarvest = tray.status === 'light' && estimatedHarvestDate && isAfter(today, estimatedHarvestDate);

  // Calculate days overdue
  const daysOverdueForLight = isOverdueForLight
    ? Math.floor((today.getTime() - estimatedLightDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysOverdueForHarvest = isReadyToHarvest && estimatedHarvestDate
    ? Math.floor((today.getTime() - estimatedHarvestDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determine if action is needed
  const needsAction = isOverdueForLight || isReadyToHarvest;

  // Calculate harvest forecast for countdown badge
  const harvestForecast = getHarvestForecast(tray, variety);
  const showHarvestBadge = (tray.status === 'blackout' || tray.status === 'light') && harvestForecast.expectedDate;

  return (
    <div
      className={`relative rounded-xl p-4 shadow-sm border-2 ${
        needsAction
          ? 'border-orange-400 dark:border-orange-500 ring-2 ring-orange-200 dark:ring-orange-900/50'
          : 'border-slate-200 dark:border-slate-700'
      } ${config.bgClass} hover:shadow-md transition-shadow`}
    >
      {/*
        Stretched link. The whole card is the target, but the Harvest and Move to light
        buttons inside it must stay independently reachable - and a button cannot legally
        contain another button. So the card's control is an absolutely positioned button
        beneath the content, and the actions sit above it.

        Previously this was a div with an onClick: not focusable, not announced, and
        impossible to activate from a keyboard. WCAG 2.1.1 and 4.1.2.
      */}
      {onClick && (
        <button
          type="button"
          onClick={() => onClick(tray.id!)}
          aria-label={`Tray ${tray.trayNumber}, ${tray.variety}, ${config.label}. Show details.`}
          className="absolute inset-0 z-0 rounded-xl cursor-pointer"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <span className="font-bold">{tray.label || `#${tray.trayNumber}`}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Harvest Countdown Badge */}
          {showHarvestBadge && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getHarvestBadgeClasses(harvestForecast.status)}`}
              title={`Expected harvest: ${format(harvestForecast.expectedDate!, 'MMM d, yyyy')}`}
            >
              🌿 {harvestForecast.label}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Overdue Alert Badge */}
      {isOverdueForLight && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium flex items-center gap-2 animate-pulse">
          <span>⚠️</span>
          <span>
            Ready for light! {daysOverdueForLight > 0 && `(${daysOverdueForLight}d overdue)`}
          </span>
        </div>
      )}
      {isReadyToHarvest && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium flex items-center gap-2 animate-pulse">
          <span>🌿</span>
          <span>
            Ready to harvest! {daysOverdueForHarvest > 0 && `(${daysOverdueForHarvest}d overdue)`}
          </span>
        </div>
      )}

      {/* Variety and Site Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">{tray.variety}</div>
        {site && (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium truncate max-w-[100px]" title={site.name}>
            {site.name}
          </span>
        )}
      </div>

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

      {/* Actions sit above the stretched link so they stay clickable and focusable. */}
      {(tray.status === 'blackout' || tray.status === 'light') && (
        <div className="relative z-10 flex gap-2 mt-3 pt-3 border-t border-current/10">
          {tray.status === 'blackout' && onMoveToLight && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToLight(tray.id!);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
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
              className="flex-1 px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              🌿 Harvest
            </button>
          )}
        </div>
      )}
    </div>
  );
}
