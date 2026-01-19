# Paddock Planner Module - Product Requirements Document

**Version**: 1.0
**Status**: Draft
**Created**: 2026-01-19
**Module**: Planner (Crop Calendar)

---

## Executive Summary

The Planner module provides a visual crop calendar for Paddock users, enabling them to schedule, track, and manage growing activities across their Grow (microgreen) and Propagation modules. This MVP focuses on a **simple calendar view** using `react-big-calendar`, displaying events linked to existing trays and batches.

**Explicit Scope Boundary**: This version does NOT include succession planting, recurring events, or automated scheduling. Those features are planned for future iterations.

---

## Problem Statement

Paddock users currently manage their growing activities through separate module dashboards (Grow and Propagation). While each module tracks its own lifecycle stages, there's no unified calendar view that shows:

1. When trays should move from blackout to light
2. When harvests are expected
3. When propagation batches should advance stages
4. Upcoming tasks across all growing activities

Users need a centralized calendar to visualize their growing schedule and plan activities.

---

## Goals & Success Metrics

### Primary Goals

1. **Unified Visibility**: Single calendar showing all scheduled growing activities
2. **Cross-Module Integration**: Link events to Grow trays and Propagation batches
3. **Simple Scheduling**: Create manual events for any growing task
4. **Quick Navigation**: Click events to jump to related entities

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Calendar adoption | 60% of active users | Users viewing calendar weekly |
| Events created | 5+ per user/week | Manual event creation rate |
| Navigation clicks | 3+ per session | Event → Entity navigation |

---

## User Stories

### Epic: Calendar Visualization

#### US-001: View Monthly Calendar
**As a** grower
**I want to** see a monthly calendar of all my growing events
**So that** I can plan my time and see what's coming up

**Acceptance Criteria:**
- Calendar displays current month by default
- Navigation to previous/next months
- Events appear on their scheduled dates
- Color-coding by event type
- Responsive design for mobile/desktop

#### US-002: View Weekly Calendar
**As a** grower
**I want to** see a weekly view of my calendar
**So that** I can focus on near-term activities

**Acceptance Criteria:**
- Toggle between month and week views
- Week view shows more event detail
- Current day highlighted

#### US-003: View Today's Events
**As a** grower
**I want to** see today's scheduled events prominently
**So that** I know what needs attention now

**Acceptance Criteria:**
- Agenda/day view available
- Today button for quick navigation
- Events sorted by time or priority

---

### Epic: Event Management

#### US-004: Create Manual Event
**As a** grower
**I want to** create calendar events for growing tasks
**So that** I can schedule activities not auto-generated

**Acceptance Criteria:**
- Form with title, date, event type, notes
- Optional linking to tray or batch
- Optional site/station assignment
- Event appears on calendar immediately

#### US-005: Edit Event
**As a** grower
**I want to** modify existing calendar events
**So that** I can adjust my schedule as plans change

**Acceptance Criteria:**
- Click event to open edit form
- Update any field
- Delete event option
- Changes reflect immediately

#### US-006: Complete Event
**As a** grower
**I want to** mark events as completed
**So that** I can track what I've accomplished

**Acceptance Criteria:**
- Complete button on event detail
- Completed date recorded
- Visual distinction for completed events
- Option to hide completed events

---

### Epic: Cross-Module Integration

#### US-007: Link Event to Tray
**As a** grower
**I want to** associate an event with a specific tray
**So that** I can track activities related to that tray

**Acceptance Criteria:**
- Searchable dropdown of active trays
- Shows tray number, variety, status
- Click linked event → navigates to tray detail
- Tray detail shows linked events

#### US-008: Link Event to Batch
**As a** propagator
**I want to** associate an event with a propagation batch
**So that** I can track batch-related activities

**Acceptance Criteria:**
- Searchable dropdown of active batches
- Shows batch number, species, stage
- Click linked event → navigates to batch detail
- Batch detail shows linked events

#### US-009: Auto-Generated Events from Trays
**As a** grower
**I want to** see computed events from my trays
**So that** blackout-to-light and harvest dates appear automatically

