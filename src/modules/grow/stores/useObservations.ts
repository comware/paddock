/**
 * useObservations - Zustand store for daily observations
 *
 * Manages daily log entries with one entry per day enforcement.
 * Tracks mood, tray counts, environment conditions, and reflections.
 */

import { create } from 'zustand';
import { growDb, type GrowObservation } from '@/lib/db';
import { startOfDay, format, isSameDay, getISOWeek, getDay } from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface ObservationsState {
  observations: GrowObservation[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadObservations: () => Promise<void>;
  getTodaysObservation: (siteId?: string) => GrowObservation | null;
  saveObservation: (data: Partial<GrowObservation>) => Promise<string>;
  updateObservation: (id: string, updates: Partial<GrowObservation>) => Promise<void>;
  deleteObservation: (id: string) => Promise<void>;
  migrateOrphanObservations: (defaultSiteId: string) => Promise<number>;

  // Site-scoped selectors
  getObservationsForSite: (siteId: string) => GrowObservation[];
  getTodaysObservationForSite: (siteId: string) => GrowObservation | null;
  getRecentObservationsForSite: (siteId: string, days?: number) => GrowObservation[];

  // Global selectors
  getObservationByDate: (date: Date, siteId?: string) => GrowObservation | null;
  getRecentObservations: (days?: number, siteId?: string) => GrowObservation[];
  getAverageMood: (days?: number, siteId?: string) => number | null;
  getMoodTrend: (siteId?: string) => { date: string; mood: number }[];
}

// ============================================
// STORE
// ============================================

export const useObservations = create<ObservationsState>((set, get) => ({
  observations: [],
  isLoading: true,
  error: null,

  // Load observations from database
  loadObservations: async () => {
    try {
      const observations = await growDb.observations.toArray();
      // Sort by date descending
      observations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      set({ observations, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Get today's observation (optionally filtered by site)
  getTodaysObservation: (siteId?: string) => {
    const { observations } = get();
    const today = startOfDay(new Date());
    return observations.find((o) =>
      isSameDay(new Date(o.date), today) &&
      (siteId ? o.siteId === siteId : true)
    ) || null;
  },

  // Save or update today's observation (site-scoped if siteId provided)
  saveObservation: async (data) => {
    const { observations } = get();
    const today = startOfDay(new Date());
    // Find existing entry for same day AND same site (if site provided)
    const existing = observations.find((o) =>
      isSameDay(new Date(o.date), today) &&
      (data.siteId ? o.siteId === data.siteId : !o.siteId)
    );

    const now = new Date();

    if (existing) {
      // Update existing observation
      await get().updateObservation(existing.id!, data);
      return existing.id!;
    } else {
      // Create new observation with required fields
      const observation: Omit<GrowObservation, 'id'> = {
        siteId: data.siteId,
        date: today,
        week: getISOWeek(today),
        dayOfWeek: getDay(today) || 7, // Convert Sunday from 0 to 7
        temperature: data.temperature,
        humidity: data.humidity,
        weatherSource: data.weatherSource,
        weatherFetchedAt: data.weatherFetchedAt,
        traysBlackout: data.traysBlackout || 0,
        traysLight: data.traysLight || 0,
        traysHarvestedToday: data.traysHarvestedToday || 0,
        problemsSpotted: data.problemsSpotted || '',
        actionsTaken: data.actionsTaken || '',
        moodEnergy: data.moodEnergy || 5,
        keyLearning: data.keyLearning || '',
        tomorrowPriority: data.tomorrowPriority || '',
        createdAt: now,
        updatedAt: now,
      };

      try {
        const id = await growDb.observations.add(observation as GrowObservation);
        const newObservation = { ...observation, id: String(id) } as GrowObservation;
        set((state) => ({
          observations: [newObservation, ...state.observations],
        }));
        return String(id);
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      }
    }
  },

  // Update observation
  updateObservation: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await growDb.observations.update(id, updatedData);
      set((state) => ({
        observations: state.observations.map((o) =>
          o.id === id ? { ...o, ...updatedData } : o
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete observation
  deleteObservation: async (id) => {
    try {
      await growDb.observations.delete(id);
      set((state) => ({
        observations: state.observations.filter((o) => o.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Migrate orphan observations to a default site
  migrateOrphanObservations: async (defaultSiteId) => {
    const { observations } = get();
    const orphans = observations.filter((o) => !o.siteId);

    if (orphans.length === 0) return 0;

    try {
      // Update each orphan observation with the default site
      await Promise.all(
        orphans.map((obs) =>
          growDb.observations.update(obs.id!, { siteId: defaultSiteId })
        )
      );

      // Update local state
      set((state) => ({
        observations: state.observations.map((o) =>
          !o.siteId ? { ...o, siteId: defaultSiteId } : o
        ),
      }));

      return orphans.length;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Site-scoped selectors
  getObservationsForSite: (siteId) => {
    const { observations } = get();
    return observations.filter((o) => o.siteId === siteId);
  },

  getTodaysObservationForSite: (siteId) => {
    const { observations } = get();
    const today = startOfDay(new Date());
    return observations.find((o) =>
      o.siteId === siteId && isSameDay(new Date(o.date), today)
    ) || null;
  },

  getRecentObservationsForSite: (siteId, days = 7) => {
    const { observations } = get();
    return observations
      .filter((o) => o.siteId === siteId)
      .slice(0, days);
  },

  // Get observation by specific date (optionally filtered by site)
  getObservationByDate: (date, siteId?) => {
    const { observations } = get();
    const targetDate = startOfDay(date);
    return observations.find((o) =>
      isSameDay(new Date(o.date), targetDate) &&
      (siteId ? o.siteId === siteId : true)
    ) || null;
  },

  // Get recent observations (optionally filtered by site)
  getRecentObservations: (days = 7, siteId?) => {
    const { observations } = get();
    const filtered = siteId
      ? observations.filter((o) => o.siteId === siteId)
      : observations;
    return filtered.slice(0, days);
  },

  // Calculate average mood over period (optionally filtered by site)
  getAverageMood: (days = 7, siteId?) => {
    const recent = get().getRecentObservations(days, siteId);
    const withMood = recent.filter((o) => o.moodEnergy !== undefined && o.moodEnergy !== null);
    if (withMood.length === 0) return null;
    const sum = withMood.reduce((acc, o) => acc + (o.moodEnergy || 0), 0);
    return Math.round((sum / withMood.length) * 10) / 10;
  },

  // Get mood trend for charting (optionally filtered by site)
  getMoodTrend: (siteId?) => {
    const { observations } = get();
    const filtered = siteId
      ? observations.filter((o) => o.siteId === siteId)
      : observations;
    return filtered
      .filter((o) => o.moodEnergy !== undefined && o.moodEnergy !== null)
      .slice(0, 30)
      .reverse()
      .map((o) => ({
        date: format(new Date(o.date), 'MMM d'),
        mood: o.moodEnergy || 0,
      }));
  },
}));
