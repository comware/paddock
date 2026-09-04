/**
 * usePlannerIntegration - Cross-module integration hook
 *
 * Provides operations for linking Planner events to Grow trays
 * and Propagation batches. Handles bidirectional navigation and
 * entity creation from events.
 *
 * From handoff-039: Creates tray/batch from events, finds related events.
 */

import { useCallback, useMemo } from 'react';
import { usePlannerStore } from '../stores/usePlannerStore';
import { useTrays } from '@/modules/microgreens/stores/useTrays';
import { useBatches } from '@/modules/propagation/stores/useBatches';
import type { GrowTray } from '@/lib/db';
import type { PropagationMethod } from '@/modules/propagation/types';
import type {
  CreateEntityResult,
  CreateTrayFromEventOptions,
  CreateBatchFromEventOptions,
  LinkedEntityInfo,
  RelatedEventsResult,
  PlannerEventWithComputed,
} from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Return type for the integration hook.
 */
export interface UsePlannerIntegrationReturn {
  // Create operations
  createTrayFromEvent: (options: CreateTrayFromEventOptions) => Promise<CreateEntityResult>;
  createBatchFromEvent: (options: CreateBatchFromEventOptions) => Promise<CreateEntityResult>;

  // Query operations
  getRelatedEvents: (entityId: string, entityType: 'tray' | 'batch') => RelatedEventsResult;
  getLinkedEntityInfo: (eventId: string) => LinkedEntityInfo | null;

  // Link/unlink operations
  linkEventToTray: (eventId: string, trayId: string) => Promise<void>;
  linkEventToBatch: (eventId: string, batchId: string) => Promise<void>;
  unlinkEvent: (eventId: string) => Promise<void>;

