/**
 * usePendingProposals - how many agent proposals are awaiting a decision
 *
 * An agent can stage a plan while the grower is anywhere in the app - or not looking at
 * it at all. Without a count somewhere persistent, a proposal is only discoverable by
 * happening to open the calendar.
 *
 * Derived from the plantings store rather than querying the database separately. A second
 * query path can disagree with what the calendar is showing, and when it silently returns
 * nothing there is no way to tell that apart from "no proposals". One source of truth
 * means the badge and the panel cannot contradict each other.
 *
 * Keeping that store current is useLivePlantings' job, mounted once for the module.
 *
 * Counts distinct proposals rather than rows: one plan of nine sowings across three
 * options is one thing to decide, not twenty-seven.
 */

import { useMemo } from 'react';
import { usePlannedPlantings } from '../stores';

export function usePendingProposals(): number {
  const plantings = usePlannedPlantings((state) => state.plantings);

  return useMemo(() => {
    const ids = new Set<string>();
    for (const p of plantings) {
      if (p.status === 'proposed' && p.proposalId) ids.add(p.proposalId);
    }
    return ids.size;
  }, [plantings]);
}
