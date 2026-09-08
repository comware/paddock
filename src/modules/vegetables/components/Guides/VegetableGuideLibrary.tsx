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

import { BookOpen, CalendarDays, Shovel, Wrench, Droplets, CircleHelp } from 'lucide-react';
import { categoryIcon } from './categoryIcons';
import { Spinner } from '@/components/shared';
import { useState, useEffect, createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { VegetableGuideIndex } from '@/lib/guides/vegetable-types';
import { GuideDetailModal } from './GuideDetailModal';
import { GettingStartedModal, type GettingStartedGuide } from './GettingStartedModal';

/**
 * The beginner track, ahead of the crop list.
 *
 * These six are not in index.json and deliberately so. That index is a catalogue of crops -
 * every entry carries days to maturity, spacing, a sowing depth - and a page about how to
 * take a soil temperature has none of those. Putting them in would mean six rows of nulls
 * and a `kind` discriminator on every consumer of the index, to describe six files whose
 * paths never change. Both sibling modules hardcode their equivalent list for the same
 * reason.
 *
 * Order is the reading order, not alphabetical: vocabulary, then the seasonal decision, then
 * the bed, then the ongoing habits, then what to do when it has gone wrong.
 */
const GETTING_STARTED: (GettingStartedGuide & { Icon: LucideIcon })[] = [
  {
    id: 'concepts',
    title: 'Core Concepts',
    description: 'Bolting, succession, thinning - the vocabulary the crop guides assume',
    Icon: BookOpen,
    file: 'getting-started/concepts.md',
  },
  {
    id: 'first-bed',
    title: 'Your First Bed',
    description: 'What to sow this month, and the weekend of work it takes',
    Icon: CalendarDays,
    file: 'getting-started/first-bed.md',
  },
  {
    id: 'beds-and-soil',
    title: 'Beds and Soil',
    description: 'Siting, drainage, and preparing ground that will not fight you',
    Icon: Shovel,
    file: 'getting-started/beds-and-soil.md',
  },
  {
    id: 'equipment',
    title: 'Equipment',
    description: 'The nine things you need, and what to ignore',
    Icon: Wrench,
    file: 'getting-started/equipment.md',
  },
  {
    id: 'watering',
    title: 'Watering',
    description: 'Deep and infrequent - and the one time that rule inverts',
    Icon: Droplets,
    file: 'getting-started/watering.md',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'The failures that recur across the library, most common first',
    Icon: CircleHelp,
    file: 'getting-started/troubleshooting.md',
  },
];

/** The category's line icon, sized for a section heading. */
function CategoryIcon({ category }: { category: string }) {
  return createElement(categoryIcon(category), {
    'aria-hidden': true,
    className: 'w-5 h-5 shrink-0 text-slate-500 dark:text-slate-400',
    strokeWidth: 1.75,
  });
}

export function VegetableGuideLibrary() {
  const [index, setIndex] = useState<VegetableGuideIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [selectedIntro, setSelectedIntro] = useState<GettingStartedGuide | null>(null);

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

      {/* Getting Started - ahead of the crop list, because a beginner opening this page
          needs the season before they need the catalogue. */}
      <section aria-labelledby="veg-getting-started-heading">
        <h2
          id="veg-getting-started-heading"
          className="text-lg font-semibold text-slate-900 dark:text-white"
        >
          New to growing vegetables?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Start here. Which crop is right depends on the month you are in, so read
          Your First Bed before picking anything from the library below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GETTING_STARTED.map(({ Icon, ...guide }) => (
            <button
              key={guide.id}
              onClick={() => setSelectedIntro(guide)}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-primary-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <Icon
                  aria-hidden
                  strokeWidth={1.75}
                  className="w-5 h-5 shrink-0 mt-0.5 text-slate-500 dark:text-slate-400"
                />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {guide.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {guide.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search crops..."
            aria-label="Search crops"
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
            <CategoryIcon category={category.id} />
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
      <GettingStartedModal guide={selectedIntro} onClose={() => setSelectedIntro(null)} />
    </div>
  );
}
