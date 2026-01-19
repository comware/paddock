# User Stories: Paddock Propagation Module

**Source PRD:** propagation-module-prd.md
**Domain Models:** propagation-domain-models.md
**Created:** January 2026
**Sprint Target:** MVP Sprint 1-3

---

## Epic Overview

**Epic:** Propagation Tracking System
**Goal:** Enable small farm operators to track plant propagation activities, understand success rates, calculate costs, and build institutional knowledge about techniques that work.
**Success Metric:** Users can enter a batch in under 60 seconds, track through lifecycle, and view success rates by species/method/mother plant.

---

## Stories

### Dashboard & Overview

---

### PROP-001: View Propagation Dashboard Summary

**As a** Market Gardener
**I want** to see an at-a-glance summary of my propagation activities
**So that** I know what needs attention without navigating through multiple screens

**Priority:** P0
**Story Points:** 3 (M)
**Dependencies:** None

#### Acceptance Criteria
- [ ] Given I open the propagation module, when the dashboard loads, then I see a count of active batches by stage
- [ ] Given there are propagules in progress, when I view the dashboard, then I see the total propagule count across all active batches
- [ ] Given I have completed batches, when I view the dashboard, then I see my overall success rate for the last 30/90/365 days (selectable)
- [ ] Given I have batches ready to graduate, when I view the dashboard, then I see a "Ready to Graduate" count badge

#### Edge Cases
- Zero active batches: Display "No active batches" message with "Create First Batch" CTA
- No historical data: Success rate shows "No data yet" instead of 0%

#### Technical Notes
- Use `calculateSuccessRate()` utility from domain models
- Success rate calculation: graduated / (graduated + failed) * 100

---

### PROP-002: View Propagation Station Status

**As a** Market Gardener
**I want** to see the occupancy status of all my propagation stations
**So that** I can quickly identify available capacity and plan new batches

**Priority:** P0
**Story Points:** 2 (S)
**Dependencies:** PROP-010 (Station Management)

#### Acceptance Criteria
- [ ] Given I have propagation stations configured, when I view the dashboard, then I see each station with a visual capacity bar (used/total)
- [ ] Given a station is over 80% capacity, when I view the dashboard, then the capacity bar displays in amber/warning color
- [ ] Given a station is at 100% capacity, when I view the dashboard, then the capacity bar displays in red
- [ ] Given I click on a station card, when the click is processed, then I navigate to that station's detail view

#### Edge Cases
- No stations configured: Display "Add your first station" CTA
- Station at 0% capacity: Show empty state with encouragement to add batches

---

### PROP-003: View Items Needing Attention

**As a** Market Gardener
**I want** to see batches that need my attention (overdue, ready to advance)
**So that** I do not miss critical timing windows for my propagation activities

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-001, PROP-030 (Species Configuration)

#### Acceptance Criteria
- [ ] Given a batch has exceeded the typical rooting days for its species, when I view the dashboard, then it appears in the "Needing Attention" list with "Overdue" indicator
- [ ] Given a batch is in "Ready" stage for more than 7 days, when I view the dashboard, then it appears in the list with "Graduate soon" suggestion
- [ ] Given a batch in "Rooted" stage, when I view the dashboard, then it appears with "Ready to pot up" action suggestion
- [ ] Given I click on an attention item, when the click is processed, then I navigate to that batch's detail view

#### Edge Cases
- No items needing attention: Display positive message "All caught up!"
- More than 10 items: Show first 10 with "View all" link

---

### Batch Management

---

### PROP-004: Create New Propagation Batch

**As a** Market Gardener
**I want** to quickly record a new batch of cuttings/divisions
**So that** I can track them through the propagation lifecycle without interrupting my workflow

**Priority:** P0
**Story Points:** 5 (L)
**Dependencies:** PROP-010 (Stations exist)

#### Acceptance Criteria
- [ ] Given I am on the batch list or dashboard, when I click "New Batch", then a batch creation form opens
- [ ] Given I am creating a batch, when I enter species name, then I can select from existing species or add a new one
- [ ] Given I am creating a batch, when I select a propagation method, then I see all 12 method options categorized by type
- [ ] Given I am creating a batch, when I submit with required fields (species, method, quantity, station), then the batch is created with auto-generated batch number (YYYY-NNN format)
- [ ] Given I am creating a batch, when I do not specify a date, then the date defaults to today
- [ ] Given I created a batch, when I view the batch list, then the new batch appears at the top sorted by date

#### Edge Cases
- No stations exist: Prompt user to create a station first
- Duplicate batch number: System handles by incrementing sequence

#### Technical Notes
- Use `generateBatchNumber()` utility
- Initial stage is always "taken"
- `quantitySurviving` initially equals `quantityStarted`

#### Open Questions
- [ ] Should we support draft/unsaved batches for offline use?

---

### PROP-005: View Batch List with Filtering

**As a** Market Gardener
**I want** to view all my batches and filter by stage, species, or station
**So that** I can find specific batches quickly and manage my workload