  // Navigation helpers
  getTrayUrl: (trayId: string) => string;
  getBatchUrl: (batchId: string) => string;
  getEventUrl: (eventId: string) => string;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for cross-module integration between Planner and Grow/Propagation.
 *
 * Provides:
 * - createTrayFromEvent: Create a Grow tray and link to the event
 * - createBatchFromEvent: Create a Propagation batch and link to the event
 * - getRelatedEvents: Find planner events linked to a tray/batch
 * - getLinkedEntityInfo: Get display info for an event's linked entity
 */
export function usePlannerIntegration(): UsePlannerIntegrationReturn {
  // Store access
  const plannerStore = usePlannerStore();
  const traysStore = useTrays();
  const batchesStore = useBatches();

  // ==========================================
  // CREATE OPERATIONS
  // ==========================================

  /**
   * Create a Grow tray from a planner event.
   * Links the tray to the event and updates event status to pending.
   */
  const createTrayFromEvent = useCallback(
    async (options: CreateTrayFromEventOptions): Promise<CreateEntityResult> => {
      const { eventId, seedWeight, growingMedium, preSoaked = false, blackoutDays = 3 } = options;

      try {
        // Get the event
        const event = plannerStore.getEvent(eventId);
        if (!event) {
          return { success: false, error: 'Event not found' };
        }

        // Validate event type is appropriate for tray creation
        const validTrayEventTypes = ['sow', 'harvest', 'blackout_end', 'water', 'inspection'];
        if (!validTrayEventTypes.includes(event.eventType)) {
          return {
            success: false,
            error: `Event type '${event.eventType}' is not compatible with tray creation`,
          };
        }

        // Get next tray number
        const trayNumber = traysStore.getNextTrayNumber();

        // Create the tray
        const trayData: Omit<GrowTray, 'id' | 'createdAt' | 'updatedAt'> = {
          siteId: event.siteId,
          trayNumber,
          variety: event.speciesId || event.title,
          dateSown: new Date(),
          seedWeight,
          growingMedium,
          preSoaked,
          blackoutDays,
          problemsObserved: '',
          lessonsLearned: '',
        };

        const trayId = await traysStore.addTray(trayData);

        // Link event to tray and update status
        await plannerStore.linkToTray(eventId, trayId);
        await plannerStore.startEvent(eventId);

        return { success: true, entityId: trayId };
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to create tray from event:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [plannerStore, traysStore]
  );

  /**
   * Create a Propagation batch from a planner event.
   * Links the batch to the event and updates event status to pending.
   */
  const createBatchFromEvent = useCallback(
    async (options: CreateBatchFromEventOptions): Promise<CreateEntityResult> => {
      const { eventId, quantityStarted, stationId, method, motherPlantId } = options;

      try {
        // Get the event
        const event = plannerStore.getEvent(eventId);
        if (!event) {
          return { success: false, error: 'Event not found' };
        }

        // Validate event type is appropriate for batch creation
        const validBatchEventTypes = ['take_cuttings', 'rooting_check', 'pot_up', 'harden_off', 'graduation'];
        if (!validBatchEventTypes.includes(event.eventType)) {
          return {
            success: false,
            error: `Event type '${event.eventType}' is not compatible with batch creation`,
          };
        }

        // Create the batch
        const batchData = {
          siteId: event.siteId,
          stationId,
          species: event.speciesId || event.title,
          method: method as PropagationMethod,
          quantityStarted,
          dateTaken: new Date(),
          motherPlantId,
          photoUrls: [] as string[],
        };

        const batchId = await batchesStore.addBatch(batchData);

        // Link event to batch and update status
        await plannerStore.linkToBatch(eventId, batchId);
        await plannerStore.startEvent(eventId);

        return { success: true, entityId: batchId };
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to create batch from event:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [plannerStore, batchesStore]
  );

  // ==========================================
  // QUERY OPERATIONS
  // ==========================================

  /**
   * Get all planner events related to a tray or batch.
   */
  const getRelatedEvents = useCallback(
    (entityId: string, entityType: 'tray' | 'batch'): RelatedEventsResult => {
      let events: PlannerEventWithComputed[];

      if (entityType === 'tray') {
        events = plannerStore.getEventsByTray(entityId);
      } else {
        events = plannerStore.getEventsByBatch(entityId);
      }

      return {
        events,
        entityType,
        entityId,
      };
    },
    [plannerStore]
  );

  /**
   * Get information about an event's linked entity (tray or batch).
   */
  const getLinkedEntityInfo = useCallback(
    (eventId: string): LinkedEntityInfo | null => {
      const event = plannerStore.getEvent(eventId);
      if (!event) return null;

      if (event.trayId) {
        const tray = traysStore.trays.find((t) => t.id === event.trayId);
        if (tray) {
          return {
            type: 'tray',
            id: tray.id!,
            identifier: `Tray #${tray.trayNumber}`,
            species: tray.variety,
            status: tray.status,
          };
        }
      }

      if (event.batchId) {
        const batch = batchesStore.batches.find((b) => b.id === event.batchId);
        if (batch) {
          return {
            type: 'batch',
            id: batch.id!,
            identifier: batch.batchNumber,
            species: batch.species,
            status: batch.stage,
          };
        }
      }

      return null;
    },
    [plannerStore, traysStore, batchesStore]
  );

  // ==========================================
  // LINK/UNLINK OPERATIONS
  // ==========================================

  /**
   * Link an event to a tray.
   */
  const linkEventToTray = useCallback(
    async (eventId: string, trayId: string): Promise<void> => {
      await plannerStore.linkToTray(eventId, trayId);
    },
    [plannerStore]
  );

  /**
   * Link an event to a batch.
   */
  const linkEventToBatch = useCallback(
    async (eventId: string, batchId: string): Promise<void> => {
      await plannerStore.linkToBatch(eventId, batchId);
    },
    [plannerStore]
  );

  /**
   * Unlink an event from its associated entity.
   */
  const unlinkEvent = useCallback(
    async (eventId: string): Promise<void> => {
      await plannerStore.unlinkEntity(eventId);
    },
    [plannerStore]
  );

  // ==========================================
  // NAVIGATION HELPERS
  // ==========================================

  /**
   * Get URL for viewing a tray.
   */
  const getTrayUrl = useCallback((trayId: string): string => {
    return `/grow/trays/${trayId}`;
  }, []);

  /**
   * Get URL for viewing a batch.
   */
  const getBatchUrl = useCallback((batchId: string): string => {
    return `/propagation/batches/${batchId}`;
  }, []);

  /**
   * Get URL for viewing an event.
   */
  const getEventUrl = useCallback((eventId: string): string => {
    return `/planner/events/${eventId}`;
  }, []);

  // ==========================================
  // RETURN MEMOIZED OBJECT
  // ==========================================

  return useMemo(
    () => ({
      createTrayFromEvent,
      createBatchFromEvent,
      getRelatedEvents,
      getLinkedEntityInfo,
      linkEventToTray,
      linkEventToBatch,
      unlinkEvent,
      getTrayUrl,
      getBatchUrl,
      getEventUrl,
    }),
    [
      createTrayFromEvent,
      createBatchFromEvent,
      getRelatedEvents,
      getLinkedEntityInfo,
      linkEventToTray,
      linkEventToBatch,
      unlinkEvent,
      getTrayUrl,
      getBatchUrl,
      getEventUrl,
    ]
  );
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Check if an event type is valid for creating a tray.
 */
export function isValidTrayEventType(eventType: string): boolean {
  return ['sow', 'harvest', 'blackout_end', 'water', 'inspection'].includes(eventType);
}

/**
 * Check if an event type is valid for creating a batch.
 */
export function isValidBatchEventType(eventType: string): boolean {
  return ['take_cuttings', 'rooting_check', 'pot_up', 'harden_off', 'graduation'].includes(eventType);
}

/**
 * Get suggested event types for a linked entity.
 */
export function getSuggestedEventTypes(entityType: 'tray' | 'batch'): string[] {
  if (entityType === 'tray') {
    return ['sow', 'blackout_end', 'harvest', 'water', 'inspection'];
  }
  return ['take_cuttings', 'rooting_check', 'pot_up', 'harden_off', 'graduation'];
}
