/**
 * useModulesStore - which modules this grower actually uses
 *
 * Paddock ships several modules, and most growers use one or two. Showing all of them -
 * greyed out, permanently - fills the navigation with things that will never be clicked
 * and makes the app look bigger and more complicated than the job at hand.
 *
 * Which modules are on is a per-install preference, stored alongside the rest of the
 * grower's data in IndexedDB.
 *
 * Grow cannot be turned off. Every other module either feeds it or reports on it, and an
 * install with nothing enabled has no way back to this screen.
 */

import { create } from 'zustand';
import { platformDb } from '@/lib/db';

export type ModuleId =
  | 'grow'
  | 'propagation'
  | 'sales'
  | 'markets'
  | 'crm'
  | 'finance'
  | 'planner';

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  path: string;
  icon: string;
  description: string;
  /** Cannot be turned off. */
  required?: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'grow',
    name: 'Grow',
    path: '/grow',
    icon: '🌱',
    description: 'Trays, sowing calendar, daily logs, and harvest records',
    required: true,
  },
  {
    id: 'propagation',
    name: 'Propagation',
    path: '/propagation',
    icon: '🪴',
    description: 'Cuttings, rooting stations, and mother plants',
  },
  {
    id: 'sales',
    name: 'Sales',
    path: '/sales',
    icon: '💰',
    description: 'Orders and customers',
  },
  {
    id: 'markets',
    name: 'Markets',
    path: '/markets',
    icon: '🏪',
    description: 'Market days and stall takings',
  },
  {
    id: 'crm',
    name: 'CRM',
    path: '/crm',
    icon: '👥',
    description: 'Contacts and follow-ups',
  },
  {
    id: 'finance',
    name: 'Finance',
    path: '/finance',
    icon: '📊',
    description: 'Costs, margins, and reporting',
  },
  {
    id: 'planner',
    name: 'Planner',
    path: '/planner',
    icon: '📅',
    description: 'Cross-module scheduling and succession planning',
  },
];

const STORAGE_KEY = 'enabled_modules';

/**
 * A fresh install starts with the two modules that are actually built out. Someone
 * running Paddock for the first time should see a small, coherent app rather than a menu
 * of unfinished sections.
 */
const DEFAULT_ENABLED: ModuleId[] = ['grow', 'propagation'];

const REQUIRED: ModuleId[] = MODULE_DEFINITIONS.filter((m) => m.required).map((m) => m.id);

interface ModulesState {
  enabled: ModuleId[];
  isLoaded: boolean;
  load: () => Promise<void>;
  setEnabled: (id: ModuleId, on: boolean) => Promise<void>;
  isEnabled: (id: ModuleId) => boolean;
}

export const useModulesStore = create<ModulesState>((set, get) => ({
  enabled: DEFAULT_ENABLED,
  isLoaded: false,

  load: async () => {
    try {
      const setting = await platformDb.settings.where('key').equals(STORAGE_KEY).first();
      const stored = setting?.value;

      // Tolerate anything unexpected in storage rather than rendering an empty nav.
      const enabled = Array.isArray(stored)
        ? (stored.filter((id) =>
            MODULE_DEFINITIONS.some((m) => m.id === id),
          ) as ModuleId[])
        : DEFAULT_ENABLED;

      set({
        enabled: [...new Set([...REQUIRED, ...enabled])],
        isLoaded: true,
      });
    } catch {
      set({ enabled: DEFAULT_ENABLED, isLoaded: true });
    }
  },

  setEnabled: async (id, on) => {
    // Required modules stay on whatever the caller asks for.
    if (!on && REQUIRED.includes(id)) return;

    const next = on
      ? [...new Set([...get().enabled, id])]
      : get().enabled.filter((m) => m !== id);

    set({ enabled: next });

    const existing = await platformDb.settings.where('key').equals(STORAGE_KEY).first();
    if (existing?.id) {
      await platformDb.settings.update(existing.id, { value: next });
    } else {
      await platformDb.settings.add({ key: STORAGE_KEY, value: next });
    }
  },

  isEnabled: (id) => get().enabled.includes(id),
}));
