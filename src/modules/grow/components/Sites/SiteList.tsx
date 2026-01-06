/**
 * SiteList - Main page for managing sites
 *
 * Shows all sites in a grid with options to add, edit, and delete.
 */

import { useState, useEffect } from 'react';
import { useSites } from '../../stores';
import { SiteCard } from './SiteCard';
import { NewSiteForm } from './NewSiteForm';
import { EditSiteForm } from './EditSiteForm';
import type { GrowSite } from '@/lib/db';

export function SiteList() {
  const { sites, activeSiteId, isLoading, loadSites, setActiveSite, updateSite, deleteSite } = useSites();

  const [isNewSiteOpen, setIsNewSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<GrowSite | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleSetDefault = async (siteId: string) => {
    await updateSite(siteId, { isDefault: true });
  };

  const handleDelete = async (siteId: string) => {
    await deleteSite(siteId);
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sites</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your growing locations
          </p>
        </div>
        <button
          onClick={() => setIsNewSiteOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>Add Site</span>
        </button>
      </div>

      {/* Empty State */}
      {sites.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">📍</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Sites Yet
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Add your first growing site to start tracking weather data and organizing your trays by location.
          </p>
          <button
            onClick={() => setIsNewSiteOpen(true)}
            className="px-6 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <>
          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                isActive={site.id === activeSiteId}
                onSelect={() => setActiveSite(site.id!)}
                onEdit={() => setEditingSite(site)}
                onDelete={() => setDeleteConfirmId(site.id!)}
                onSetDefault={() => handleSetDefault(site.id!)}
              />
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Site Tips
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-1 space-y-1">
                  <li>• Click a site card to make it the active site</li>
                  <li>• The active site is used for new trays and daily observations</li>
                  <li>• Enable weather to auto-fetch temperature and humidity</li>
                  <li>• Indoor sites don't fetch weather data</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Delete Site?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This will remove the site. Trays associated with this site will no longer have a site assigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms */}
      <NewSiteForm isOpen={isNewSiteOpen} onClose={() => setIsNewSiteOpen(false)} />
      <EditSiteForm
        isOpen={!!editingSite}
        onClose={() => setEditingSite(null)}
        site={editingSite}
      />
    </div>
  );
}