**Priority:** P0
**Story Points:** 3 (M)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I navigate to the batch list, when it loads, then I see all batches with stage indicators and days-in-stage
- [ ] Given I am viewing the batch list, when I click a stage tab (Rooting, Rooted, etc.), then only batches in that stage are shown
- [ ] Given I am viewing the batch list, when I select a species filter, then only batches of that species are shown
- [ ] Given I am viewing the batch list, when I search by batch number, then matching batches are shown
- [ ] Given I am viewing the batch list, when I click a batch card, then I navigate to the batch detail view

#### Edge Cases
- No batches match filter: Display "No batches found" with suggestion to clear filters
- Large number of batches (100+): Implement pagination (20 per page)

---

### PROP-006: View Batch Detail

**As a** Tree Nursery Operator
**I want** to see complete details of a batch including history and costs
**So that** I can review progress and make informed decisions about next steps

**Priority:** P0
**Story Points:** 3 (M)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I am viewing a batch detail, when it loads, then I see species, variety, method, quantity started/surviving, and current stage
- [ ] Given I am viewing a batch detail, when it loads, then I see the stage progression timeline with dates for each completed stage
- [ ] Given I am viewing a batch detail, when costs have been assigned, then I see total cost and cost per propagule
- [ ] Given I am viewing a batch detail, when a mother plant is linked, then I see the mother plant name with link to its detail
- [ ] Given I am viewing a batch detail, when photos are attached, then I see a photo gallery

#### Edge Cases
- Batch is exploded: Show link to individual propagules list
- No costs assigned: Show "No costs tracked" with "Add Cost" CTA

---

### PROP-007: Advance Batch to Next Stage

**As a** Market Gardener
**I want** to quickly advance a batch to the next lifecycle stage
**So that** I can keep my records current without complex forms

**Priority:** P0
**Story Points:** 3 (M)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I am viewing a batch in "Rooting" stage, when I click "Advance to Rooted", then a transition modal opens
- [ ] Given I am transitioning a batch, when I enter the new surviving quantity, then the system validates it is not greater than previous quantity
- [ ] Given I am transitioning a batch, when I submit, then the batch stage updates and transition date is recorded
- [ ] Given I am transitioning a batch, when I submit, then a stage transition audit record is created
- [ ] Given I am transitioning a batch, when I optionally add notes, then the notes are saved with the transition

#### Edge Cases
- Quantity decreased: Prompt user to confirm losses
- Skipping stages: Display warning but allow with confirmation

#### Technical Notes
- Use state machine from `VALID_STAGE_TRANSITIONS`
- Create `PropStageTransition` record for audit trail

---

### PROP-008: Record Batch Failure

**As a** Market Gardener
**I want** to mark a batch as failed with a reason
**So that** I can track failure patterns and improve my techniques

**Priority:** P0
**Story Points:** 2 (S)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I am viewing a batch, when I click "Record Failure", then a failure modal opens
- [ ] Given I am recording a failure, when I do not select a failure reason, then I cannot submit (reason is required)
- [ ] Given I select a failure reason (rot, dried_out, disease, etc.), when I submit, then the batch moves to "failed" stage
- [ ] Given I record a failure, when viewing analytics, then this batch contributes to failure analysis

#### Edge Cases
- Partial failure: Use stage transition with reduced quantity instead
- Already failed batch: Failure button is hidden

---

### PROP-009: Split Batch

**As a** Market Gardener
**I want** to split a batch when some propagules root faster than others
**So that** I can track subgroups at different stages accurately

**Priority:** P1
**Story Points:** 5 (L)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I am viewing an active batch, when I click "Split Batch", then a split modal opens
- [ ] Given I am splitting a batch, when I specify a quantity to split off, then the quantity is validated against surviving count
- [ ] Given I split a batch, when I submit, then a new batch is created with the split quantity and same source metadata
- [ ] Given I split a batch, when I submit, then the original batch's surviving quantity is reduced
- [ ] Given I split a batch, when I submit, then both batches share the same mother plant and method but can have different stations

#### Edge Cases
- Splitting entire batch: Block with error "Cannot split all - use move station instead"
- Split to 0: Block with validation error

#### Technical Notes
- New batch gets next sequential batch number
- New batch inherits preparation notes, rooting medium, hormone used

---

### PROP-010: Explode Batch to Individual Propagules

**As a** Tree Nursery Operator
**I want** to convert a batch into individual propagule records
**So that** I can track high-value plants individually after initial batch rooting

**Priority:** P1
**Story Points:** 5 (L)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I am viewing a batch with surviving count > 0, when I click "Explode to Individuals", then a confirmation modal opens showing the count of individuals to be created
- [ ] Given I confirm explosion, when the operation completes, then N individual propagule records are created (N = quantitySurviving)
- [ ] Given explosion is complete, when I view the batch, then it shows "isExploded: true" with link to the individual propagules
- [ ] Given I have exploded a batch, when I try to perform batch-level stage transitions, then I am warned to manage individuals instead
- [ ] Given individuals are created, when I view them, then each has a unique propaguleNumber (YYYY-NNN-01, YYYY-NNN-02, etc.)

