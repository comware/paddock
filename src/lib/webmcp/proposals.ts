/**
 * Proposal Persistence
 *
 * Agent-generated planting plans are written to the database as `proposed` - visible in
 * the calendar, but not committed to. A human approves one option, which promotes it to
 * `planned` and discards the rest.
 *
 * There is deliberately no tool for approving. Approval is a click by a person looking at
 * the plan. The moment an agent can commit its own proposal, the collaboration collapses
 * into delegation, and the grower's knowledge - which bench catches frost, which market
 * wants volume in December - stops entering the process.
 */

import { growDb } from '@/lib/db';
import type { GrowPlannedPlanting } from '@/lib/db';
import type { PlanOption } from './planner';

/** Stable, readable, and unique enough for a client-side grouping key. */
function newProposalId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Persist every option of a proposal as staged plantings.
 *
 * All options are written, not just the top-ranked one, so the grower can compare them in
 * the calendar rather than taking the agent's first answer on trust.
 */
export async function stageProposal(
  options: PlanOption[],
  siteId: string | undefined,
  note: string,
): Promise<string> {
  const proposalId = newProposalId();
  const now = new Date();

  const rows: Array<Omit<GrowPlannedPlanting, 'id'>> = [];

  for (const option of options) {
    for (const p of option.plantings) {
      rows.push({
        siteId,
        variety: p.variety,
        plannedSowDate: new Date(`${p.plannedSowDate}T00:00:00.000Z`),
        targetHarvestDate: new Date(`${p.targetHarvestDate}T00:00:00.000Z`),
        quantity: p.quantity,
        notes: [note, p.adjustment].filter(Boolean).join(' — '),
        status: 'proposed',
        proposalId,
        proposalOption: option.rank,
        proposedBy: 'agent',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await growDb.plannedPlantings.bulkAdd(rows as GrowPlannedPlanting[]);
  return proposalId;
}

/**
 * Approve one option: it becomes `planned`, every other option in the proposal is
 * cancelled.
 *
 * Cancelled rather than deleted - the alternatives the grower rejected are part of how
 * the plan was arrived at, and worth keeping.
 *
 * Uses Dexie's collection `.modify()` rather than `.update(key, ...)`. The table is keyed
 * `++id`, so keys are numbers at runtime even though the interface types them as strings -
 * looking a row up by a stringified key silently matches nothing and the write is lost.
 * Modifying through the query avoids touching keys at all.
 */
export async function approveProposalOption(
  proposalId: string,
  option: number,
): Promise<{ approved: number; discarded: number }> {
  const now = new Date();

  const approved = await growDb.plannedPlantings
    .where('proposalId')
    .equals(proposalId)
    .filter((row) => row.status === 'proposed' && row.proposalOption === option)
    .modify({ status: 'planned', updatedAt: now });

  const discarded = await growDb.plannedPlantings
    .where('proposalId')
    .equals(proposalId)
    .filter((row) => row.status === 'proposed' && row.proposalOption !== option)
    .modify({ status: 'cancelled', updatedAt: now });

  return { approved, discarded };
}

/** Reject an entire proposal. Every option is cancelled. */
export async function rejectProposal(proposalId: string): Promise<number> {
  return await growDb.plannedPlantings
    .where('proposalId')
    .equals(proposalId)
    .filter((row) => row.status === 'proposed')
    .modify({ status: 'cancelled', updatedAt: new Date() });
}

/** Staged plantings for one proposal, still awaiting a decision. */
export async function getProposal(proposalId: string): Promise<GrowPlannedPlanting[]> {
  return await growDb.plannedPlantings
    .where('[proposalId+status]')
    .equals([proposalId, 'proposed'])
    .toArray();
}

/** Every proposal still awaiting a decision, newest first. */
export async function getPendingProposalIds(): Promise<string[]> {
  const rows = await growDb.plannedPlantings.where('status').equals('proposed').toArray();

  const byId = new Map<string, number>();
  for (const row of rows) {
    if (!row.proposalId) continue;
    const at = new Date(row.createdAt).getTime();
    byId.set(row.proposalId, Math.max(byId.get(row.proposalId) ?? 0, at));
  }

  return [...byId.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
