/**
 * PropagationGuideLibrary - Browsable table of all propagation guides
 *
 * Displays species propagation guides with key metrics in a searchable,
 * sortable table. Click any row to view the full guide.
 * Includes Getting Started section for beginners and Method guides.
 */

import { Spinner } from '@/components/shared';
import { useState, useEffect, useMemo } from 'react';
import type { PropagationGuideIndex, PropagationGuideMetadata, PropagationMethodMetadata } from '@/lib/guides/propagation-types';
import { GuideSpeciesTable } from './GuideSpeciesTable';
import { GuideDetailModal, type GettingStartedGuide } from './GuideDetailModal';

// Getting Started guide cards for propagation
const gettingStartedGuides: GettingStartedGuide[] = [
  { id: 'concepts', title: 'Core Concepts', description: 'Propagation terminology and fundamental principles', icon: '📖', file: 'getting-started/concepts.md' },
  { id: 'equipment', title: 'Equipment Guide', description: 'Essential tools and supplies for plant propagation', icon: '🛒', file: 'getting-started/equipment.md' },
  { id: 'choosing-method', title: 'Choosing a Method', description: 'How to select the right propagation technique', icon: '🎯', file: 'getting-started/choosing-method.md' },
  { id: 'station-setup', title: 'Station Setup', description: 'Creating an efficient propagation workspace', icon: '🏠', file: 'getting-started/station-setup.md' },
  { id: 'first-batch', title: 'Your First Batch', description: 'Step-by-step guide to your first propagation', icon: '🌱', file: 'getting-started/first-batch.md' },
  { id: 'troubleshooting', title: 'Troubleshooting', description: 'Common problems and solutions', icon: '🔧', file: 'getting-started/troubleshooting.md' },
];

// Cache for guide index
let cachedIndex: PropagationGuideIndex | null = null;

export function PropagationGuideLibrary() {
  const [guides, setGuides] = useState<PropagationGuideMetadata[]>([]);
  const [methods, setMethods] = useState<PropagationMethodMetadata[]>([]);
  const [categories, setCategories] = useState<PropagationGuideIndex['categories']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'species' | 'methods'>('species');

  // Selected guide for detail view
  const [selectedGuide, setSelectedGuide] = useState<PropagationGuideMetadata | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PropagationMethodMetadata | null>(null);
  const [selectedGettingStarted, setSelectedGettingStarted] = useState<GettingStartedGuide | null>(null);
  const [guideContent, setGuideContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Load guide index
  useEffect(() => {
    async function loadGuides() {
      try {
        if (cachedIndex) {
          setGuides(cachedIndex.guides);
          setMethods(cachedIndex.methods);
          setCategories(cachedIndex.categories);
          setIsLoading(false);
          return;
        }
        const res = await fetch('/guides/propagation/index.json');
        if (!res.ok) throw new Error('Failed to load propagation guide index');
        const data: PropagationGuideIndex = await res.json();
        cachedIndex = data;
        setGuides(data.guides);
        setMethods(data.methods);
        setCategories(data.categories);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    loadGuides();
  }, []);

  // Load guide content when selected
  useEffect(() => {
    async function loadContent() {
      const guide = selectedGuide || selectedMethod || selectedGettingStarted;
      if (!guide) { setGuideContent(null); return; }
      setLoadingContent(true);
      try {
        const res = await fetch(`/guides/propagation/${guide.file}`);
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
  }, [selectedGuide, selectedMethod, selectedGettingStarted]);

  const closeModal = () => {
    setSelectedGuide(null);
    setSelectedMethod(null);
    setSelectedGettingStarted(null);
    setGuideContent(null);
  };

  const filteredMethods = useMemo(() => {
    return methods.filter(m => m.status === 'complete');
  }, [methods]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'very-easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Propagation Guide Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{guides.length} species with detailed propagation instructions</p>
        </div>
      </div>

      {/* Getting Started Section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Getting Started</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">New to propagation? Start here with our beginner guides.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {gettingStartedGuides.map((guide) => (
            <button
              key={guide.id}
              onClick={() => setSelectedGettingStarted(guide)}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-primary-500 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">{guide.icon}</div>
              <h3 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">{guide.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{guide.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('species')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'species'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Species Guides ({guides.length})
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'methods'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Method Guides ({filteredMethods.length})
          </button>
        </nav>
      </div>

      {/* Species Guides Tab */}
      {activeTab === 'species' && (
        <GuideSpeciesTable
          guides={guides}
          categories={categories}
          onSelectGuide={setSelectedGuide}
          getDifficultyColor={getDifficultyColor}
        />
      )}

      {/* Methods Tab */}
      {activeTab === 'methods' && (
        <section>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Detailed guides for each propagation technique.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-primary-500 hover:shadow-md transition-all group"
              >
                <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">{method.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(method.difficulty)}`}>{method.difficulty}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Guide Detail Modal */}
      <GuideDetailModal
        selectedGuide={selectedGuide}
        selectedMethod={selectedMethod}
        selectedGettingStarted={selectedGettingStarted}
        guideContent={guideContent}
        loadingContent={loadingContent}
        onClose={closeModal}
        getDifficultyColor={getDifficultyColor}
      />
    </div>
  );
}