**Acceptance Criteria:**
- Blackout → light events from `dateToLight`
- Expected harvest events from forecast
- Visual indicator that event is auto-generated
- Click navigates to source tray

#### US-010: Auto-Generated Events from Batches
**As a** propagator
**I want to** see computed events from batch stage expectations
**So that** I know when batches may need attention

**Acceptance Criteria:**
- Rooting check events (batch dateTaken + typical days)
- Potting up reminders based on species config
- Visual indicator for auto-generated events
- Click navigates to source batch

---

### Epic: Filtering & Organization

#### US-011: Filter by Site
**As a** multi-site grower
**I want to** filter calendar to a specific site
**So that** I can focus on one location at a time

**Acceptance Criteria:**
- Site dropdown filter
- "All sites" option
- Filter persists during session

#### US-012: Filter by Event Type
**As a** grower
**I want to** filter calendar by event type
**So that** I can focus on specific activities

**Acceptance Criteria:**
- Checkbox filters for event types
- Multiple types selectable
- Quick "show all" toggle

#### US-013: Filter by Status
**As a** grower
**I want to** show/hide completed events
**So that** I can focus on pending work

**Acceptance Criteria:**
- Toggle for completed events
- Default: show pending only
- Option to show all

---

## Data Model

### PlannerEvent Entity

The core entity follows Paddock's established patterns: site-centric architecture, temporal tracking, and optional cross-module linking.

```typescript
interface PlannerEvent {
  // Identity
  id?: string;                    // Auto-generated, stored as string

  // Core Fields
  title: string;                  // User-visible event name
  eventType: PlannerEventType;    // Categorization
  scheduledDate: Date;            // When event should occur
  completedDate?: Date;           // When actually completed (null if pending)
  status: PlannerEventStatus;     // Current state

  // Optional Linking (at most one)
  speciesId?: string;             // Link to variety/species config
  trayId?: string;                // Link to GrowTray
  batchId?: string;               // Link to PropBatch

  // Location Context
  siteId: string;                 // Required: FK to GrowSite
  stationId?: string;             // Optional: FK to PropStation

  // Additional Data
  notes?: string;                 // User notes/details

  // Metadata
  isAutoGenerated: boolean;       // True if computed from tray/batch
  sourceType?: 'tray' | 'batch';  // What generated this event
  sourceId?: string;              // ID of generating entity

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Event Types

```typescript
type PlannerEventType =
  // Grow Module Events
  | 'sow'              // Sowing new tray
  | 'blackout_end'     // Move tray to light
  | 'harvest'          // Harvest tray
  | 'water'            // Watering task
  | 'inspection'       // Quality check

  // Propagation Module Events
  | 'take_cuttings'    // Take new propagules
  | 'rooting_check'    // Check rooting progress
  | 'pot_up'           // Move to individual pots
  | 'harden_off'       // Begin hardening
  | 'graduation'       // Ready for sale/planting

  // General Events
  | 'maintenance'      // General upkeep
  | 'purchase'         // Buy supplies
  | 'other';           // Catch-all
```

### Event Status

```typescript
type PlannerEventStatus =
  | 'scheduled'        // Future event
  | 'pending'          // Due today or overdue
  | 'completed'        // Done
  | 'cancelled'        // No longer needed
  | 'skipped';         // Deliberately skipped
