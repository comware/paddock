/**
 * useVarieties - Zustand store for variety configurations
 *
 * Provides variety data for forms and analytics.
 */

import { create } from 'zustand';
import { growDb, type GrowVarietyConfig } from '@/lib/db';

export interface VarietiesState {
  varieties: GrowVarietyConfig[];
  isLoading: boolean;
  error: string | null;

  loadVarieties: () => Promise<void>;
  getVariety: (name: string) => GrowVarietyConfig | undefined;
  addVariety: (variety: Omit<GrowVarietyConfig, 'id'>) => Promise<void>;
}

export const useVarieties = create<VarietiesState>((set, get) => ({
  varieties: [],
  isLoading: true,
  error: null,

  loadVarieties: async () => {
    try {
      const varieties = await growDb.varietyConfigs.toArray();
      set({ varieties, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getVariety: (name) => {
    return get().varieties.find((v) => v.name === name);
  },

  addVariety: async (variety) => {
    try {
      const id = await growDb.varietyConfigs.add(variety as GrowVarietyConfig);
      const newVariety = { ...variety, id: String(id) } as GrowVarietyConfig;
      set((state) => ({ varieties: [...state.varieties, newVariety] }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
