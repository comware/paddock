/**
 * GuideSpeciesTable - Sortable, filterable table of species propagation guides
 *
 * Extracted from PropagationGuideLibrary to reduce component size.
 */

import { useState, useMemo } from 'react';
import type { PropagationGuideMetadata, PropagationGuideIndex } from '@/lib/guides/propagation-types';

type SortField = 'name' | 'difficulty' | 'bestMethod' | 'timeToRoot' | 'successRate' | 'category';
type SortDirection = 'asc' | 'desc';

interface GuideSpeciesTableProps {
  guides: PropagationGuideMetadata[];
  categories: PropagationGuideIndex['categories'];
  onSelectGuide: (guide: PropagationGuideMetadata) => void;
  getDifficultyColor: (difficulty: string) => string;
}

export function GuideSpeciesTable({
  guides,
  categories,
  onSelectGuide,
  getDifficultyColor,
}: GuideSpeciesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredGuides = useMemo(() => {
    let result = [...guides];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(term) ||
        g.category.toLowerCase().includes(term) ||
        g.bestMethod.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(g => g.category === categoryFilter);
    }

    if (difficultyFilter !== 'all') {
      result = result.filter(g => g.difficulty === difficultyFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      const difficultyOrder: Record<string, number> = { 'very-easy': 0, easy: 1, intermediate: 2, advanced: 3 };

      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'difficulty') comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      else if (sortField === 'bestMethod') comparison = a.bestMethod.localeCompare(b.bestMethod);
      else if (sortField === 'timeToRoot') comparison = a.timeToRoot.localeCompare(b.timeToRoot);
      else if (sortField === 'successRate') comparison = a.successRate.localeCompare(b.successRate);
      else if (sortField === 'category') comparison = a.category.localeCompare(b.category);

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

  const getCategoryIcon = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.icon || '🌱';
  };

  return (
    <section>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search species..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
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
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Difficulties</option>
          <option value="very-easy">Very Easy</option>
          <option value="easy">Easy</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Showing {filteredGuides.length} of {guides.length} guides
      </p>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                {(['name', 'category', 'difficulty', 'bestMethod', 'timeToRoot', 'successRate'] as const).map((field) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => handleSort(field)}
                  >
                    <span className={`flex items-center gap-1 ${field === 'timeToRoot' || field === 'successRate' ? 'justify-center' : ''}`}>
                      {field === 'name' ? 'Species' : field === 'bestMethod' ? 'Method' : field === 'timeToRoot' ? 'Time to Root' : field === 'successRate' ? 'Success' : field.charAt(0).toUpperCase() + field.slice(1)}
                      <SortIcon field={field} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredGuides.map((guide) => (
                <tr
                  key={guide.id}
                  onClick={() => onSelectGuide(guide)}
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
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{guide.bestMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-slate-900 dark:text-white">{guide.timeToRoot}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-green-600 dark:text-green-400">{guide.successRate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
