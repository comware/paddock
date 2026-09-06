/**
 * SiteList - Main page for managing sites
 *
 * Shows all sites in a grid with options to add, edit, and delete.
 */

import { ConfirmDialog } from '@/components/ui';
import { MapPin } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSites } from '@/platform';
import { SiteCard } from './SiteCard';
import { NewSiteForm } from './NewSiteForm';
import { EditSiteForm } from './EditSiteForm';
import type { GrowSite } from '@/lib/db';

export function SiteList() {
  const { sites, activeSiteId, isLoading, loadSites, setActiveSite, updateSite, deleteSite } = useSites();
  const navigate = useNavigate();

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
        <div className="text-slate-500 dark:text-slate-400">Loading growing spaces...</div>
      </div>
    );
  }

  // With one growing space /grow redirects into it, so the only way back from here is the
  // growing space itself. Without this the page is a cul-de-sac.
  const defaultSite = sites.find((site) => site.isDefault) ?? sites[0];

  return (
    <div className="space-y-6">
      {defaultSite?.id && (
        <Link
          to={`/grow/site/${defaultSite.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
          <span>Back to {defaultSite.name}</span>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Growing spaces</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Where you grow — a greenhouse, a windowsill, a tent, a spare room
          </p>
        </div>
        <button
          onClick={() => setIsNewSiteOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          <span>Add a space</span>
        </button>
      </div>

      {/* Empty State */}
      {sites.length === 0 ? (
        <EmptyState
          Icon={MapPin}
          title="No growing spaces yet"
          description="Add your first growing space to start tracking weather and organising your trays by where they are."
          action={{ label: 'Add a growing space', onClick: () => setIsNewSiteOpen(true) }}
        />
      ) : (
        <>
          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                isActive={site.id === activeSiteId}
                // Open it. Previously this only marked the space active, so clicking
                // the one you were already in did nothing at all - and the card's own
                // label promised "Open Home Greenhouse". Making it active on the way in
                // is the right side effect, not the whole action.
                onSelect={() => {
                  setActiveSite(site.id!);
                  navigate(`/grow/site/${site.id}`);
                }}
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
                  Tips
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-1 space-y-1">
                  <li>• Click a space to open it</li>
                  <li>• New trays and daily logs go to whichever space you opened last</li>
                  <li>• Enable weather to auto-fetch temperature and humidity</li>
                  <li>• Indoor spaces don't fetch weather</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/*
        * Was a hand-rolled overlay with no dialog role, no Escape and no focus management -
        * a destructive confirmation that a keyboard user could neither reach nor dismiss.
        * ConfirmDialog was already in the codebase doing this properly.
        */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete growing space?"
        message="This will remove the growing space. Trays assigned to it will no longer have one."
        confirmLabel="Delete"
        variant="danger"
      />

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
