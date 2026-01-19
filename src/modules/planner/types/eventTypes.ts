/**
 * Planner Event Types
 *
 * Enum definitions for planner event categorization.
 * Covers both Grow (microgreens) and Propagation module activities.
 *
 * From PRD: docs/planner/PRD.md Section: Event Types
 */

// ============================================
// EVENT TYPE ENUM
// ============================================

/**
 * All possible event types for the Planner calendar.
 * Organized by module for clarity.
 * Using const object pattern for erasableSyntaxOnly compatibility.
 */
export const PlannerEventTypeValues = {
  // Grow Module Events
  SOW: 'sow',
  BLACKOUT_END: 'blackout_end',
  HARVEST: 'harvest',
  WATER: 'water',
  INSPECTION: 'inspection',

  // Propagation Module Events
  TAKE_CUTTINGS: 'take_cuttings',
  ROOTING_CHECK: 'rooting_check',
  POT_UP: 'pot_up',
  HARDEN_OFF: 'harden_off',
  GRADUATION: 'graduation',

  // General Events
  MAINTENANCE: 'maintenance',
  PURCHASE: 'purchase',
  OTHER: 'other',
} as const;

/**
 * Union type matching the database schema definition.
 * Use this for type compatibility with database entities.
 */
export type PlannerEventType =
  // Grow Module Events
  | 'sow'
  | 'blackout_end'
  | 'harvest'
  | 'water'
  | 'inspection'
  // Propagation Module Events
  | 'take_cuttings'
  | 'rooting_check'
  | 'pot_up'
  | 'harden_off'
  | 'graduation'
  // General Events
  | 'maintenance'
  | 'purchase'
  | 'other';

// ============================================
// EVENT TYPE METADATA
// ============================================

/**
 * Metadata for each event type including display info.
 */
export interface EventTypeMetadata {
  type: PlannerEventType;
  label: string;
  description: string;
  color: string;
  module: 'grow' | 'propagation' | 'general';
  icon?: string;
}

/**
 * Complete metadata for all event types.
 * Used for UI rendering, filtering, and display.
 */
export const EVENT_TYPE_METADATA: Record<PlannerEventType, EventTypeMetadata> = {
  // Grow Module Events
  sow: {
    type: 'sow',
    label: 'Sow',
    description: 'Sowing new tray',
    color: '#22c55e',
    module: 'grow',
    icon: 'seed',
  },
  blackout_end: {
    type: 'blackout_end',
    label: 'Blackout End',
    description: 'Move tray to light',
    color: '#eab308',
    module: 'grow',
    icon: 'sun',
  },
  harvest: {
    type: 'harvest',
    label: 'Harvest',
    description: 'Harvest tray',
    color: '#f97316',
    module: 'grow',
    icon: 'scissors',
  },
  water: {
    type: 'water',
    label: 'Water',
    description: 'Watering task',
    color: '#3b82f6',
    module: 'grow',
    icon: 'droplet',
  },
  inspection: {
    type: 'inspection',
    label: 'Inspection',
    description: 'Quality check',
    color: '#8b5cf6',
    module: 'grow',
    icon: 'eye',
  },

  // Propagation Module Events
  take_cuttings: {
    type: 'take_cuttings',
    label: 'Take Cuttings',
    description: 'Take new propagules',
    color: '#14b8a6',
    module: 'propagation',
    icon: 'cut',
  },
  rooting_check: {
    type: 'rooting_check',
    label: 'Rooting Check',
    description: 'Check rooting progress',
    color: '#06b6d4',
    module: 'propagation',
    icon: 'search',
  },
  pot_up: {
    type: 'pot_up',
    label: 'Pot Up',
    description: 'Move to individual pots',
    color: '#3b82f6',
    module: 'propagation',
    icon: 'box',
  },
  harden_off: {
    type: 'harden_off',
    label: 'Harden Off',
    description: 'Begin hardening',
    color: '#6366f1',
    module: 'propagation',
    icon: 'wind',
  },
  graduation: {
    type: 'graduation',
    label: 'Graduation',
    description: 'Ready for sale/planting',
    color: '#a855f7',
    module: 'propagation',
    icon: 'award',
  },

  // General Events
  maintenance: {
    type: 'maintenance',
    label: 'Maintenance',
    description: 'General upkeep',
    color: '#6b7280',
    module: 'general',
    icon: 'wrench',
  },
  purchase: {
    type: 'purchase',
    label: 'Purchase',
    description: 'Buy supplies',
    color: '#ec4899',
    module: 'general',
    icon: 'shopping-cart',
  },
  other: {
    type: 'other',
    label: 'Other',
    description: 'Catch-all',
    color: '#64748b',
    module: 'general',
    icon: 'more-horizontal',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all event types as an array.
 */
export const ALL_EVENT_TYPES: PlannerEventType[] = Object.keys(EVENT_TYPE_METADATA) as PlannerEventType[];

/**
 * Get event types by module.
 */
export function getEventTypesByModule(module: 'grow' | 'propagation' | 'general'): PlannerEventType[] {
  return ALL_EVENT_TYPES.filter((type) => EVENT_TYPE_METADATA[type].module === module);
}

/**
 * Grow-specific event types.
 */
export const GROW_EVENT_TYPES: PlannerEventType[] = getEventTypesByModule('grow');

/**
 * Propagation-specific event types.
 */
export const PROPAGATION_EVENT_TYPES: PlannerEventType[] = getEventTypesByModule('propagation');

/**
 * General event types.
 */
export const GENERAL_EVENT_TYPES: PlannerEventType[] = getEventTypesByModule('general');

/**
 * Get color for an event type.
 */
export function getEventTypeColor(type: PlannerEventType): string {
  return EVENT_TYPE_METADATA[type]?.color ?? '#64748b';
}

/**
 * Get label for an event type.
 */
export function getEventTypeLabel(type: PlannerEventType): string {
  return EVENT_TYPE_METADATA[type]?.label ?? type;
}

/**
 * Check if an event type is valid.
 */
export function isValidEventType(type: string): type is PlannerEventType {
  return type in EVENT_TYPE_METADATA;
}
