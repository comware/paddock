/**
 * usePendingProposals - how many agent proposals are awaiting a decision
 *
 * An agent can stage a plan while the grower is anywhere in the app - or not looking at
 * it at all. Without a count somewhere persistent, a proposal is only discoverable by
 * happening to open the calendar.
 *
 * Counts distinct proposals rather than rows: one plan of nine sowings across three
 * options is one thing to decide, not twenty-seven.
 */

import { useEffect, useState } from 'react';
import { getPendingProposalIds, onProposalsChanged } from '@/lib/webmcp';

export function usePendingProposals(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const ids = await getPendingProposalIds();
        if (!cancelled) setCount(ids.length);
      } catch {
        // A failed count must never break navigation. Showing no badge is the safe
        // wrong answer.
        if (!cancelled) setCount(0);
      }
    };

    void refresh();
    const unsubscribe = onProposalsChanged(refresh);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return count;
}