#### Edge Cases
- Batch already exploded: Explosion button is hidden
- Very large batch (50+): Show performance warning

#### Technical Notes
- Use `generatePropaguleNumber()` for each individual
- Mark batch `isExploded = true`
- Individuals inherit stage from batch at time of explosion

---

### Individual Propagule Tracking

---

### PROP-011: View Individual Propagule Detail

**As a** Tree Nursery Operator
**I want** to view detailed information about a single propagule
**So that** I can track its progress and document its history for high-value plants

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-010

#### Acceptance Criteria
- [ ] Given I navigate to a propagule detail, when it loads, then I see its unique number, species, method, and current stage
- [ ] Given I am viewing a propagule, when it has a custom label, then the label is prominently displayed
- [ ] Given I am viewing a propagule, when health scores have been recorded, then I see the current health score (1-5)
- [ ] Given I am viewing a propagule, when I scroll down, then I see the complete stage transition history
- [ ] Given I am viewing a grafted propagule, when scion/rootstock info exists, then I see both source details

#### Edge Cases
- Propagule from non-exploded batch: Should not be directly accessible
- No photos: Show "Add first photo" CTA

---

### PROP-012: Update Individual Propagule Status

**As a** Tree Nursery Operator
**I want** to quickly update a propagule's health, measurements, and notes
**So that** I can build a detailed history for valuable specimens

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-011

#### Acceptance Criteria
- [ ] Given I am viewing a propagule, when I click "Quick Update", then an update form opens
- [ ] Given I am updating a propagule, when I change the health score, then the new score is saved with timestamp
- [ ] Given I am updating a propagule, when I enter measurements (height, stem diameter, leaf count), then they are saved
- [ ] Given I am updating a propagule, when I add a photo, then it is added to the propagule's photo gallery
- [ ] Given I am updating a propagule, when I advance its stage, then an individual stage transition record is created

#### Edge Cases
- Health score decreases: No special handling (allow tracking decline)
- Very long notes: Limit to 2000 characters

---

### PROP-013: Add Custom Label to Propagule

**As a** Tree Nursery Operator
**I want** to add a custom label to an individual propagule
**So that** I can identify specific specimens by meaningful names

**Priority:** P2
**Story Points:** 1 (XS)
**Dependencies:** PROP-011

#### Acceptance Criteria
- [ ] Given I am viewing a propagule, when I click "Add Label", then a label input field appears
- [ ] Given I enter a label (e.g., "Pink Lady Graft #3"), when I save, then the label is stored and displayed prominently
- [ ] Given a propagule has a label, when I view lists, then the label shows alongside the propagule number

#### Edge Cases
- Duplicate labels: Allow (labels are not unique identifiers)
- Empty label: Treat as removal of existing label

---

### Mother Plant Registry

---

### PROP-014: Register Mother Plant

**As a** Market Gardener
**I want** to register stock plants that I propagate from
**So that** I can track which plants are most productive sources

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** None

#### Acceptance Criteria
- [ ] Given I navigate to Mother Plants, when I click "Register Plant", then a registration form opens
- [ ] Given I am registering a mother plant, when I enter species and label, then the plant is created with "active" status
- [ ] Given I am registering a mother plant, when I select acquisition method (purchased, propagated, gifted, wild_collected), then it is recorded
- [ ] Given I am registering a mother plant, when I optionally add location and photo, then they are saved
- [ ] Given I have registered a mother plant, when I create a batch, then I can link the batch to this mother plant

#### Edge Cases
- No site selected: Use platform's current site context
- Duplicate species/label combo: Allow (differentiate by ID)

---

### PROP-015: View Mother Plant List

**As a** Market Gardener
**I want** to see all my mother plants with their productivity metrics
**So that** I can identify which plants to prioritize for propagation

**Priority:** P1
**Story Points:** 2 (S)
**Dependencies:** PROP-014

#### Acceptance Criteria
- [ ] Given I navigate to Mother Plants, when the list loads, then I see all plants with species, label, and status
- [ ] Given a mother plant has batches, when I view the list, then I see its total propagule count and success rate
- [ ] Given I am viewing the list, when I filter by status (active/retired), then only matching plants are shown
- [ ] Given I am viewing the list, when I click a plant card, then I navigate to its detail view

#### Edge Cases
- No mother plants: Display "Register your first mother plant" CTA
- Mother plant with zero batches: Show "No propagations yet"

---

### PROP-016: View Mother Plant Detail and Metrics

**As a** Market Gardener
**I want** to see detailed productivity metrics for a specific mother plant
**So that** I can make data-driven decisions about propagation sources

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-014

