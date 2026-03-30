/**
 * Planner Module - Type Exports
 *
 * Barrel file exporting all Planner module types.
 * Import from '@/modules/planner/types' for clean imports.
 */

// Event types and metadata
export {
  PlannerEventTypeValues,
  type PlannerEventType,
  type EventTypeMetadata,
  EVENT_TYPE_METADATA,
  ALL_EVENT_TYPES,
  GROW_EVENT_TYPES,
  PROPAGATION_EVENT_TYPES,
  GENERAL_EVENT_TYPES,
  getEventTypesByModule,
  getEventTypeColor,
  getEventTypeLabel,
  isValidEventType,
} from './eventTypes';

// Core planner types
export {
  // Status types
  type PlannerEventStatus,
  ALL_EVENT_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  isActiveStatus,
  isTerminalStatus,

  // Core entities
  type PlannerEvent,
  type PlannerEventWithComputed,

  // Input types
  type CreateEventInput,
  type UpdateEventInput,
  type LinkEventInput,

  // Filter & sort types
  type PlannerFilters,
  type PlannerSort,
  DEFAULT_PLANNER_FILTERS,
  DEFAULT_PLANNER_SORT,

  // Auto-generation types
  type AutoEventSource,
  type TrayAutoEventConfig,
  type BatchAutoEventConfig,
  type AutoEventConfig,

  // Integration types
  type CreateEntityResult,
  type CreateTrayFromEventOptions,
  type CreateBatchFromEventOptions,
  type LinkedEntityInfo,
  type RelatedEventsResult,

  // Calendar types
  type CalendarView,
  type DateRange,
  type EventsByDate,
  type CalendarState,

  // Analytics types
  type StatusCounts,
  type TypeCounts,
  type PlannerAnalytics,

  // Validation types
  type EventValidationResult,
  type EventValidationError,
  EVENT_VALIDATION_ERRORS,

  // Type guards
  isPlannerEvent,
  hasLinkedEntity,
  getLinkedEntityType,
  getLinkedEntityId,
} from './planner';
