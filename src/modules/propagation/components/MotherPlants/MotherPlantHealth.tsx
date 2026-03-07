/**
 * MotherPlantHealth - Status change modal and productivity stats.
 *
 * Extracted from MotherPlantDetail.tsx for code health.
 */

import { useState } from 'react';
import type { MotherPlantStatus } from '../../types';
import type { PropMotherPlantWithComputed } from '../../stores';
import type { ExtendedMotherPlantMetrics } from '../../utils';
import {
  formatSuccessRate,
  getProductivityLevel,
  getProductivityColor,
  formatSeason,
} from '../../utils';
import { MetadataRow, SectionHeader } from './MotherPlantInfo';

// ============================================
// CONSTANTS
// ============================================

const STATUS_COLORS: Record<MotherPlantStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200' },
  retired: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
  deceased: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200' },
};

export { STATUS_COLORS };

// ============================================
// STATUS CHANGE MODAL CONTENT
// ============================================

interface StatusChangeModalContentProps {
  plant: PropMotherPlantWithComputed;
  onStatusChange: (status: MotherPlantStatus, notes?: string) => void;
  onClose: () => void;
}

export function StatusChangeModalContent({
  plant,
  onStatusChange,
  onClose,
}: StatusChangeModalContentProps) {
  const [selectedStatus, setSelectedStatus] = useState<MotherPlantStatus>(plant.status);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStatusChange(selectedStatus, notes || undefined);
  };

  const allStatuses: Array<{ value: MotherPlantStatus; label: string; description: string }> = [
    { value: 'active', label: 'Active', description: 'Currently used for propagation' },
    { value: 'retired', label: 'Retired', description: 'No longer used but preserved' },
    { value: 'deceased', label: 'Deceased', description: 'Plant has died' },
  ];

  // Can't resurrect deceased plants
  const availableStatuses = plant.status === 'deceased'
    ? allStatuses.filter((s) => s.value === 'deceased')
    : allStatuses;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Status
        </label>
        <div className="space-y-2">
          {availableStatuses.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedStatus(option.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                selectedStatus === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[option.value].bg}`} />
              <div className="text-left flex-1">
                <div className={`font-medium ${selectedStatus === option.value ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedStatus !== plant.status && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            placeholder="Reason for status change..."
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={selectedStatus === plant.status}
          className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          Update Status
        </button>
      </div>
    </form>
  );
}

// ============================================
// PRODUCTIVITY STATS
// ============================================

interface ProductivityStatsProps {
  metrics: ExtendedMotherPlantMetrics | null;
  isLoadingMetrics: boolean;
}

export function ProductivityStats({
  metrics,
  isLoadingMetrics,
}: ProductivityStatsProps) {
  const productivityLevel = metrics ? getProductivityLevel(metrics.successRate, metrics.totalBatches) : 'insufficient_data';
  const productivityColor = getProductivityColor(productivityLevel);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <SectionHeader title="Productivity" />
      {isLoadingMetrics ? (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          Loading metrics...
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          {/* Overall Rating */}
          <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <div className={`text-2xl font-bold ${productivityColor}`}>
              {productivityLevel === 'insufficient_data'
                ? 'Insufficient Data'
                : productivityLevel.charAt(0).toUpperCase() + productivityLevel.slice(1)}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Productivity Rating
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {metrics.totalBatches}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Batches Taken
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {metrics.totalPropagules}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Propagules Started
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {metrics.totalGraduated}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Graduated
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {formatSuccessRate(metrics.successRate)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Success Rate
              </div>
            </div>
          </div>

          {/* Best Method/Season */}
          {(metrics.bestMethod || metrics.bestSeason) && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              {metrics.bestMethod && (
                <MetadataRow
                  label="Best Method"
                  value={metrics.bestMethod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                />
              )}
              {metrics.bestSeason && (
                <MetadataRow label="Best Season" value={formatSeason(metrics.bestSeason)} />
              )}
            </div>
          )}

          {/* Active Batches */}
          {metrics.totalActive > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <MetadataRow label="Active Batches" value={metrics.totalActive} />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          No productivity data available.
        </div>
      )}
    </div>
  );
}