#### Acceptance Criteria
- [ ] Given I view a mother plant detail, when it loads, then I see total batches taken, total propagules produced, and overall success rate
- [ ] Given the plant has been used with multiple methods, when I view metrics, then I see success rate by propagation method
- [ ] Given the plant has batches across seasons, when I view metrics, then I see which season performed best
- [ ] Given the plant has recent batches, when I scroll down, then I see a list of recent batches from this plant

#### Edge Cases
- Single batch only: Show metrics but note "Limited data"
- All batches failed: Show 0% success rate with encouragement to try different method

#### Technical Notes
- Use `calculateMotherPlantMetrics()` from domain models

---

### PROP-017: Record Mother Plant Health Check

**As a** Market Gardener
**I want** to record periodic health assessments of my mother plants
**So that** I can correlate plant health with propagation success

**Priority:** P2
**Story Points:** 2 (S)
**Dependencies:** PROP-014

#### Acceptance Criteria
- [ ] Given I view a mother plant, when I click "Health Check", then a health assessment form opens
- [ ] Given I am recording health, when I select a score (1-5), then the score is required
- [ ] Given I save a health check, when I view the plant detail, then I see current health score and last check date
- [ ] Given I have multiple health checks, when I view history, then I see the health trend over time

#### Edge Cases
- First health check: No previous data to compare
- Very old last check (30+ days): Prompt for new assessment

---

### PROP-018: Retire or Mark Mother Plant Deceased

**As a** Market Gardener
**I want** to mark a mother plant as retired or deceased
**So that** it no longer appears in active lists but history is preserved

**Priority:** P2
**Story Points:** 1 (XS)
**Dependencies:** PROP-014

#### Acceptance Criteria
- [ ] Given I view an active mother plant, when I click "Retire", then status changes to "retired"
- [ ] Given I view a mother plant, when I click "Mark Deceased", then status changes to "deceased"
- [ ] Given a plant is retired/deceased, when I create a new batch, then it does not appear in mother plant dropdown
- [ ] Given a plant is retired/deceased, when I view its detail, then all historical batches remain visible

#### Edge Cases
- Reactivate retired plant: Allow status change back to "active"
- Deceased plant reactivation: Block with explanation

---

### Propagation Stations

---

### PROP-019: Create Propagation Station

**As a** Market Gardener
**I want** to define my propagation stations with capacity and environmental targets
**So that** I can track what is in each location

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** None

#### Acceptance Criteria
- [ ] Given I navigate to Stations, when I click "Add Station", then a station form opens
- [ ] Given I am creating a station, when I enter name, type, and capacity, then the station is created
- [ ] Given I select a station type (heated_propagator, water_propagation, etc.), when I save, then defaults for that type are suggested
- [ ] Given I optionally enter temperature/humidity targets, when I save, then they are stored for monitoring
- [ ] Given I create a station, when I return to the list, then the new station appears

#### Edge Cases
- Zero capacity: Block with validation error
- Duplicate station name: Allow (warn but permit)

---

### PROP-020: View Station Occupancy

**As a** Market Gardener
**I want** to see what batches are currently in each station
**So that** I can manage space and plan new propagation activities

**Priority:** P1
**Story Points:** 2 (S)
**Dependencies:** PROP-019, PROP-004

#### Acceptance Criteria
- [ ] Given I view a station detail, when it loads, then I see current occupancy (used slots / total capacity)
- [ ] Given a station has batches, when I view it, then I see a list of active batches in that station
- [ ] Given I am viewing station occupancy, when I click a batch, then I navigate to that batch's detail
- [ ] Given station is over capacity, when I view it, then I see a warning indicator

#### Edge Cases
- Empty station: Display "No batches in this station" with encouragement
- All batches graduated: Show as empty (only count active stages)

#### Technical Notes
- Use `calculateStationOccupancy()` from domain models

---

### PROP-021: Move Batch Between Stations

**As a** Market Gardener
**I want** to move a batch from one station to another
**So that** I can manage space as propagules progress through lifecycle

**Priority:** P1
**Story Points:** 2 (S)
**Dependencies:** PROP-019, PROP-004

#### Acceptance Criteria
- [ ] Given I am viewing a batch, when I click "Move Station", then a station selector opens
- [ ] Given I select a new station, when I confirm, then the batch's stationId is updated
- [ ] Given I move a batch, when I view the source station, then its occupancy decreases
- [ ] Given I move a batch, when I view the destination station, then its occupancy increases

#### Edge Cases
- Destination at capacity: Allow with warning
- Moving to inactive station: Block with explanation

---

### PROP-022: Deactivate Station Seasonally

**As a** Hobby Propagator
**I want** to mark stations as inactive during off-season
**So that** they do not clutter my active workspace

**Priority:** P2
**Story Points:** 1 (XS)
**Dependencies:** PROP-019

#### Acceptance Criteria
- [ ] Given I view a station, when I click "Deactivate", then status changes to inactive
- [ ] Given a station is inactive, when I try to move batches to it, then I am blocked with explanation
- [ ] Given a station is inactive, when I view the dashboard, then it appears grayed out
- [ ] Given a station is inactive, when I click "Activate", then it becomes active again

