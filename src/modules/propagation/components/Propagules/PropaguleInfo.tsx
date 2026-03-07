/**
 * PropaguleInfo - Shared sub-components and info display for PropaguleDetail.
 *
 * Contains MetadataRow, SectionHeader, HealthDisplay, and PhotoGallery.
 * Extracted from PropaguleDetail.tsx for code health.
 */

import type { FailureReason } from '../../types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Display names for failure reasons.
 */
export const FAILURE_REASON_NAMES: Record<FailureReason, string> = {
  rot: 'Rot (Fungal/Bacterial)',
  dried_out: 'Dried Out',
  disease: 'Disease',
  pest: 'Pest Damage',
  no_roots: 'No Root Development',
  transplant_shock: 'Transplant Shock',
  environmental: 'Environmental Issues',
  unknown: 'Unknown',
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
 * Health score display with stars.
 */
export function HealthDisplay({ score }: { score?: number }) {
  const filledStars = score ?? 0;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={`text-xl ${
          i <= filledStars
            ? 'text-yellow-400'
            : 'text-slate-300 dark:text-slate-600'
        }`}
      >
        *
      </span>
    );
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const label = score ? labels[score] : 'Not rated';

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">{stars}</div>
      <span className="text-sm text-slate-500 dark:text-slate-400">({label})</span>
    </div>
  );
}

/**
 * Photo Gallery component.
 */
export function PhotoGallery({ photoUrls }: { photoUrls: string[] }) {
  if (photoUrls.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No photos yet. Add photos via the update form.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photoUrls.map((url, index) => (
        <div
          key={index}
          className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700"
        >
          <img
            src={url}
            alt={`Photo ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
