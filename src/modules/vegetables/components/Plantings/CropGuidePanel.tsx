/**
 * CropGuidePanel - contextual growing guidance for the crop being planted.
 *
 * Unlike GrowingGuidePanel (microgreens), which fills a dedicated tab and shows a
 * "no guide available" message for an unmatched variety, this panel renders nothing at
 * all when there's no match. A vegetable grower typing "Yacon" or "Purple Congo" is
 * sowing something the guide library doesn't cover yet - that's not an error state worth
 * nagging about on every keystroke, it's just silence. The same goes for a crop field
 * that's empty or too short to be worth a lookup.
 *
 * Collapsed by default: the planting form is already long, and this is supporting
 * information, not the main event.
 */

import { useState } from 'react';
import { useVegetableGuide } from '@/lib/guides/useVegetableGuide';

interface CropGuidePanelProps {
  cropName: string;
}

// Below this length a lookup isn't worth firing - avoids a request (and a flash of
// "no guide found") on the first keystroke or two.
const MIN_CROP_NAME_LENGTH = 3;

export function CropGuidePanel({ cropName }: CropGuidePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const trimmedName = cropName.trim();
  const lookupName = trimmedName.length >= MIN_CROP_NAME_LENGTH ? trimmedName : null;
  const { metadata, isLoading } = useVegetableGuide(lookupName);

  // Silence is correct here: no name yet, name too short to bother, still loading, or no
  // match. No spinner, no "not found" message - none of those help someone filling in a
  // form, and a match-shaped guess for an unmatched crop would be actively misleading.
  if (isLoading || !metadata) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <span>Growing guide: {metadata.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-700">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Days to maturity</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{metadata.daysToMaturity}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Sowing method</dt>
              <dd className="text-slate-900 dark:text-white font-medium capitalize">{metadata.sowingMethod}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Plant spacing</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{metadata.spacingCm} cm</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Row spacing</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{metadata.rowSpacingCm} cm</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Sowing depth</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{metadata.sowingDepthMm} mm</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Soil temperature</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{metadata.soilTempC}&deg;C</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Succession interval</dt>
              <dd className="text-slate-900 dark:text-white font-medium">
                {metadata.successionDays === null ? 'Not a succession crop' : `Every ${metadata.successionDays} days`}
              </dd>
            </div>
          </dl>

          <a
            href="/vegetables/guides"
            className="inline-block mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            View full growing guide &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