#### Edge Cases
- Deactivating station with active batches: Require moving batches first or force-allow with warning

---

### PROP-023: Log Station Environmental Conditions

**As a** Market Gardener
**I want** to manually log temperature and humidity readings for my stations
**So that** I can correlate environmental conditions with propagation success

**Priority:** P2
**Story Points:** 2 (S)
**Dependencies:** PROP-019

#### Acceptance Criteria
- [ ] Given I view a station, when I click "Log Conditions", then an environmental log form opens
- [ ] Given I enter temperature and/or humidity, when I save, then a timestamped log entry is created
- [ ] Given I have multiple log entries, when I view station detail, then I see a simple chart of conditions over time
- [ ] Given conditions exceed targets, when I view the station, then I see an alert indicator

#### Edge Cases
- Only temperature entered: Allow (humidity optional)
- Very old last reading (7+ days): Prompt for new reading

---

### Cost & Supplies Tracking

---

### PROP-024: Add Supply to Inventory

**As a** Market Gardener
**I want** to track my propagation supplies and their costs
**So that** I can accurately calculate cost per propagule

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** None

#### Acceptance Criteria
- [ ] Given I navigate to Supplies, when I click "Add Purchase", then a supply form opens
- [ ] Given I am adding a supply, when I enter name, category, quantity, and total cost, then cost per unit is automatically calculated
- [ ] Given I save a supply, when I view the inventory, then the supply appears with remaining quantity equal to purchased quantity
- [ ] Given I optionally set a low stock threshold, when remaining drops below it, then an alert appears on dashboard

#### Edge Cases
- Zero cost (free supplies): Allow $0 cost
- Restocking existing supply: Create new supply entry (track as separate purchase)

---

### PROP-025: View Supplies Inventory

**As a** Market Gardener
**I want** to see all my supplies with stock levels
**So that** I know when to reorder

**Priority:** P1
**Story Points:** 2 (S)
**Dependencies:** PROP-024

#### Acceptance Criteria
- [ ] Given I navigate to Supplies, when it loads, then I see all supplies grouped by category
- [ ] Given a supply is below its low stock threshold, when I view the list, then it appears in a "Low Stock Alerts" section
- [ ] Given I view a supply, when I click it, then I see purchase details and usage history
- [ ] Given I am viewing supplies, when I filter by category, then only matching supplies are shown

#### Edge Cases
- No supplies: Display "Track your first supply" CTA
- All supplies low: Prominent alert at top of page

---

### PROP-026: Assign Costs to Batch

**As a** Market Gardener
**I want** to record what supplies I used for a batch
**So that** I can calculate accurate cost per propagule

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-024, PROP-004

#### Acceptance Criteria
- [ ] Given I view a batch detail, when I click "Add Cost", then a cost assignment form opens
- [ ] Given I am adding a supply cost, when I select a supply and enter quantity used, then cost is auto-calculated from supply's cost per unit
- [ ] Given I am adding a cost, when I choose "Manual Entry" instead, then I can enter a custom amount with description
- [ ] Given I assign a cost, when I save, then the supply's remaining quantity decreases by amount used
- [ ] Given I have assigned costs, when I view batch detail, then I see total cost and cost per propagule

#### Edge Cases
- Usage exceeds remaining supply: Block with error showing remaining amount
- Multiple costs from same supply: Allow (accumulate usage)

---

### PROP-027: View Cost Breakdown and Analysis

**As a** Market Gardener
**I want** to see detailed cost breakdowns by category
**So that** I understand where my money is going

**Priority:** P2
**Story Points:** 2 (S)
**Dependencies:** PROP-026

#### Acceptance Criteria
- [ ] Given I view a batch detail, when I scroll to costs section, then I see breakdown by category (hormone, medium, containers, etc.)
- [ ] Given I view a batch cost summary, when there are costs, then I see percentage breakdown
- [ ] Given I view a batch that has graduated, when I check costs, then I see cost per successful propagule (total / graduated)
- [ ] Given I view analytics, when I select cost analysis, then I see average cost per propagule by species

#### Edge Cases
- No costs assigned: Show $0.00 totals
- All propagules failed: Cost per successful shows "N/A"

#### Technical Notes
- Use `calculateBatchCostSummary()` from domain models

---

### Lifecycle Stage Transitions

---

### PROP-028: Configure Stage Timing Expectations

**As a** Market Gardener
**I want** to set expected timing for each species' propagation stages
**So that** I get alerts when batches are overdue

**Priority:** P2
**Story Points:** 2 (S)
**Dependencies:** None

#### Acceptance Criteria
- [ ] Given I navigate to Settings, when I select Species Configuration, then I see list of configured species
- [ ] Given I add a species config, when I enter typical rooting days and max days, then thresholds are saved
- [ ] Given I have species config, when a batch exceeds max rooting days, then it appears as "overdue" in dashboard
- [ ] Given I have species config, when I create a batch of that species, then expected timing is shown

