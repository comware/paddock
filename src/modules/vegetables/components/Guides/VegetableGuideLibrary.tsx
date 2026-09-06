/**
 * VegetableGuideLibrary - Browsable library of vegetable growing guides
 *
 * Loads /guides/vegetables/index.json and lists every crop grouped by
 * category, each showing the headline facts from the index (days to
 * maturity, spacing, sowing method) so the list is useful before opening
 * anything. A search box filters by crop name across all categories.
 * Clicking a crop opens GuideDetailModal, which fetches the markdown via
 * useVegetableGuide.
 *
 * Mirrors the shape of the propagation module's guide library
 * (src/modules/propagation/components/Guides/PropagationGuideLibrary.tsx),
 * adapted to vegetables' category-grouped index rather than a flat table.
 */

import { Spinner } from '@/components/shared';
import { useState, useEffect } from 'react';
import type { VegetableGuideIndex } from '@/lib/guides/vegetable-types';
import { GuideDetailModal } from './GuideDetailModal';

export function VegetableGuideLibrary() {
  const [index, setIndex] = useState<VegetableGuideIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadIndex() {
      try {
        const res = await fetch('/guides/vegetables/index.json');
        if (!res.ok) throw new Error('Failed to load vegetable guide index');
        const data: VegetableGuideIndex = await res.json();
        if (!isCancelled) setIndex(data);
      } catch (err) {
        if (!isCancelled) setError((err as Error).message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadIndex();
    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !index) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>Failed to load guides: {error ?? 'unknown error'}</p>
      </div>
    );
  }

  // Plain computed value, not a memo on a stable-reference function — filtering
  // by search term here re-runs on every render, which is what we want.
  const term = searchTerm.trim().toLowerCase();
  const categoriesWithMatches = index.categories
    .map((category) => ({
      category,
      guides: index.guides
        .filter((guide) => guide.category === category.id)
        .filter((guide) => !term || guide.name.toLowerCase().includes(term)),
    }))
    .filter(({ guides }) => guides.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Vegetable Guide Library</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {index.guides.length} crops with bed, spacing, and sowing guidance
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Written for temperate southern Australia. Soil temperature is the reliable
          signal — the month windows assume a cool-temperate climate with winter
          frosts, so adjust them to your own ground.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Days to maturity, spacing and soil temperature are drawn from Australian
          sources. Suggested succession is not: it is a planning default, chosen from how
          long one sowing holds before the next is wanted, and worth adjusting to how fast
          your household actually eats the crop.
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search crops..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {categoriesWithMatches.length === 0 && (
        <p className="text-center text-slate-500 py-8">No crops match &quot;{searchTerm}&quot;.</p>
      )}

      {categoriesWithMatches.map(({ category, guides }) => (
        <section key={category.id}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{category.icon}</span>
            {category.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{category.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <button
                key={guide.id}
                onClick={() => setSelectedCrop(guide.name)}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-primary-500 hover:shadow-md transition-all group"
              >
                <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {guide.name}
                </h3>
                <dl className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <dt>Days to maturity</dt>
                    <dd className="text-slate-700 dark:text-slate-300">{guide.daysToMaturity}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Spacing</dt>
                    <dd className="text-slate-700 dark:text-slate-300">
                      {guide.spacingCm}cm × {guide.rowSpacingCm}cm
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Sowing</dt>
                    <dd className="text-slate-700 dark:text-slate-300 capitalize">{guide.sowingMethod}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        </section>
      ))}

      <GuideDetailModal cropName={selectedCrop} onClose={() => setSelectedCrop(null)} />
    </div>
  );
}
