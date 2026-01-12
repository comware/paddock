/**
 * StageTimeline - Visual progression through propagation stages
 *
 * Displays a visual timeline showing:
 * - Completed stages with dates
 * - Current stage highlighted
 * - Future stages (greyed out)
 * - Time spent in each stage
 *
 * Can be displayed horizontally or vertically based on viewport.
 */

import { format } from 'date-fns';
import type { PropBatchWithComputed, PropagationStage } from '../../types';
import type { TransitionWithDuration } from '../../stores/useStageTransitions';
import {
  STAGE_ORDER,
  STAGE_DISPLAY_NAMES,
  STAGE_COLORS,
  formatDaysInStage,
} from '../../utils';

interface StageTimelineProps {
  batch: PropBatchWithComputed;
  transitions: TransitionWithDuration[];
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Get the date a batch entered a specific stage.
 */
function getStageDate(batch: PropBatchWithComputed, stage: PropagationStage): Date | null {
  switch (stage) {
    case 'taken':
      return new Date(batch.dateTaken);
    case 'rooting':
      // Rooting starts when taken (same date)
      return new Date(batch.dateTaken);
    case 'rooted':
      return batch.dateRooted ? new Date(batch.dateRooted) : null;
    case 'potted_up':
      return batch.datePottedUp ? new Date(batch.datePottedUp) : null;
    case 'hardening':
      return batch.dateHardeningStarted ? new Date(batch.dateHardeningStarted) : null;
    case 'ready':
      return batch.dateReady ? new Date(batch.dateReady) : null;
    case 'graduated':
      return batch.dateGraduated ? new Date(batch.dateGraduated) : null;
    default:
      return null;
  }
}

/**
 * Get the status of a stage relative to the current stage.
 */
type StageStatus = 'completed' | 'current' | 'future' | 'failed';

function getStageStatus(
  stage: PropagationStage,
  currentStage: PropagationStage
): StageStatus {
  if (currentStage === 'failed') {
    // For failed batches, we don't know exactly which stage failed,
    // so just show all stages as completed for the timeline
    return 'completed';
  }

  if (stage === currentStage) {
    return 'current';
  }

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  if (stageIndex < currentIndex) {
    return 'completed';
  }

  return 'future';
}

/**
 * Find the duration spent in a stage from transitions.
 */
function getDurationForStage(
  transitions: TransitionWithDuration[],
  stage: PropagationStage
): number | null {
  const transition = transitions.find((t) => t.toStage === stage);
  return transition?.durationDays ?? null;
}

/**
 * Single stage node in the timeline.
 */
function StageNode({
  stage,
  status,
  date,
  duration,
  isLast,
  orientation,
}: {
  stage: PropagationStage;
  status: StageStatus;
  date: Date | null;
  duration: number | null;
  isLast: boolean;
  orientation: 'horizontal' | 'vertical';
}) {
  const colors = STAGE_COLORS[stage];
  const displayName = STAGE_DISPLAY_NAMES[stage];

  // Determine styling based on status
  const getNodeStyles = (): string => {
    switch (status) {
      case 'completed':
        return `${colors.bg} ${colors.text} border-2 ${colors.border}`;
      case 'current':
        return `${colors.bg} ${colors.text} border-2 ${colors.border} ring-2 ring-offset-2 ring-primary-500`;
      case 'future':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-600';
      case 'failed':
        return 'bg-red-100 text-red-800 border-2 border-red-200';
      default:
        return '';
    }
  };

  const getConnectorStyles = (): string => {
    if (status === 'completed' || status === 'current') {
      return 'bg-primary-300 dark:bg-primary-600';
    }
    return 'bg-slate-200 dark:bg-slate-600';
  };

  if (orientation === 'vertical') {
    return (
      <div className="flex items-start gap-3">
        {/* Node and Connector */}
        <div className="flex flex-col items-center">
          {/* Node */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${getNodeStyles()}`}
          >
            {status === 'completed' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'current' ? (
              <span className="w-3 h-3 rounded-full bg-current animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-current" />
            )}
          </div>
          {/* Connector */}
          {!isLast && (
            <div className={`w-0.5 h-16 ${getConnectorStyles()}`} />
          )}
        </div>

        {/* Content */}
        <div className="pt-1 pb-4 min-h-[4rem]">
          <div className="font-medium text-slate-900 dark:text-white">
            {displayName}
          </div>
          {date && status !== 'future' && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {format(date, 'MMM d, yyyy')}
            </div>
          )}
          {duration !== null && (
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {formatDaysInStage(duration)} in stage
            </div>
          )}
          {status === 'current' && (
            <div className="text-xs font-medium text-primary-600 dark:text-primary-400 mt-1">
              Current Stage
            </div>
          )}
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${getNodeStyles()}`}
      >
        {status === 'completed' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : status === 'current' ? (
          <span className="w-3 h-3 rounded-full bg-current animate-pulse" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-current" />
        )}
      </div>

      {/* Content */}
      <div className="mt-2 text-center">
        <div className="text-xs font-medium text-slate-900 dark:text-white whitespace-nowrap">
          {displayName}
        </div>
        {date && status !== 'future' && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {format(date, 'MMM d')}
          </div>
        )}
        {duration !== null && (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {duration}d
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Connector between stage nodes (horizontal).
 */
function HorizontalConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`flex-1 h-0.5 mt-5 ${
        completed ? 'bg-primary-300 dark:bg-primary-600' : 'bg-slate-200 dark:bg-slate-600'
      }`}
    />
  );
}

export function StageTimeline({
  batch,
  transitions,
  orientation = 'vertical',
}: StageTimelineProps) {
  // Exclude 'failed' from the normal progression
  const stages = STAGE_ORDER.filter((s) => s !== 'failed');

  // If batch failed, we show where it failed
  const isFailed = batch.stage === 'failed';

  if (orientation === 'vertical') {
    return (
      <div className="py-2">
        {stages.map((stage, index) => {
          const status = isFailed
            ? index < stages.indexOf(batch.stage) || batch.stage === 'failed'
              ? 'completed'
              : 'future'
            : getStageStatus(stage, batch.stage);
          const date = getStageDate(batch, stage);
          const duration = getDurationForStage(transitions, stage);
          const isLast = index === stages.length - 1;

          return (
            <StageNode
              key={stage}
              stage={stage}
              status={status}
              date={date}
              duration={duration}
              isLast={isLast}
              orientation="vertical"
            />
          );
        })}

        {/* Show failed indicator if applicable */}
        {isFailed && (
          <div className="flex items-start gap-3 mt-2">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 text-red-800 border-2 border-red-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="pt-1">
              <div className="font-medium text-red-700 dark:text-red-400">
                Failed
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Batch did not complete propagation
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start min-w-max px-2">
        {stages.map((stage, index) => {
          const status = isFailed
            ? 'completed' // Simplified for horizontal view
            : getStageStatus(stage, batch.stage);
          const date = getStageDate(batch, stage);
          const duration = getDurationForStage(transitions, stage);
          const isLast = index === stages.length - 1;
          const nextStatus = !isLast
            ? getStageStatus(stages[index + 1], batch.stage)
            : null;
          const connectorCompleted =
            status === 'completed' && nextStatus !== 'future';

          return (
            <div key={stage} className="flex items-start">
              <StageNode
                stage={stage}
                status={status}
                date={date}
                duration={duration}
                isLast={isLast}
                orientation="horizontal"
              />
              {!isLast && <HorizontalConnector completed={connectorCompleted} />}
            </div>
          );
        })}

        {/* Failed indicator for horizontal */}
        {isFailed && (
          <>
            <HorizontalConnector completed={false} />
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 text-red-800 border-2 border-red-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs font-medium text-red-700 dark:text-red-400">
                  Failed
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