#### Edge Cases
- Species not configured: No overdue warnings (use generic defaults)
- Very long rooting species (60+ days): Validate reasonable maximum

---

### PROP-029: View Stage-Based Batch Views

**As a** Market Gardener
**I want** to see all batches in a specific stage
**So that** I can process them in bulk (e.g., pot up all rooted batches)

**Priority:** P1
**Story Points:** 2 (S)
**Dependencies:** PROP-005

#### Acceptance Criteria
- [ ] Given I am on the batch list, when I click a stage tab, then I see count badge showing batches in that stage
- [ ] Given I select "Rooted" stage tab, when the list filters, then I see all batches ready for potting up
- [ ] Given I am in stage-filtered view, when I select multiple batches, then I can perform bulk stage advance
- [ ] Given I am in stage-filtered view, when I view "Days in Stage" column, then batches are sorted by longest first (most urgent)

#### Edge Cases
- Stage has zero batches: Show empty state with stage-specific guidance
- Bulk advance with different species: Allow (they can advance at different rates)

---

### Graduation & Outcomes

---

### PROP-030: Graduate Batch (Full)

**As a** Market Gardener
**I want** to record when all surviving propagules have been sold/planted/gifted
**So that** I can mark the batch as complete and track outcomes

**Priority:** P0
**Story Points:** 3 (M)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I view a batch in "Ready" stage, when I click "Graduate All", then a graduation form opens
- [ ] Given I am graduating, when I select an outcome (sold, gifted, planted_garden, personal_use), then it is required
- [ ] Given I select "gifted" outcome, when I submit, then recipient name is required
- [ ] Given I graduate all propagules, when I submit, then batch stage changes to "graduated"
- [ ] Given I graduate a batch, when I view analytics, then these propagules count toward success rate

#### Edge Cases
- Mixed outcomes: Need to use partial graduation instead
- Already graduated batch: Graduation buttons hidden

---

### PROP-031: Graduate Batch (Partial)

**As a** Market Gardener
**I want** to graduate some propagules while keeping others in progress
**So that** I can track sales/gifts as they happen

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-030

#### Acceptance Criteria
- [ ] Given I view a ready batch, when I click "Graduate Some", then a partial graduation form opens
- [ ] Given I am doing partial graduation, when I enter quantity, then it is validated against remaining ungraduated count
- [ ] Given I graduate 5 of 10, when I submit, then 5 are recorded as graduated and 5 remain "ready"
- [ ] Given I do multiple partial graduations, when I view batch history, then each graduation is recorded separately
- [ ] Given all are eventually graduated, when the last one completes, then batch auto-transitions to "graduated" stage

#### Edge Cases
- Graduating more than available: Block with validation error showing available count
- Different outcomes in same graduation: Need separate graduation entries

---

### PROP-032: Record Gift Recipient

**As a** Hobby Propagator
**I want** to record who I gave plants to
**So that** I can remember who received what

**Priority:** P2
**Story Points:** 1 (XS)
**Dependencies:** PROP-030

#### Acceptance Criteria
- [ ] Given I am graduating with "gifted" outcome, when I enter recipient name, then it is saved
- [ ] Given I optionally enter contact info, when I save, then it is stored for future reference
- [ ] Given I have gift graduations, when I view analytics, then I can see gift recipient history

#### Edge Cases
- Anonymous gift: Allow blank recipient with "Anonymous" placeholder
- Same recipient multiple times: Track each gift separately

---

### PROP-033: View Graduation History

**As a** Market Gardener
**I want** to see where all my graduated propagules went
**So that** I can track outcomes and plan future production

**Priority:** P2
**Story Points:** 2 (S)
**Dependencies:** PROP-030

#### Acceptance Criteria
- [ ] Given I navigate to Analytics, when I select Outcomes, then I see pie chart of outcomes (sold/gifted/planted/personal)
- [ ] Given I have graduation history, when I filter by date range, then I see outcomes for that period
- [ ] Given I have gift graduations, when I view recipient list, then I see who received what and when
- [ ] Given I have sold graduations, when Sales module exists, then I see link to sale records

#### Edge Cases
- No graduations yet: Display "No plants graduated yet" with encouragement
- All composted (failed): Show 100% composted with failure analysis link

---

### Analytics & Reporting

---

### PROP-034: View Success Rate Analytics

**As a** Market Gardener
**I want** to see success rates broken down by species, method, and mother plant
**So that** I can identify what works best

**Priority:** P1
**Story Points:** 5 (L)
**Dependencies:** PROP-004, PROP-014

#### Acceptance Criteria
- [ ] Given I navigate to Analytics, when I view Success Rates, then I see overall success rate for selected period
- [ ] Given I am viewing success rates, when I select "By Species", then I see success rate bar chart per species
- [ ] Given I am viewing success rates, when I select "By Method", then I see success rate per propagation method
- [ ] Given I am viewing success rates, when I select "By Mother Plant", then I see which plants produce best results
- [ ] Given I am viewing success rates, when I change period (30/90/365 days), then data recalculates

