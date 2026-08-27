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
 * Counts distinct proposals rather than rows: one plan of nine sowings across three
 * options is one thing to decide, not twenty-seven.
 */

import { useEffect, useMemo } from 'react';
import { onProposalsChanged } from '@/lib/webmcp';
import { usePlannedPlantings } from '../stores';

export function usePendingProposals(): number {
  const plantings = usePlannedPlantings((state) => state.plantings);
  const loadPlantings = usePlannedPlantings((state) => state.loadPlantings);

  useEffect(() => {
    void loadPlantings();
  }, [loadPlantings]);

  // Reload when an agent writes, so the badge appears without navigating.
  useEffect(() => onProposalsChanged(() => void loadPlantings()), [loadPlantings]);

  return useMemo(() => {
    const ids = new Set<string>();
    for (const p of plantings) {
      if (p.status === 'proposed' && p.proposalId) ids.add(p.proposalId);
    }
    return ids.size;
  }, [plantings]);
}
