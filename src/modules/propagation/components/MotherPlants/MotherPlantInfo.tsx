/**
 * MotherPlantInfo - Static plant details and health status display.
 *
 * Extracted from MotherPlantDetail.tsx for code health.
 * Contains shared sub-components MetadataRow and SectionHeader used
 * across the mother plant detail sections.
 */

import { format } from 'date-fns';
import type { PropMotherPlantWithComputed } from '../../stores';

// ============================================
// CONSTANTS
// ============================================

const ACQUISITION_METHOD_NAMES: Record<string, string> = {
  purchased: 'Purchased',
  propagated: 'Propagated',
  gifted: 'Gifted',
  wild_collected: 'Wild Collected',
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

/**
 * Health indicator with score.
 */
export function HealthIndicator({ score }: { score?: number }) {
  if (!score) {
    return <span className="text-slate-400">No data</span>;
  }

  const getColor = () => {
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score >= 3) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLabel = () => {
    if (score >= 4) return 'Excellent';
    if (score === 4) return 'Good';
    if (score === 3) return 'Fair';
    if (score === 2) return 'Poor';
    return 'Critical';
  };

  return (
    <span className={`font-medium ${getColor()}`}>
      {score}/5 ({getLabel()})
    </span>
  );
}

// ============================================
// PLANT DETAILS SECTION
// ============================================

interface MotherPlantInfoSectionProps {
  plant: PropMotherPlantWithComputed;
}

export function MotherPlantInfoSection({ plant }: MotherPlantInfoSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <SectionHeader title="Plant Details" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div>
          <MetadataRow label="Label" value={plant.label} />
          <MetadataRow label="Species" value={plant.species} />
          <MetadataRow label="Variety" value={plant.variety} />
          <MetadataRow label="Scientific Name" value={plant.scientificName} />
          <MetadataRow label="Location" value={plant.location} />
        </div>
        <div>
          <MetadataRow
            label="Acquisition Date"
            value={format(new Date(plant.acquisitionDate), 'MMM d, yyyy')}
          />
          <MetadataRow
            label="Acquisition Method"
            value={ACQUISITION_METHOD_NAMES[plant.acquisitionMethod] || plant.acquisitionMethod}
          />
          <MetadataRow label="Source" value={plant.acquisitionSource} />
          <MetadataRow
            label="Cost"
            value={plant.acquisitionCost ? `$${plant.acquisitionCost.toFixed(2)}` : undefined}
          />
          <MetadataRow
            label="Age"
            value={
              plant.ageInMonths < 12
                ? `${plant.ageInMonths} months`
                : `${Math.floor(plant.ageInMonths / 12)} years, ${plant.ageInMonths % 12} months`
            }
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// HEALTH STATUS SECTION
// ============================================

export function MotherPlantHealthSection({ plant }: MotherPlantInfoSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <SectionHeader title="Health Status" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div>
          <MetadataRow label="Current Health">
            <HealthIndicator score={plant.healthScore} />
          </MetadataRow>
          <MetadataRow
            label="Last Check"
            value={
              plant.lastHealthCheck
                ? format(new Date(plant.lastHealthCheck), 'MMM d, yyyy')
                : 'Never'
            }
          />
          {plant.daysSinceLastHealthCheck !== null && (
            <MetadataRow label="Days Since Check" value={plant.daysSinceLastHealthCheck} />
          )}
        </div>
        <div>
          {plant.healthNotes && (
            <div className="py-2">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Notes</span>
              <p className="text-slate-700 dark:text-slate-300 text-sm">
                {plant.healthNotes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