#### Edge Cases
- Insufficient data: Show "Not enough data" with minimum threshold explanation
- Species with only in-progress batches: Show "In Progress" instead of 0%

#### Technical Notes
- Use `calculateSuccessRate()` with filters from domain models

---

### PROP-035: View Failure Analysis

**As a** Market Gardener
**I want** to understand where and why my propagations fail
**So that** I can improve my techniques

**Priority:** P2
**Story Points:** 3 (M)
**Dependencies:** PROP-008

#### Acceptance Criteria
- [ ] Given I navigate to Analytics, when I select Failure Analysis, then I see chart showing which stage failures occur at
- [ ] Given I have recorded failure reasons, when I view analysis, then I see breakdown by reason (rot, dried_out, etc.)
- [ ] Given I have failure data, when I view by species, then I see which species have highest failure rates
- [ ] Given a specific failure pattern (e.g., rot in rooting), when I click it, then I see the affected batches

#### Edge Cases
- No failures: Display positive message "100% success so far!"
- All failures at same stage: Highlight as potential systemic issue

---

### PROP-036: Generate Production Report

**As a** Market Gardener
**I want** to generate a summary report of my propagation production
**So that** I can plan for markets and track progress over time

**Priority:** P2
**Story Points:** 3 (M)
**Dependencies:** PROP-034

#### Acceptance Criteria
- [ ] Given I navigate to Analytics, when I click "Generate Report", then a report configuration dialog opens
- [ ] Given I configure a report, when I select period and metrics, then a summary report is generated
- [ ] Given a report is generated, when I view it, then I see: total started, graduated, success rate, costs, and outcomes
- [ ] Given a report is generated, when I click "Export", then I can download as PDF or CSV

#### Edge Cases
- Period with no activity: Generate empty report with "No activity" note
- Very large period (5+ years): Warn about potentially large report

---

### Data Management

---

### PROP-037: Export Propagation Data

**As a** Market Gardener
**I want** to export my propagation data as JSON or CSV
**So that** I have a backup and can analyze in external tools

**Priority:** P1
**Story Points:** 2 (S)
**Dependencies:** PROP-004

#### Acceptance Criteria
- [ ] Given I navigate to Settings, when I click "Export Data", then I see export options
- [ ] Given I select "Export All (JSON)", when I click download, then a complete JSON backup of all propagation data is downloaded
- [ ] Given I select "Export Batches (CSV)", when I click download, then a CSV file with batch records is downloaded
- [ ] Given I export data, when I view the file, then all fields are included with appropriate formatting

#### Edge Cases
- No data to export: Download empty structure with headers
- Very large dataset (1000+ batches): Show progress indicator

---

### PROP-038: Import Propagation Data

**As a** Market Gardener
**I want** to import previously exported data
**So that** I can restore from backup or migrate from another system

**Priority:** P1
**Story Points:** 3 (M)
**Dependencies:** PROP-037

#### Acceptance Criteria
- [ ] Given I navigate to Settings, when I click "Import Data", then a file upload dialog opens
- [ ] Given I upload a valid JSON backup, when I click import, then data is validated before import
- [ ] Given data is valid, when import proceeds, then records are created without duplicating existing data
- [ ] Given import completes, when I view my data, then imported records are present

#### Edge Cases
- Invalid JSON: Show validation errors with line numbers
- Duplicate batch numbers: Skip or append suffix based on user choice
- Partial import failure: Rollback and report what failed

---

### PROP-039: Clear All Propagation Data

**As a** Hobby Propagator
**I want** to clear all propagation data and start fresh
**So that** I can reset after testing or start a new season cleanly

**Priority:** P2
**Story Points:** 1 (XS)
**Dependencies:** None

#### Acceptance Criteria
- [ ] Given I navigate to Settings, when I click "Clear All Data", then a confirmation dialog appears
- [ ] Given I am confirming data clear, when I type "DELETE" to confirm, then all propagation data is removed
- [ ] Given data is cleared, when I view any propagation screen, then it shows empty state
- [ ] Given data is cleared, when I check supplies and stations, then those are also cleared

#### Edge Cases
- Accidental clear: Multi-step confirmation prevents accidents
- Partial clear option: Not supported in MVP (all or nothing)

---

### PROP-040: View Activity History

**As a** Market Gardener
**I want** to see a chronological log of all propagation activities
**So that** I can review what I did and when

**Priority:** P2
**Story Points:** 2 (S)
**Dependencies:** PROP-004, PROP-007

#### Acceptance Criteria
- [ ] Given I navigate to Activity, when it loads, then I see recent activities (batch created, stage advanced, graduated, etc.)
- [ ] Given I am viewing activity, when I filter by date range, then only activities in that range show
- [ ] Given I am viewing activity, when I filter by type (batches, graduations), then only those activities show
- [ ] Given I click an activity entry, when clicked, then I navigate to the relevant entity (batch, propagule)