```

### Computed Fields (not persisted)

```typescript
interface PlannerEventWithComputed extends PlannerEvent {
  // Computed at runtime
  daysUntil: number;              // Days until scheduledDate
  isOverdue: boolean;             // Past scheduledDate and not completed
  isPending: boolean;             // Due today
  displayColor: string;           // Based on eventType and status
  linkedEntityName?: string;      // Tray/batch identifier for display
}
```

### Database Schema

```typescript
// Dexie table definition
plannerEvents: '++id, siteId, scheduledDate, status, eventType, trayId, batchId, [siteId+scheduledDate], [siteId+status], [siteId+eventType]'
```

**Index Rationale:**
- `[siteId+scheduledDate]`: Calendar queries by site and date range
- `[siteId+status]`: Dashboard: pending events per site
- `[siteId+eventType]`: Filter by type within site

---

## Integration Points

### With Grow Module

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Tray linking | Planner → Grow | Event references tray via `trayId` |
| Auto-events | Grow → Planner | Compute events from tray dates |
| Navigation | Bidirectional | Click event → tray detail, tray → linked events |
| Species config | Grow → Planner | Use `typicalDaysToHarvest` for forecasting |

### With Propagation Module

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Batch linking | Planner → Prop | Event references batch via `batchId` |
| Auto-events | Prop → Planner | Compute events from batch stages |
| Navigation | Bidirectional | Click event → batch detail |
| Species config | Prop → Planner | Use `typicalRootingDays` for forecasting |
| Station context | Prop → Planner | Events can reference station location |

### With Settings Module

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Site selection | Settings → Planner | Active site determines default filter |
| Species configs | Settings → Planner | Event type defaults from configs |

---

## MVP Scope Definition

### In Scope (MVP)

1. **Calendar UI**: react-big-calendar with month/week/agenda views
2. **Manual Events**: CRUD operations for PlannerEvent
3. **Event Types**: Full enum as defined above
4. **Tray Linking**: Optional FK to GrowTray
5. **Batch Linking**: Optional FK to PropBatch
6. **Site Filtering**: Filter by GrowSite
7. **Status Filtering**: Show/hide completed
8. **Basic Navigation**: Event → linked entity
9. **Color Coding**: Visual distinction by eventType

### Explicitly Out of Scope (Future)

1. **Succession Planting**: Automated recurring sowing schedules
2. **Recurring Events**: Weekly/daily repeat patterns
3. **Reminders/Notifications**: Push notifications, email alerts
4. **Drag-and-Drop**: Moving events between dates
5. **Bulk Operations**: Multi-select and batch edit
6. **Resource Planning**: Labor/capacity scheduling
7. **Weather Integration**: Weather-based recommendations
8. **Templates**: Saved event sequences
9. **Dependencies**: Event chaining/prerequisites
10. **Sharing**: Multi-user calendar coordination

---

## UI/UX Requirements

### Calendar Component

**Technology**: `react-big-calendar` with `date-fns` localizer

**Views Required:**
- Month view (default)
- Week view
- Agenda view (list format)

**Event Display:**
- Title visible on calendar cell
- Color by eventType
- Opacity/strikethrough for completed
- Badge for overdue events

### Event Form

**Fields:**
- Title (required, text input)
- Event Type (required, select dropdown)
- Scheduled Date (required, date picker)
- Site (required, select from GrowSite)
- Station (optional, select from PropStation)
- Linked Tray (optional, searchable select)
- Linked Batch (optional, searchable select)
- Notes (optional, textarea)

**Validation:**
- Title: 1-100 characters
- Scheduled Date: not in distant past (>1 year)
- Only one of Tray or Batch can be linked

### Filter Panel

**Controls:**
- Site selector (dropdown)
- Event type checkboxes
- Status toggle (pending only / all)
- Date range (for agenda view)

---

## Technical Architecture

### Zustand Store: `usePlannerEvents`

```typescript
interface PlannerState {
  // Raw data
  rawEvents: PlannerEvent[];

