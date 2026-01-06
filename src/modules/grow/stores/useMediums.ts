/**
 * useMediums - Zustand store for growing medium configurations
 *
 * Provides medium data for forms and analytics.
 */

import { create } from 'zustand';
import { growDb, type GrowMediumConfig } from '@/lib/db';

export interface MediumsState {
  mediums: GrowMediumConfig[];
  isLoading: boolean;
  error: string | null;

  loadMediums: () => Promise<void>;
  getMedium: (value: string) => GrowMediumConfig | undefined;
}

export const useMediums = create<MediumsState>((set, get) => ({
  mediums: [],
  isLoading: true,
  error: null,

  loadMediums: async () => {
    try {
      const mediums = await growDb.mediumConfigs.toArray();
      set({ mediums, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getMedium: (value) => {
    return get().mediums.find((m) => m.value === value);
  },
}));