#### Edge Cases
- No activity: Show "No activity recorded yet"
- Very old activity (1+ year): Still accessible but paginated

---

## Story Map

```
                    PROPAGATION MODULE - STORY MAP

User Journey:    Setup         Create Batch    Track Progress    Graduate        Analyze
                --------      -------------   ---------------   ----------      ---------

MVP Release 1    PROP-019      PROP-004        PROP-005          PROP-030        PROP-001
(Core)           (Station)     (Create)        (List)            (Graduate)      (Dashboard)
                 PROP-014      PROP-006        PROP-007          PROP-031        PROP-002
                 (Mother)      (Detail)        (Advance)         (Partial)       (Stations)
                                               PROP-008                          PROP-034
                                               (Failure)                         (Success)

MVP Release 2    PROP-024      PROP-009        PROP-010          PROP-032        PROP-003
(Enhanced)       (Supplies)    (Split)         (Explode)         (Gift)          (Attention)
                 PROP-025      PROP-026        PROP-011          PROP-033        PROP-035
                 (Inventory)   (Costs)         (Individual)      (History)       (Failure)
                 PROP-020      PROP-027        PROP-012                          PROP-029
                 (Occupancy)   (Breakdown)     (Update)                          (Stage View)

MVP Release 3    PROP-021      PROP-028        PROP-023          PROP-037        PROP-036
(Polish)         (Move)        (Config)        (Env Log)         (Export)        (Report)
                 PROP-022      PROP-013        PROP-017          PROP-038
                 (Deactivate)  (Label)         (Health)          (Import)
                 PROP-018                      PROP-040          PROP-039
                 (Retire)                      (Activity)        (Clear)
                 PROP-015
                 (List)
                 PROP-016
                 (Metrics)
```

---

## Summary

| Priority | Count | Points |
|----------|-------|--------|
| P0 | 9 | 27 |
| P1 | 19 | 53 |
| P2 | 12 | 22 |
| **Total** | **40** | **102** |

### P0 Stories (Must Have for MVP)
- PROP-001: Dashboard Summary
- PROP-002: Station Status
- PROP-004: Create Batch
- PROP-005: Batch List
- PROP-006: Batch Detail
- PROP-007: Advance Stage
- PROP-008: Record Failure
- PROP-030: Graduate Full
- PROP-034: Success Rate Analytics

### P1 Stories (Should Have)
- PROP-003, PROP-009, PROP-010, PROP-011, PROP-012, PROP-014, PROP-015, PROP-016, PROP-019, PROP-020, PROP-021, PROP-024, PROP-025, PROP-026, PROP-029, PROP-031, PROP-037, PROP-038

### P2 Stories (Nice to Have)
- PROP-013, PROP-017, PROP-018, PROP-022, PROP-023, PROP-027, PROP-028, PROP-032, PROP-033, PROP-035, PROP-036, PROP-039, PROP-040

---

## Appendix

### Persona Reference

**Market Gardener (Alex)** - Primary
- Scale: 50-200 propagations/month
- Focus: Batch workflows, quick entry, market planning
- Pain points: Loses track of batches, unknown costs, forgotten techniques

**Tree Nursery Operator (Morgan)** - Secondary
- Scale: 20-50 high-value propagations/month
- Focus: Individual tracking, detailed lineage, long lifecycles
- Pain points: High per-unit investment, need individual failure tracking

**Hobby Propagator (Sam)** - Tertiary
- Scale: 5-30 propagations/month
- Focus: Simple tracking, success rates, gift tracking
- Pain points: Forgets what is where, no idea which plants propagate easily

### Glossary

| Term | Definition |
|------|------------|
| **Batch** | A cohort of propagules taken at the same time using the same method |
| **Propagule** | A single plant unit being propagated (cutting, division, etc.) |
| **Mother Plant** | The stock plant from which propagation material is harvested |
| **Station** | A physical location where propagules root and develop |
| **Stage** | A lifecycle phase (taken, rooting, rooted, potted_up, hardening, ready, graduated, failed) |
| **Graduation** | The final disposition of a propagule (sold, gifted, planted, etc.) |
| **Explode** | Converting a batch into individual propagule records for detailed tracking |
| **Success Rate** | graduated / (graduated + failed) * 100 |

### Stage Definitions

| Stage | Description | Typical Duration |
|-------|-------------|------------------|
| taken | Material harvested and prepared | Immediate |
| rooting | In propagation medium awaiting roots | 7-42 days |
| rooted | Roots visible and developed | 0-7 days |
| potted_up | Moved to individual container | 14-30 days |
| hardening | Acclimatizing to final conditions | 7-14 days |
| ready | Available for use/sale | Until disposed |
| graduated | Moved to final destination | Terminal |
| failed | Did not survive | Terminal |

---

*End of User Stories Document*
