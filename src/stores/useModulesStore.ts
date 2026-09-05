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
  Carrot,
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
  | 'vegetables'
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
    id: 'vegetables',
    name: 'Vegetables',
    path: '/vegetables',
    Icon: Carrot,
    description: 'Beds, successions, and harvests over weeks',
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
 * A fresh install starts with the three growing modules on.
 *
 * They are the enterprises Paddock actually models - microgreens in trays, vegetables in
 * beds, propagation from cuttings - and a grower arriving for the first time is doing at
 * least one of them. Sales, markets and the rest stay off: they are placeholders, and a
 * navigation full of "coming soon" teaches someone the app is mostly empty.
 *
 * Any of these can still be switched off in Settings. Nothing is required.
 */
const DEFAULT_ENABLED: ModuleId[] = ['microgreens', 'propagation', 'vegetables'];

/**
 * Modules added to an install that predates them - once.
 *
 * An existing grower has a stored list that was written before vegetables existed, so the
 * default above never reaches them. This backfills it on the next load.
 *
 * It runs ONCE, tracked by its own settings key, rather than being a floor applied on every
 * load. The difference matters: a floor would switch a module back on every time the grower
 * turned it off, which is not a default, it is an argument.
 */
const BACKFILL_KEY = 'enabled_modules_growing_backfill';
const BACKFILLED: ModuleId[] = ['propagation', 'vegetables'];

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
      const known = Array.isArray(migrated)
        ? (migrated.filter((id) =>
            MODULE_DEFINITIONS.some((m) => m.id === id),
          ) as ModuleId[])
        : DEFAULT_ENABLED;

      // Add the growing modules to an install that predates them, once. `backfillDone`
      // is what stops this becoming a floor that overrides a deliberate switch-off.
      const backfill = await platformDb.settings.where('key').equals(BACKFILL_KEY).first();
      const backfillDone = Boolean(backfill);
      const enabled = backfillDone ? known : [...new Set([...known, ...BACKFILLED])];

      set({
        enabled: [...new Set([...REQUIRED, ...enabled])],
        isLoaded: true,
      });

      const renamedAnything =
        Array.isArray(stored) && stored.some((id) => id in RENAMED);
      const addedAnything = !backfillDone && enabled.length !== known.length;

      if (renamedAnything || addedAnything) {
        if (setting?.id) {
          await platformDb.settings.update(setting.id, { value: enabled });
        } else {
          await platformDb.settings.add({ key: STORAGE_KEY, value: enabled });
        }
      }

      // Mark the backfill done even when it added nothing, so it never reconsiders.
      if (!backfillDone) {
        await platformDb.settings.add({ key: BACKFILL_KEY, value: true });
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
