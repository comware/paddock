/**
 * Change notifications for agent writes
 *
 * Paddock's UI was built on the assumption that every change originates from the person
 * looking at the screen: a form submits, the store reloads, React re-renders. An agent
 * writing through WebMCP breaks that assumption completely - the database changes while
 * the user is sitting on a page that has no idea anything happened.
 *
 * This is the smallest thing that fixes it. Writes announce themselves; views that care
 * subscribe and reload. Deliberately not a general event bus - one signal, one payload,
 * no ordering guarantees.
 *
 * (Dexie's liveQuery would also solve this, but rewiring the existing stores to it is a
 * far larger change than the problem warrants.)
 */

export type ProposalChange = 'staged' | 'approved' | 'rejected';

type Listener = (change: ProposalChange) => void;

const listeners = new Set<Listener>();

/**
 * Subscribe to proposal changes. Returns an unsubscribe function suitable for returning
 * straight from a React effect.
 */
export function onProposalsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce that staged proposals have changed.
 *
 * A listener that throws must not prevent the others from running, or stop the write that
 * triggered this from completing.
 */
export function emitProposalsChanged(change: ProposalChange): void {
  for (const listener of [...listeners]) {
    try {
      listener(change);
    } catch (error) {
      console.error('[webmcp] proposal listener failed', error);
    }
  }
}

/** Test seam. */
export function clearProposalListeners(): void {
  listeners.clear();
}
