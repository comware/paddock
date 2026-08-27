/**
 * useLivePlantings - keep the plantings store in step with the database
 *
 * Paddock's stores load on mount, which is enough when every write comes from the person
 * looking at the screen. An agent writing through WebMCP breaks that: the database
 * changes and no view has any reason to re-read it.
 *
 * The first attempt at this was an event emitter that writes fired and views subscribed
 * to. It worked only when the write and the listener shared a module instance, which is
 * not something we can rely on for code invoked by an agent - so updates arrived
 * sometimes and not others.
 *
 * Dexie's liveQuery observes the database rather than the code path that wrote to it. It
 * re-runs whenever the table is mutated, no matter who did it or from where, which is the
 * only assumption that actually holds here.
 *
 * Mounted once per module, high in the tree, so every view below - the calendar, the
 * review panel, the nav badge - stays current without each needing its own subscription.
 */

import { useEffect } from 'react';
import { liveQuery } from 'dexie';
import { growDb } from '@/lib/db';
import { usePlannedPlantings } from '../stores';

export function useLivePlantings(): void {
  const loadPlantings = usePlannedPlantings((state) => state.loadPlantings);

  useEffect(() => {
    // Observing the rows themselves rather than a count: approving a proposal changes
    // statuses without changing how many rows exist, and a count would not notice.
    const subscription = liveQuery(() => growDb.plannedPlantings.toArray()).subscribe({
      next: () => {
        void loadPlantings();
      },
      error: (error) => {
        // Losing live updates degrades to the old mount-time behaviour rather than
        // breaking the page, but it should not do so quietly.
        console.error('[paddock] planting live query failed', error);
      },
    });

    // Safety net. liveQuery covers writes made through this Dexie instance, but an agent
    // may invoke tools from a context we do not control. Re-reading whenever the page
    // becomes visible or regains focus costs one query and closes any gap left over.
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadPlantings();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadPlantings]);
}