  // Enriched data
  events: PlannerEventWithComputed[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: {
    siteId: string | 'all';
    eventTypes: PlannerEventType[] | 'all';
    showCompleted: boolean;
    dateRange: { start: Date; end: Date };
  };

  // Actions
  loadEvents: () => Promise<void>;
  addEvent: (event: Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateEvent: (id: string, updates: Partial<PlannerEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  completeEvent: (id: string) => Promise<void>;

  // Filters
  setFilters: (filters: Partial<PlannerState['filters']>) => void;

  // Computed selectors
  getFilteredEvents: () => PlannerEventWithComputed[];
  getEventsForDate: (date: Date) => PlannerEventWithComputed[];
  getOverdueEvents: () => PlannerEventWithComputed[];
  getUpcomingEvents: (days: number) => PlannerEventWithComputed[];
  getEventsByTray: (trayId: string) => PlannerEventWithComputed[];
  getEventsByBatch: (batchId: string) => PlannerEventWithComputed[];
}
```

### Auto-Event Generation

Events from trays and batches are computed on-the-fly (not persisted):

```typescript
function generateAutoEvents(
  trays: GrowTray[],
  batches: PropBatch[],
  configs: SpeciesConfig[]
): PlannerEventWithComputed[] {
  const events: PlannerEventWithComputed[] = [];

  // From trays: blackout_end, harvest
  for (const tray of trays) {
    if (tray.dateToLight && tray.status === 'blackout') {
      events.push(createAutoEvent('blackout_end', tray));
    }
    // ... harvest forecasting
  }

  // From batches: rooting_check, pot_up, etc.
  for (const batch of batches) {
    // Use PropSpeciesConfig for timing
    // ...
  }

  return events;
}
```

---

## File Structure

```
src/modules/planner/
├── components/
│   ├── PlannerCalendar.tsx      # Main calendar component
│   ├── EventForm.tsx            # Create/edit event form
│   ├── EventDetail.tsx          # Event detail view
│   ├── EventFilters.tsx         # Filter controls
│   └── EventBadge.tsx           # Event display on calendar
├── stores/
│   └── usePlannerEvents.ts      # Zustand store
├── hooks/
│   ├── useAutoEvents.ts         # Generate events from trays/batches
│   └── useEventNavigation.ts    # Handle entity navigation
├── utils/
│   ├── eventColors.ts           # Color mapping by type
│   ├── eventEnrichment.ts       # Compute derived fields
│   └── calendarConfig.ts        # react-big-calendar setup
├── types/
│   └── planner.ts               # TypeScript interfaces
└── index.ts                     # Module exports
```

---

## Dependencies

### New Dependencies

```json
{
  "react-big-calendar": "^1.8.x",
  "date-fns": "^3.x"  // Already in project
}
```

### Existing Dependencies (reuse)

- Zustand (state management)
- Dexie (database)
- React Hook Form + Zod (forms)
- Tailwind CSS (styling)

---

## Migration Plan

### Database Migration (v9)

```typescript
// Add to Dexie schema
.upgrade(trans => {
  // Create plannerEvents table
  trans.db.createObjectStore('plannerEvents', { keyPath: 'id', autoIncrement: true });
});
```

### No Data Migration Required

New module with empty initial state.

---

## Testing Strategy

### Unit Tests

- Event enrichment functions
- Filter logic
- Auto-event generation
- Date calculations

### Integration Tests

- CRUD operations with Dexie
- Cross-module navigation
- Filter state persistence

### E2E Tests

- Create event flow
- Edit event flow
- Calendar navigation
- Event completion
- Entity navigation

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Calendar performance with many events | Medium | Medium | Paginate/limit visible date range |
| react-big-calendar customization limits | Low | Medium | Custom event components allowed |
| Auto-event computation overhead | Low | Low | Memoize with useMemo |
| Mobile calendar UX | Medium | Medium | Agenda view as primary mobile |

---

## Future Considerations

After MVP, consider:

1. **Succession Planting** (v2): Recurring sowing schedules based on harvest demand
2. **Smart Scheduling** (v3): AI-recommended timing based on historical data
3. **Notifications** (v2): Push notifications for upcoming/overdue events
4. **Templates** (v2): Save and reuse event sequences
5. **Weather Integration** (v3): Adjust schedules based on forecasts
6. **Multi-User** (v3): Shared calendars with assignment

---

## Appendix

### Event Type Color Scheme

| Event Type | Color | Hex |
|------------|-------|-----|
| sow | Green | #22c55e |
| blackout_end | Yellow | #eab308 |
| harvest | Orange | #f97316 |
| take_cuttings | Teal | #14b8a6 |
| rooting_check | Cyan | #06b6d4 |
| pot_up | Blue | #3b82f6 |
| harden_off | Indigo | #6366f1 |
| graduation | Purple | #a855f7 |
| maintenance | Gray | #6b7280 |
| purchase | Pink | #ec4899 |
| other | Slate | #64748b |

### Status Visual Treatment

| Status | Visual |
|--------|--------|
| scheduled | Normal opacity |
| pending | Bold, slight highlight |
| completed | Reduced opacity, strikethrough |
| cancelled | Grayed out, strikethrough |
| skipped | Italic, reduced opacity |
