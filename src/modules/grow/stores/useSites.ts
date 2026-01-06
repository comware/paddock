/**
 * useSites - Zustand store for site management
 *
 * Manages growing sites (paddocks) with geolocation and weather settings.
 * Supports multiple sites with one active site at a time.
 */

import { create } from 'zustand';
import { growDb, type GrowSite } from '@/lib/db';

const ACTIVE_SITE_KEY = 'paddock-active-site-id';

export interface SitesState {
  sites: GrowSite[];
  activeSiteId: string | null;
  isLoading: boolean;
  error: string | null;

  loadSites: () => Promise<void>;
  addSite: (site: Omit<GrowSite, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSite: (id: string, updates: Partial<GrowSite>) => Promise<void>;
  deleteSite: (id: string) => Promise<void>;
  setActiveSite: (id: string) => void;
  getActiveSite: () => GrowSite | null;
  getDefaultSite: () => GrowSite | undefined;
  ensureDefaultSite: () => Promise<GrowSite>;
}

export const useSites = create<SitesState>((set, get) => ({
  sites: [],
  activeSiteId: localStorage.getItem(ACTIVE_SITE_KEY),
  isLoading: true,
  error: null,

  loadSites: async () => {
    try {
      const sites = await growDb.sites.toArray();
      const defaultSite = sites.find((s) => s.isDefault);
      const storedActiveSiteId = localStorage.getItem(ACTIVE_SITE_KEY);

      // Use stored ID if valid, otherwise fall back to default site
      const activeSiteId =
        storedActiveSiteId && sites.some((s) => s.id === storedActiveSiteId)
          ? storedActiveSiteId
          : defaultSite?.id || null;

      set({
        sites,
        activeSiteId,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSite: async (siteData) => {
    try {
      const now = new Date();
      const isFirst = get().sites.length === 0;

      // If this is the first site or marked as default, unset other defaults
      if (isFirst || siteData.isDefault) {
        const currentDefault = get().sites.find((s) => s.isDefault);
        if (currentDefault?.id) {
          await growDb.sites.update(currentDefault.id, { isDefault: false });
          set((state) => ({
            sites: state.sites.map((s) =>
              s.id === currentDefault.id ? { ...s, isDefault: false } : s
            ),
          }));
        }
      }

      const site: Omit<GrowSite, 'id'> = {
        ...siteData,
        isDefault: isFirst || siteData.isDefault,
        createdAt: now,
        updatedAt: now,
      };

      const id = await growDb.sites.add(site as GrowSite);
      const newSite = { ...site, id: String(id) } as GrowSite;

      set((state) => ({
        sites: [...state.sites, newSite],
        activeSiteId: state.activeSiteId || String(id),
      }));

      // Persist active site if this is the first one
      if (!get().activeSiteId) {
        localStorage.setItem(ACTIVE_SITE_KEY, String(id));
      }

      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateSite: async (id, updates) => {
    try {
      // If setting as default, unset other defaults first
      if (updates.isDefault) {
        const currentDefault = get().sites.find((s) => s.isDefault && s.id !== id);
        if (currentDefault?.id) {
          await growDb.sites.update(currentDefault.id, { isDefault: false });
          set((state) => ({
            sites: state.sites.map((s) =>
              s.id === currentDefault.id ? { ...s, isDefault: false } : s
            ),
          }));
        }
      }

      await growDb.sites.update(id, { ...updates, updatedAt: new Date() });
      set((state) => ({
        sites: state.sites.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteSite: async (id) => {
    try {
      const siteToDelete = get().sites.find((s) => s.id === id);
      const wasDefault = siteToDelete?.isDefault;

      await growDb.sites.delete(id);

      set((state) => {
        const remainingSites = state.sites.filter((s) => s.id !== id);

        // If we deleted the default, make first remaining site default
        if (wasDefault && remainingSites.length > 0) {
          const newDefault = remainingSites[0];
          growDb.sites.update(newDefault.id!, { isDefault: true });
          remainingSites[0] = { ...newDefault, isDefault: true };
        }

        // Update active site if deleted
        let newActiveSiteId = state.activeSiteId;
        if (state.activeSiteId === id) {
          newActiveSiteId = remainingSites[0]?.id || null;
          if (newActiveSiteId) {
            localStorage.setItem(ACTIVE_SITE_KEY, newActiveSiteId);
          } else {
            localStorage.removeItem(ACTIVE_SITE_KEY);
          }
        }

        return {
          sites: remainingSites,
          activeSiteId: newActiveSiteId,
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setActiveSite: (id) => {
    localStorage.setItem(ACTIVE_SITE_KEY, id);
    set({ activeSiteId: id });
  },

  getActiveSite: () => {
    const { sites, activeSiteId } = get();
    return sites.find((s) => s.id === activeSiteId) || null;
  },

  getDefaultSite: () => {
    return get().sites.find((s) => s.isDefault);
  },

  /**
   * Ensures a default site exists for backward compatibility.
   * Creates one if no sites exist (for existing trays without sites).
   */
  ensureDefaultSite: async () => {
    const { sites, addSite, loadSites } = get();

    // Reload to ensure we have latest data
    if (sites.length === 0) {
      await loadSites();
    }

    const currentSites = get().sites;
    if (currentSites.length > 0) {
      return currentSites.find((s) => s.isDefault) || currentSites[0];
    }

    // Create default site for existing data
    const defaultSiteId = await addSite({
      name: 'Default Site',
      description: 'Auto-created for existing trays',
      latitude: 0,
      longitude: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isDefault: true,
      isIndoor: false,
      weatherEnabled: false,
    });

    return get().sites.find((s) => s.id === defaultSiteId)!;
  },
}));
