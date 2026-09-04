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
 * Nothing is required. Grow (microgreens) and the coming vegetables module are siblings,
 * not a dependency chain - so there is no single module every other module feeds, and no
 * reason to lock one on.
 */

import { create } from 'zustand';
import {
  Sprout,
  Leaf,
  Banknote,
  Store,
  Users,
  ChartColumn,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { platformDb } from '@/lib/db';

export type ModuleId =
  | 'microgreens'
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
  Icon: LucideIcon;
  description: string;
  /** Cannot be turned off. */
  required?: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'microgreens',
    name: 'Microgreens',
    path: '/microgreens',
    Icon: Sprout,
    description: 'Trays, sowing calendar, daily logs, and harvest records',
  },
  {
    id: 'propagation',
    name: 'Propagation',
    path: '/propagation',
    Icon: Leaf,
    description: 'Cuttings, rooting stations, and mother plants',
  },
  {
    id: 'sales',
    name: 'Sales',
    path: '/sales',
    Icon: Banknote,
    description: 'Orders and customers',
  },
  {
    id: 'markets',
    name: 'Markets',
    path: '/markets',
    Icon: Store,
    description: 'Market days and stall takings',
  },
  {
    id: 'crm',
    name: 'CRM',
    path: '/crm',
    Icon: Users,
    description: 'Contacts and follow-ups',
  },
  {
    id: 'finance',
    name: 'Finance',
    path: '/finance',
    Icon: ChartColumn,
    description: 'Costs, margins, and reporting',
  },
  {
    id: 'planner',
    name: 'Planner',
    path: '/planner',
    Icon: CalendarDays,
    description: 'Cross-module scheduling and succession planning',
  },
];

const STORAGE_KEY = 'enabled_modules';

/**
 * A fresh install starts with Microgreens alone. Someone running Paddock for the first time
 * is tracking trays; propagation, sales and the rest are things they may grow into. Starting
 * narrow and letting them switch modules on beats presenting seven sections and leaving
 * them to work out which two matter.
 */
const DEFAULT_ENABLED: ModuleId[] = ['microgreens'];

const REQUIRED: ModuleId[] = MODULE_DEFINITIONS.filter((m) => m.required).map((m) => m.id);

/**
 * Module ids that have been renamed, and what they became.
 *
 * The stored list is filtered against MODULE_DEFINITIONS, so an id that no longer exists is
 * silently dropped - and with nothing required any more, nothing puts it back. A grower who
 * had only this module would load into an empty navigation.
 */
const RENAMED: Record<string, ModuleId> = { grow: 'microgreens' };

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

      const migrated = Array.isArray(stored)
        ? stored.map((id) => RENAMED[id as string] ?? id)
        : stored;

      // Tolerate anything unexpected in storage rather than rendering an empty nav.
      const enabled = Array.isArray(migrated)
        ? (migrated.filter((id) =>
            MODULE_DEFINITIONS.some((m) => m.id === id),
          ) as ModuleId[])
        : DEFAULT_ENABLED;

      set({
        enabled: [...new Set([...REQUIRED, ...enabled])],
        isLoaded: true,
      });

      // Persist the migration once, so future loads see the renamed id directly.
      if (Array.isArray(stored) && setting?.id && stored.some((id) => id in RENAMED)) {
        await platformDb.settings.update(setting.id, { value: migrated });
      }
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
