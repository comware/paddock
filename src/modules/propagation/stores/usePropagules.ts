/**
 * usePropagules - Zustand store for individual propagule management
 *
 * Manages individual propagule state when batches are "exploded"
 * for high-value plant tracking. Each propagule gets its own
 * health scores, measurements, photos, and stage transitions.
 *
 * Types and helpers extracted to usePropagules.types.ts
 */

import { create } from 'zustand';
import { propDb } from '@/lib/db';
import type {
  PropPropagule,
  PropBatch,
  PropagationStage,
} from '../types';
import { VALID_STAGE_TRANSITIONS } from '../types';
import { isActiveStage, isValidTransition } from '../utils/stageHelpers';
import {
  enrichPropagule,
  generatePropaguleNumber,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
} from './usePropagules.types';
import type {
  PropagulesState,
  CreatePropaguleFromBatchInput,
  UpdatePropaguleInput,
} from './usePropagules.types';

// Re-export types for consumers
export type {
  PropagulesState,
  CreatePropaguleFromBatchInput,
  UpdatePropaguleInput,
  PropaguleFilters,
  PropaguleSort,
  MeasurementInput,
} from './usePropagules.types';

// ============================================
// STORE
// ============================================

export const usePropagules = create<PropagulesState>((set, get) => ({
  rawPropagules: [],
  propagules: [],
  isLoading: true,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },

  loadPropagules: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawPropagules = await propDb.propagules.toArray();
      const propagules = rawPropagules.map(enrichPropagule);
      set({ rawPropagules, propagules, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createPropagule: async (input: CreatePropaguleFromBatchInput) => {
    const { rawPropagules } = get();
    const now = new Date();

    const batch = await propDb.batches.get(input.batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${input.batchId}`);
    }

    const propaguleNumber = generatePropaguleNumber(batch.batchNumber, rawPropagules);

    const propagule: Omit<PropPropagule, 'id'> = {
      batchId: input.batchId,
      propaguleNumber,
      siteId: input.siteId,
      stationId: input.stationId,
      species: input.species,
      variety: input.variety,
      motherPlantId: input.motherPlantId,
      method: input.method,
      stage: input.stage,
      label: input.label,
      healthScore: input.healthScore,
      notes: input.notes,
      photoUrls: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await propDb.propagules.add(propagule as PropPropagule);
      const newPropagule = { ...propagule, id: String(id) } as PropPropagule;
      set((state) => ({
        rawPropagules: [...state.rawPropagules, newPropagule],
        propagules: [...state.rawPropagules, newPropagule].map(enrichPropagule),
      }));
      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updatePropagule: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await propDb.propagules.update(id, updatedData);
      set((state) => {
        const newRawPropagules = state.rawPropagules.map((p) =>
          p.id === id ? { ...p, ...updatedData } : p
        );
        return {
          rawPropagules: newRawPropagules,
          propagules: newRawPropagules.map(enrichPropagule),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deletePropagule: async (id) => {
    try {
      await propDb.propagules.delete(id);
      set((state) => {
        const newRawPropagules = state.rawPropagules.filter((p) => p.id !== id);
        return {
          rawPropagules: newRawPropagules,
          propagules: newRawPropagules.map(enrichPropagule),
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  explodeBatch: async (batch: PropBatch, count: number) => {
    if (count <= 0) {
      throw new Error('Count must be greater than 0');
    }
    if (count > batch.quantitySurviving) {
      throw new Error(
        `Cannot create ${count} propagules from batch with ${batch.quantitySurviving} surviving`
      );
    }
    if (batch.isExploded) {
      throw new Error('Batch has already been exploded');
    }

    const { createPropagule } = get();
    const createdIds: string[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const id = await createPropagule({
          batchId: batch.id!,
          siteId: batch.siteId,
          stationId: batch.stationId,
          species: batch.species,
          variety: batch.variety,
          motherPlantId: batch.motherPlantId,
          method: batch.method,
          stage: batch.stage,
          healthScore: 3,
        });
        createdIds.push(id);
      }

      await propDb.batches.update(batch.id!, {
        isExploded: true,
        updatedAt: new Date(),
      });

      return createdIds;
    } catch (error) {
      for (const id of createdIds) {
        try { await propDb.propagules.delete(id); } catch { /* ignore */ }
      }
      set({ error: (error as Error).message });
      throw error;
    }
  },

  advanceStage: async (id, toStage) => {
    const { rawPropagules, updatePropagule } = get();
    const propagule = rawPropagules.find((p) => p.id === id);

    if (!propagule) throw new Error(`Propagule not found: ${id}`);

    if (!isValidTransition(propagule.stage, toStage)) {
      const validTargets = VALID_STAGE_TRANSITIONS[propagule.stage];
      throw new Error(
        `Invalid stage transition from '${propagule.stage}' to '${toStage}'. ` +
          `Valid targets: ${validTargets.join(', ') || 'none (terminal state)'}`
      );
    }

    await updatePropagule(id, { stage: toStage } as UpdatePropaguleInput & { stage: PropagationStage });

    await propDb.stageTransitions.add({
      propaguleId: id,
      fromStage: propagule.stage,
      toStage,
      transitionDate: new Date(),
      createdAt: new Date(),
    });
  },

  markFailed: async (id, reason, notes) => {
    const { rawPropagules, updatePropagule } = get();
    const propagule = rawPropagules.find((p) => p.id === id);

    if (!propagule) throw new Error(`Propagule not found: ${id}`);

    if (!isValidTransition(propagule.stage, 'failed')) {
      throw new Error(`Cannot mark propagule as failed from '${propagule.stage}' stage`);
    }

    const failureNote = notes ? `Failed: ${reason} - ${notes}` : `Failed: ${reason}`;
    const existingNotes = propagule.notes || '';
    const newNotes = existingNotes ? `${existingNotes}\n\n${failureNote}` : failureNote;

    await updatePropagule(id, {
      notes: newNotes,
      healthScore: 1,
    } as UpdatePropaguleInput & { stage: PropagationStage });

    await propDb.propagules.update(id, { stage: 'failed', updatedAt: new Date() });

    set((state) => {
      const newRawPropagules = state.rawPropagules.map((p) =>
        p.id === id ? { ...p, stage: 'failed' as PropagationStage, notes: newNotes, healthScore: 1 } : p
      );
      return {
        rawPropagules: newRawPropagules,
        propagules: newRawPropagules.map(enrichPropagule),
      };
    });

    await propDb.stageTransitions.add({
      propaguleId: id,
      fromStage: propagule.stage,
      toStage: 'failed',
      transitionDate: new Date(),
      failureReason: reason,
      notes,
      createdAt: new Date(),
    });
  },

  updateHealthScore: async (id, score) => {
    if (score < 1 || score > 5) throw new Error('Health score must be between 1 and 5');
    await get().updatePropagule(id, { healthScore: score });
  },

  recordMeasurements: async (id, measurements) => {
    await get().updatePropagule(id, measurements);
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  setSort: (sort) => { set({ sort }); },

  resetFilters: () => { set({ filters: { ...DEFAULT_FILTERS } }); },

  getFilteredPropagules: () => {
    const { propagules, filters, sort } = get();
    let filtered = [...propagules];

    if (filters.batchId !== 'all') filtered = filtered.filter((p) => p.batchId === filters.batchId);
    if (filters.stage !== 'all') {
      if (filters.stage === 'active') {
        filtered = filtered.filter((p) => isActiveStage(p.stage));
      } else {
        filtered = filtered.filter((p) => p.stage === filters.stage);
      }
    }
    if (filters.species !== 'all') filtered = filtered.filter((p) => p.species === filters.species);
    if (filters.stationId !== 'all') filtered = filtered.filter((p) => p.stationId === filters.stationId);
    if (filters.siteId !== 'all') filtered = filtered.filter((p) => p.siteId === filters.siteId);
    if (filters.healthScore !== undefined) {
      filtered = filtered.filter((p) => p.healthScore !== undefined && p.healthScore >= filters.healthScore!);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'propaguleNumber': comparison = a.propaguleNumber.localeCompare(b.propaguleNumber); break;
        case 'species': comparison = a.species.localeCompare(b.species); break;
        case 'stage': {
          const stageOrder: PropagationStage[] = ['taken', 'rooting', 'rooted', 'potted_up', 'hardening', 'ready', 'graduated', 'failed'];
          comparison = stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
          break;
        }
        case 'healthScore': comparison = (a.healthScore ?? 0) - (b.healthScore ?? 0); break;
        case 'createdAt': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  },

  getActivePropagules: () => get().propagules.filter((p) => isActiveStage(p.stage)),
  getPropagulesByBatch: (batchId) => get().propagules.filter((p) => p.batchId === batchId),
  getPropagulesByStage: (stage) => get().propagules.filter((p) => p.stage === stage),
  getPropaguleById: (id) => get().propagules.find((p) => p.id === id),
  getActivePropaguleCount: () => get().propagules.filter((p) => isActiveStage(p.stage)).length,

  getUniqueSpecies: () => {
    const species = [...new Set(get().propagules.map((p) => p.species))];
    return species.sort();
  },

  getHealthDistribution: () => {
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const p of get().propagules) {
      if (p.healthScore !== undefined && isActiveStage(p.stage)) distribution[p.healthScore]++;
    }
    return distribution;
  },

  getNextPropaguleNumber: (batchNumber) => generatePropaguleNumber(batchNumber, get().rawPropagules),
}));
