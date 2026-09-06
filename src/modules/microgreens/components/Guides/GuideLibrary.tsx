/**
 * GuideLibrary - Browsable table of all growing guides
 *
 * Displays all microherbs with key metrics in a searchable,
 * sortable table. Click any row to view the full guide.
 * Includes Getting Started section for novice growers.
 */

import { clickable, clickableWithEvent } from '@/lib/a11y/clickable';
import { Spinner } from '@/components/shared';
import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GuideIndex, GuideMetadata } from '@/lib/guides/types';

type SortField = 'name' | 'difficulty' | 'daysToHarvest' | 'blackoutDays' | 'category';
type SortDirection = 'asc' | 'desc';

// Getting Started guide cards
const gettingStartedGuides = [
  {
    id: 'concepts',
    title: 'Core Concepts',
    description: 'Pre-soak, blackout, light phase, and essential terminology',
    icon: '📖',
    file: 'getting-started/concepts.md',
  },
  {
    id: 'equipment',
    title: 'Equipment Guide',
    description: 'What to buy, from budget basics to pro upgrades',
    icon: '🛒',
    file: 'getting-started/equipment.md',
  },
  {
    id: 'first-tray',
    title: 'Your First Tray',
    description: 'Step-by-step guide to growing your first microgreens',
    icon: '🌱',
    file: 'getting-started/first-tray.md',
  },
  {
    id: 'tray-setup',
    title: 'Tray Setup',
    description: 'Dimensions, seeding density, and planting depth',
    icon: '📐',
    file: 'getting-started/tray-setup.md',
  },
  {
    id: 'watering',
    title: 'Watering Guide',
    description: 'When, how much, and which method to use',
    icon: '💧',
    file: 'getting-started/watering.md',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common problems and how to fix them',
    icon: '🔧',
    file: 'getting-started/troubleshooting.md',
  },
];

// Cache for guide index
let cachedIndex: GuideIndex | null = null;

export function GuideLibrary() {
  const [guides, setGuides] = useState<GuideMetadata[]>([]);
  const [categories, setCategories] = useState<GuideIndex['categories']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Selected guide for detail view (variety or getting-started)
  const [selectedGuide, setSelectedGuide] = useState<GuideMetadata | null>(null);
  const [selectedGettingStarted, setSelectedGettingStarted] = useState<typeof gettingStartedGuides[0] | null>(null);
  const [guideContent, setGuideContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Load guide index
  useEffect(() => {
    async function loadGuides() {
      try {
        if (cachedIndex) {
          setGuides(cachedIndex.guides);
          setCategories(cachedIndex.categories);
          setIsLoading(false);
          return;
        }

        const res = await fetch('/guides/index.json');
        if (!res.ok) throw new Error('Failed to load guide index');
        const data: GuideIndex = await res.json();
        cachedIndex = data;
        setGuides(data.guides);
        setCategories(data.categories);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    loadGuides();
  }, []);

  // Load guide content when selected (variety or getting-started)
  useEffect(() => {
    async function loadContent() {
      const guide = selectedGuide || selectedGettingStarted;
      if (!guide) {
        setGuideContent(null);
        return;
      }

      setLoadingContent(true);
      try {
        const res = await fetch(`/guides/${guide.file}`);
        if (!res.ok) throw new Error('Failed to load guide');
        const content = await res.text();
        setGuideContent(content);
      } catch {
        setGuideContent(null);
      } finally {
        setLoadingContent(false);
      }
    }
    loadContent();
  }, [selectedGuide, selectedGettingStarted]);

  // Close modal handler
  const closeModal = () => {
    setSelectedGuide(null);
    setSelectedGettingStarted(null);
    setGuideContent(null);
  };

  // Filter and sort guides
  const filteredGuides = useMemo(() => {
    let result = [...guides];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(term) ||
        g.category.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(g => g.category === categoryFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(g => g.difficulty === difficultyFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'difficulty') {
        const order: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
        comparison = order[a.difficulty] - order[b.difficulty];
      } else if (sortField === 'daysToHarvest') {
        comparison = a.daysToHarvest - b.daysToHarvest;
      } else if (sortField === 'blackoutDays') {
        comparison = a.blackoutDays - b.blackoutDays;
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [guides, searchTerm, categoryFilter, difficultyFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-300 dark:text-slate-600">↕</span>;
    return <span className="text-primary-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.icon || '🌱';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>Failed to load guides: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Growing Guide Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{guides.length} varieties with detailed growing instructions</p>
        </div>
      </div>

      {/* Getting Started Section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Getting Started
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          New to microgreens? Start here with our beginner guides.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {gettingStartedGuides.map((guide) => (
            <button
              key={guide.id}
              onClick={() => setSelectedGettingStarted(guide)}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-primary-500 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">{guide.icon}</div>
              <h3 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {guide.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {guide.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Variety Guides Section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Variety Guides
        </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search varieties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>

        {/* Difficulty Filter */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing {filteredGuides.length} of {guides.length} guides
      </p>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('name')}
                >
                  <span className="flex items-center gap-1">Variety <SortIcon field="name" /></span>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('category')}
                >
                  <span className="flex items-center gap-1">Category <SortIcon field="category" /></span>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('difficulty')}
                >
                  <span className="flex items-center gap-1">Difficulty <SortIcon field="difficulty" /></span>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('daysToHarvest')}
                >
                  <span className="flex items-center justify-center gap-1">Days <SortIcon field="daysToHarvest" /></span>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('blackoutDays')}
                >
                  <span className="flex items-center justify-center gap-1">Blackout <SortIcon field="blackoutDays" /></span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Pre-soak
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredGuides.map((guide) => (
                <tr
                  key={guide.id}
                  {...clickable(() => setSelectedGuide(guide))}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white">{guide.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {getCategoryIcon(guide.category)} {guide.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(guide.difficulty)}`}>
                      {guide.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-slate-900 dark:text-white">{guide.daysToHarvest}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-slate-900 dark:text-white">{guide.blackoutDays}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {guide.preSoak ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </section>

      {/* Guide Detail Modal - handles both variety and getting-started guides */}
      {(selectedGuide || selectedGettingStarted) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          {...clickable(closeModal)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            {...clickableWithEvent((e) => e.stopPropagation())}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                {selectedGettingStarted ? (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedGettingStarted.icon}</span>
                      {selectedGettingStarted.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {selectedGettingStarted.description}
                    </p>
                  </>
                ) : selectedGuide && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedGuide.name}</h2>
                    <div className="flex gap-2 mt-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(selectedGuide.difficulty)}`}>
                        {selectedGuide.difficulty}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {selectedGuide.daysToHarvest} days
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {selectedGuide.blackoutDays}d blackout
                      </span>
                      {selectedGuide.preSoak && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Pre-soak
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingContent ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : guideContent ? (
                <article className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-sm prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{guideContent}</ReactMarkdown>
                </article>
              ) : (
                <p className="text-center text-slate-500 py-8">Failed to load guide content</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
