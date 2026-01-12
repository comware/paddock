/**
 * PropaguleList - Grid view of propagules from a batch
 *
 * Features:
 * - Grid/list of propagules from batch
 * - Health indicator on each card
 * - Stage badge display
 * - Filter by stage within batch
 * - Sort by various fields
 *
 * Used within batch detail view or as standalone list.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePropagules, type PropaguleFilters, type PropaguleSort } from '../../stores';
import type { PropagationStage, PropPropaguleWithComputed } from '../../types';
import { PropaguleCard } from './PropaguleCard';
import { PropaguleUpdateForm } from './PropaguleUpdateForm';
import { getStageDisplayName, isActiveStage } from '../../utils';

interface PropaguleListProps {
  /** Optional batchId to filter propagules by batch */
  batchId?: string;
  /** Optional title override */
  title?: string;
  /** Show filter controls */
  showFilters?: boolean;
  /** Maximum items to display (for compact views) */
  maxItems?: number;
}

/**
 * Stage filter tabs component.
 */
function StageFilterTabs({
  currentStage,
  stageCounts,
  onStageChange,
}: {
  currentStage: PropagationStage | 'all' | 'active';
  stageCounts: Record<string, number>;
  onStageChange: (stage: PropagationStage | 'all' | 'active') => void;
}) {
  const stages: (PropagationStage | 'all' | 'active')[] = [
    'all',
    'active',
    'taken',
    'rooting',
    'rooted',
    'potted_up',
    'hardening',
    'ready',
    'graduated',
    'failed',
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage) => {
        const count = stage === 'all'
          ? Object.values(stageCounts).reduce((a, b) => a + b, 0)
          : stage === 'active'
            ? (stageCounts.taken ?? 0) + (stageCounts.rooting ?? 0) + (stageCounts.rooted ?? 0) +
              (stageCounts.potted_up ?? 0) + (stageCounts.hardening ?? 0) + (stageCounts.ready ?? 0)
            : stageCounts[stage] ?? 0;

        const isSelected = currentStage === stage;
        const displayName = stage === 'all'
          ? 'All'
          : stage === 'active'
            ? 'Active'
            : getStageDisplayName(stage);

        return (
          <button
            key={stage}
            onClick={() => onStageChange(stage)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {displayName} ({count})
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sort dropdown component.
 */
function SortDropdown({
  sort,
  onSortChange,
}: {
  sort: PropaguleSort;
  onSortChange: (sort: PropaguleSort) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-500 dark:text-slate-400">Sort:</label>
      <select
        value={`${sort.field}-${sort.direction}`}
        onChange={(e) => {
          const [field, direction] = e.target.value.split('-') as [PropaguleSort['field'], PropaguleSort['direction']];
          onSortChange({ field, direction });
        }}
        className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
      >
        <option value="propaguleNumber-asc">Number (A-Z)</option>
        <option value="propaguleNumber-desc">Number (Z-A)</option>
        <option value="healthScore-desc">Health (High-Low)</option>
        <option value="healthScore-asc">Health (Low-High)</option>
        <option value="stage-asc">Stage (Early-Late)</option>
        <option value="stage-desc">Stage (Late-Early)</option>
        <option value="species-asc">Species (A-Z)</option>
        <option value="createdAt-desc">Newest First</option>
        <option value="createdAt-asc">Oldest First</option>
      </select>
    </div>
  );
}

export function PropaguleList({
  batchId,
  title = 'Propagules',
  showFilters = true,
  maxItems,
}: PropaguleListProps) {
  const navigate = useNavigate();

  // Store state and actions
  const {
    propagules,
    isLoading,
    loadPropagules,
    filters,
    sort,
    setFilters,
    setSort,
    getFilteredPropagules,
    getPropagulesByBatch,
  } = usePropagules();

  // Modal state
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedPropaguleId, setSelectedPropaguleId] = useState<string | null>(null);
  const [updateMode, setUpdateMode] = useState<'update' | 'advance' | 'fail'>('update');

  // Load propagules on mount
  useEffect(() => {
    loadPropagules();
  }, [loadPropagules]);

  // Set batch filter if batchId provided
  useEffect(() => {
    if (batchId) {
      setFilters({ batchId });
    }
  }, [batchId, setFilters]);

  // Get propagules based on filters
  const displayPropagules = useMemo(() => {
    let result: PropPropaguleWithComputed[];

    if (batchId) {
      // When batchId is provided, filter by batch and apply other filters
      const batchPropagules = getPropagulesByBatch(batchId);

      // Apply stage filter
      if (filters.stage !== 'all') {
        if (filters.stage === 'active') {
          result = batchPropagules.filter((p) => isActiveStage(p.stage));
        } else {
          result = batchPropagules.filter((p) => p.stage === filters.stage);
        }
      } else {
        result = batchPropagules;
      }
    } else {
      result = getFilteredPropagules();
    }

    // Apply maxItems limit if set
    if (maxItems && result.length > maxItems) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [batchId, filters.stage, getPropagulesByBatch, getFilteredPropagules, maxItems]);

  // Calculate stage counts for filter tabs
  const stageCounts = useMemo(() => {
    const basePropagules = batchId ? getPropagulesByBatch(batchId) : propagules;
    const counts: Record<string, number> = {};

    for (const propagule of basePropagules) {
      counts[propagule.stage] = (counts[propagule.stage] ?? 0) + 1;
    }

    return counts;
  }, [batchId, getPropagulesByBatch, propagules]);

  // Handle filter changes
  const handleStageChange = useCallback(
    (stage: PropagationStage | 'all' | 'active') => {
      setFilters({ stage });
    },
    [setFilters]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSort: PropaguleSort) => {
      setSort(newSort);
    },
    [setSort]
  );

  // Handle card click - navigate to detail
  const handleCardClick = useCallback(
    (propaguleId: string) => {
      navigate(`/propagation/propagules/${propaguleId}`);
    },
    [navigate]
  );

  // Handle advance stage click
  const handleAdvanceStageClick = useCallback((propaguleId: string) => {
    setSelectedPropaguleId(propaguleId);
    setUpdateMode('advance');
    setUpdateModalOpen(true);
  }, []);

  // Handle record failure click
  const handleRecordFailureClick = useCallback((propaguleId: string) => {
    setSelectedPropaguleId(propaguleId);
    setUpdateMode('fail');
    setUpdateModalOpen(true);
  }, []);

  // Handle view details
  const handleViewDetails = useCallback(
    (propaguleId: string) => {
      navigate(`/propagation/propagules/${propaguleId}`);
    },
    [navigate]
  );

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setUpdateModalOpen(false);
    setSelectedPropaguleId(null);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-slate-500 dark:text-slate-400">Loading propagules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {displayPropagules.length} propagule{displayPropagules.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters and Sort */}
      {showFilters && (
        <div className="space-y-3">
          <StageFilterTabs
            currentStage={filters.stage}
            stageCounts={stageCounts}
            onStageChange={handleStageChange}
          />
          <div className="flex justify-end">
            <SortDropdown sort={sort} onSortChange={handleSortChange} />
          </div>
        </div>
      )}

      {/* Propagule Grid */}
      {displayPropagules.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">...</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No propagules found
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {batchId
              ? 'This batch has not been exploded into individual propagules yet.'
              : 'No propagules match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayPropagules.map((propagule) => (
            <PropaguleCard
              key={propagule.id}
              propagule={propagule}
              onAdvanceStage={handleAdvanceStageClick}
              onRecordFailure={handleRecordFailureClick}
              onViewDetails={handleViewDetails}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Update Modal */}
      {selectedPropaguleId && (
        <PropaguleUpdateForm
          propaguleId={selectedPropaguleId}
          isOpen={updateModalOpen}
          onClose={handleModalClose}
          mode={updateMode}
        />
      )}
    </div>
  );
}
