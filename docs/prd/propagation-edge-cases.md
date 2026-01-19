# Propagation Module - Edge Cases & Failure Modes

**Document Version**: 1.0
**Date**: January 2026
**Status**: Ready for QA

This document provides a comprehensive edge case matrix for the Paddock Propagation module, designed for QA test planning and developer reference.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Batch Management Edge Cases](#2-batch-management-edge-cases)
3. [Stage Transition Edge Cases](#3-stage-transition-edge-cases)
4. [Mother Plant Edge Cases](#4-mother-plant-edge-cases)
5. [Station Management Edge Cases](#5-station-management-edge-cases)
6. [Cost Tracking Edge Cases](#6-cost-tracking-edge-cases)
7. [Graduation Edge Cases](#7-graduation-edge-cases)
8. [Data Integrity Edge Cases](#8-data-integrity-edge-cases)
9. [Timing Edge Cases](#9-timing-edge-cases)
10. [Test Checklist](#10-test-checklist)
11. [Error Message Reference](#11-error-message-reference)

---

## 1. Executive Summary

### Edge Case Counts by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Batch Management | 3 | 5 | 3 | 1 | 12 |
| Stage Transitions | 4 | 4 | 2 | 1 | 11 |
| Mother Plants | 2 | 3 | 2 | 1 | 8 |
| Stations | 2 | 4 | 2 | 1 | 9 |
| Cost Tracking | 3 | 4 | 2 | 1 | 10 |
| Graduation | 3 | 3 | 2 | 1 | 9 |
| Data Integrity | 3 | 1 | 1 | 0 | 5 |
| Timing | 1 | 1 | 1 | 0 | 3 |
| **TOTAL** | **21** | **25** | **15** | **6** | **67** |

### Priority Definitions

- **Critical**: Must handle before launch. System will fail or lose data.
- **High**: Should handle before launch. Poor UX or incorrect calculations.
- **Medium**: Handle in v1.1. Edge scenarios with workarounds.
- **Low**: Nice to have. Rare scenarios.

---

## 2. Batch Management Edge Cases

### EC-001: Zero Quantity Batch
**Priority**: Critical
**Scenario**: User attempts to create a batch with `quantityStarted = 0`

**Expected Behavior**: Block creation with validation error

**Handling**:
```typescript
if (quantityStarted <= 0) {
  throw new ValidationError('Quantity must be at least 1');
}
```

**Test Case**:
- Given: New batch form open
- When: User enters 0 in quantity field
- Then: Form shows validation error, submit is disabled

---

### EC-002: Negative Quantity
**Priority**: Critical
**Scenario**: User enters negative quantity (via API or form manipulation)

**Expected Behavior**: Block with validation error

**Handling**:
```typescript
const quantitySchema = z.number().int().min(1, 'Quantity must be positive');
```

**Test Case**:
- Given: API endpoint for batch creation
- When: POST with `quantityStarted: -5`
- Then: 400 response with validation error

---

### EC-003: Quantity Exceeds Station Capacity
**Priority**: High
**Scenario**: Creating batch with 50 propagules but station capacity is 30

**Expected Behavior**: Allow with warning (soft limit per PRD)

**Handling**:
```typescript
if (quantity > station.capacity) {
  return {
    valid: true,
    warning: `Station capacity is ${station.capacity}. You are adding ${quantity} propagules (${quantity - station.capacity} over capacity).`
  };
}
```

**Test Case**:
- Given: Station with capacity 30
- When: User creates batch with quantity 50
- Then: Warning shown, user can confirm to proceed

---

### EC-004: Batch Without Mother Plant
**Priority**: Medium
**Scenario**: Creating batch without selecting a mother plant source

**Expected Behavior**: Allow - mother plant is optional per domain model

**Handling**: No special handling needed. `motherPlantId` is nullable.

**Test Case**:
- Given: New batch form open
- When: User leaves mother plant field empty
- Then: Batch created successfully with `motherPlantId: null`

---

### EC-005: Batch Without Station
**Priority**: Critical
**Scenario**: Creating batch without selecting a station

**Expected Behavior**: Block - station is required

**Handling**:
```typescript
if (!stationId) {
  throw new ValidationError('Station is required');
}
```

**Test Case**:
- Given: New batch form
- When: User submits without selecting station
- Then: Validation error on station field

---

### EC-006: Duplicate Batch Number
**Priority**: High
**Scenario**: Two batches created simultaneously get same batch number

**Expected Behavior**: System generates unique batch numbers

**Handling**:
```typescript
async function generateBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const maxBatch = await db.propBatches
    .where('batchNumber')
    .startsWith(`${year}-`)
    .last();

  const nextNumber = maxBatch
    ? parseInt(maxBatch.batchNumber.split('-')[1]) + 1
    : 1;

  return `${year}-${String(nextNumber).padStart(3, '0')}`;
}
```

**Test Case**:
- Given: Two browser tabs with batch form open
- When: Both submit simultaneously
- Then: Each batch gets unique number (e.g., 2026-001, 2026-002)

---

### EC-007: Double Submit Prevention
**Priority**: High
**Scenario**: User clicks submit twice rapidly

**Expected Behavior**: Only one batch created

**Handling**:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
    await createBatch(formData);
  } finally {
    setIsSubmitting(false);
  }
};
```

**Test Case**:
- Given: New batch form with valid data
- When: User double-clicks submit button
- Then: Only one batch created

---

### EC-008: Quantity Surviving > Quantity Started
**Priority**: Critical
**Scenario**: Update sets surviving count higher than started count

**Expected Behavior**: Block - violates invariant

**Handling**:
```typescript
if (quantitySurviving > quantityStarted) {
  throw new ValidationError(
    `Surviving (${quantitySurviving}) cannot exceed started (${quantityStarted})`
  );
}
```

**Test Case**:
- Given: Batch with 10 started
- When: Attempt to set surviving to 12
- Then: Validation error

---

### EC-009: Delete Batch with Graduations
**Priority**: High
**Scenario**: User tries to delete a batch that has graduation records

**Expected Behavior**: Block or cascade delete with confirmation

**Handling**:
```typescript
const graduations = await db.propGraduations
  .where('batchId')
  .equals(batchId)
  .count();

if (graduations > 0) {
  throw new ValidationError(
    `Cannot delete batch with ${graduations} graduation record(s). Archive instead?`
  );
}
```

**Test Case**:
- Given: Batch with 3 graduation records
- When: User clicks delete
- Then: Error message suggests archiving

---

### EC-010: Species/Variety with Special Characters
**Priority**: Medium
**Scenario**: Species name contains quotes, slashes, or unicode

**Expected Behavior**: Accept and store correctly

**Handling**: Proper string escaping in database layer (Dexie handles this)

**Test Case**:
- Given: New batch form
- When: Species entered as `Mentha × piperita "Chocolate"`
- Then: Stored and displayed correctly

---

### EC-011: Very Long Notes Field
**Priority**: Medium
**Scenario**: User enters 10,000+ characters in notes

**Expected Behavior**: Accept but consider truncation for display

**Handling**:
```typescript
const notesSchema = z.string().max(50000, 'Notes too long');
```

**Test Case**:
- Given: Batch edit form
- When: Paste 10KB of text into notes
- Then: Saved successfully, truncated in list view

---

### EC-012: Batch from Retired Mother Plant
**Priority**: Low
**Scenario**: Mother plant is retired after batch creation

**Expected Behavior**: Existing batches remain linked, historical data preserved

**Handling**: No cascade update. Batch keeps `motherPlantId` reference.

**Test Case**:
- Given: Active batch linked to mother plant
- When: Mother plant status changed to "retired"
- Then: Batch still shows mother plant info (grayed out)

---

## 3. Stage Transition Edge Cases

### EC-013: Invalid Stage Transition
**Priority**: Critical
**Scenario**: Attempting to go from "taken" directly to "graduated" (skipping stages)

**Expected Behavior**: Warn but allow with confirmation (per PRD flexibility)

**Handling**:
```typescript
const VALID_TRANSITIONS: Record<PropStage, PropStage[]> = {
  taken: ['rooting', 'failed'],
  rooting: ['rooted', 'failed'],
  rooted: ['potted_up', 'failed'],
  potted_up: ['hardening_off', 'ready', 'failed'],
  hardening_off: ['ready', 'failed'],
  ready: ['graduated', 'failed'],
  graduated: [], // terminal
  failed: [],    // terminal
};

function canTransition(from: PropStage, to: PropStage, allowSkip = false) {
  if (VALID_TRANSITIONS[from].includes(to)) return { valid: true };
  if (allowSkip && to !== 'graduated' && to !== 'failed') {
    return { valid: true, warning: `Skipping stages from ${from} to ${to}` };
  }
  return { valid: false, error: `Cannot transition from ${from} to ${to}` };
}
```

**Test Case**:
- Given: Batch in "taken" stage
- When: User selects "potted_up" stage
- Then: Warning shown, user confirms, transition recorded

---

### EC-014: Transition from Terminal State (Graduated)
**Priority**: Critical
**Scenario**: Attempting to change stage of graduated batch

**Expected Behavior**: Block - terminal state cannot be modified

**Handling**:
```typescript
if (currentStage === 'graduated') {
  throw new ValidationError('Cannot modify graduated batch');
}
```

**Test Case**:
- Given: Fully graduated batch
- When: API call to update stage
- Then: 400 error "Cannot modify graduated batch"

---

### EC-015: Transition from Terminal State (Failed)
**Priority**: Critical
**Scenario**: Attempting to change stage of failed batch

**Expected Behavior**: Block - failed is terminal (consider "undo" feature)

**Handling**:
```typescript
if (currentStage === 'failed') {
  throw new ValidationError(
    'Failed batches cannot be modified. Create a new batch if needed.'
  );
}
```

**Test Case**:
- Given: Failed batch
- When: Attempt to change to "rooted"
- Then: Error message displayed

---

### EC-016: Transition with Zero Survivors
**Priority**: Critical
**Scenario**: Batch has `quantitySurviving = 0` but trying to advance stage

**Expected Behavior**: Auto-transition to "failed" instead

**Handling**:
```typescript
if (quantitySurviving === 0 && targetStage !== 'failed') {
  return {
    valid: false,
    error: 'No surviving propagules. Batch should be marked as failed.',
    suggestedStage: 'failed'
  };
}
```

**Test Case**:
- Given: Batch with 0 surviving
- When: User tries to advance to "rooted"
- Then: System suggests marking as failed

---

### EC-017: Backdated Stage Transition
**Priority**: High
**Scenario**: User records transition date in the past

**Expected Behavior**: Allow backdating (useful for recording after the fact)

**Handling**: Accept past dates. Block future dates.

**Test Case**:
- Given: Stage transition form
- When: User selects date 3 days ago
- Then: Transition recorded with past date

---

### EC-018: Future-Dated Stage Transition
**Priority**: High
**Scenario**: User enters future date for transition

**Expected Behavior**: Block - cannot record future transitions

**Handling**:
```typescript
if (transitionDate > new Date()) {
  throw new ValidationError('Transition date cannot be in the future');
}
```

**Test Case**:
- Given: Stage transition form
- When: User selects tomorrow's date
- Then: Validation error

---

### EC-019: Multiple Transitions Same Day
**Priority**: Medium
**Scenario**: Batch transitions twice in one day (taken → rooting → rooted)

**Expected Behavior**: Allow - fast-tracking legitimate

**Handling**: Record separate transition records with timestamps

**Test Case**:
- Given: Batch in "taken" stage
- When: User transitions to "rooting" then "rooted" same day
- Then: Two transition records created with different timestamps

---

### EC-020: Transition Reduces Quantity
**Priority**: High
**Scenario**: User updates quantity during stage transition

**Expected Behavior**: Allow reduction, block increase

**Handling**:
```typescript
if (newQuantity > batch.quantitySurviving) {
  throw new ValidationError('Quantity cannot increase');
}
```

**Test Case**:
- Given: Batch with 10 surviving, transitioning to "rooted"
- When: User enters 8 surviving (2 lost during rooting)
- Then: Transition recorded, quantity updated to 8

---

### EC-021: Transition Without Failure Reason
**Priority**: High
**Scenario**: Marking batch as "failed" without specifying reason

**Expected Behavior**: Require failure reason for audit trail

**Handling**:
```typescript
if (targetStage === 'failed' && !failureReason) {
  throw new ValidationError('Please specify a failure reason');
}
```

**Test Case**:
- Given: Batch being marked failed
- When: User leaves reason field empty
- Then: Validation error requiring reason

---

### EC-022: Concurrent Stage Updates
**Priority**: Medium
**Scenario**: Two users update same batch stage simultaneously

**Expected Behavior**: Optimistic locking with conflict detection

**Handling**:
```typescript
// Add version field to batch
await db.propBatches.where('id').equals(id).modify((batch) => {
  if (batch.version !== expectedVersion) {
    throw new ConcurrencyError('Batch was modified by another session');
  }
  batch.stage = newStage;
  batch.version++;
});
```

**Test Case**:
- Given: Batch open in two tabs
- When: Both tabs submit stage change
- Then: Second submission fails with conflict error

---

### EC-023: Exploded Batch Stage Transition
**Priority**: Low
**Scenario**: Batch has been "exploded" into individuals, user tries batch-level transition

**Expected Behavior**: Block batch transition, require individual updates

**Handling**:
```typescript
if (batch.isExploded) {
  throw new ValidationError(
    'This batch has been exploded to individuals. Update each propagule separately.'
  );
}
```

**Test Case**:
- Given: Exploded batch
- When: User tries batch-level stage change
- Then: Error directing to individual view

---

## 4. Mother Plant Edge Cases

### EC-024: Delete Mother Plant with Active Batches
**Priority**: Critical
**Scenario**: Mother plant is source for 3 active (non-graduated) batches

**Expected Behavior**: Block hard delete, offer soft delete (retire)

**Handling**:
```typescript
const activeBatches = await db.propBatches
  .where('motherPlantId')
  .equals(motherPlantId)
  .filter(b => !['graduated', 'failed'].includes(b.stage))
  .count();

if (activeBatches > 0) {
  throw new ValidationError(
    `Cannot delete: ${activeBatches} active batch(es) reference this mother plant. Retire instead?`
  );
}
```

**Test Case**:
- Given: Mother plant with 2 active batches
- When: User clicks delete
- Then: Error with count, suggestion to retire

---

### EC-025: Retire Mother Plant Mid-Propagation
**Priority**: Critical
**Scenario**: Retiring mother plant that has batches in "rooting" stage

**Expected Behavior**: Allow retire, batches continue normally

**Handling**: Status change on mother plant doesn't affect batches. Display warning.

**Test Case**:
- Given: Mother plant with rooting batch
- When: User retires mother plant
- Then: Warning shown, batch unaffected, mother shows "(Retired)" in batch view

---

### EC-026: Reactivate Deceased Mother Plant
**Priority**: High
**Scenario**: Plant marked as deceased was actually dormant

**Expected Behavior**: Allow status change deceased → active with confirmation

**Handling**:
```typescript
if (currentStatus === 'deceased' && newStatus === 'active') {
  return { requireConfirmation: true, message: 'Confirm plant recovery?' };
}
```

**Test Case**:
- Given: Deceased mother plant
- When: User changes status to active
- Then: Confirmation dialog, status updated

---

### EC-027: Zero Success Rate Mother Plant
**Priority**: High
**Scenario**: All batches from this mother have failed (0% success)

**Expected Behavior**: Flag for review, suggest retirement

**Handling**:
```typescript
function getMotherPlantMetrics(id: string) {
  const batches = await getBatchesByMother(id);
  const successRate = calculateSuccessRate(batches);

  return {
    successRate,
    flags: successRate === 0 ? ['zero_success_rate'] : [],
    suggestion: successRate === 0 ? 'Consider retiring this mother plant' : null
  };
}
```

**Test Case**:
- Given: Mother plant with 5 batches, all failed
- When: Viewing mother plant detail
- Then: Warning banner "0% success rate - consider retiring"

---

### EC-028: Duplicate Mother Plants
**Priority**: Medium
**Scenario**: Two mother plants with same species and variety

**Expected Behavior**: Allow - different individual plants, suggest labeling

**Handling**: No uniqueness constraint. Show warning if label is also the same.

**Test Case**:
- Given: Mother plant "Basil - Genovese"
- When: Creating another "Basil - Genovese"
- Then: Prompt to add distinguishing label

---

### EC-029: Change Mother Plant Species/Variety
**Priority**: Medium
**Scenario**: Correcting misidentified plant species

**Expected Behavior**: Allow but warn about historical batch data

**Handling**:
```typescript
const batchCount = await db.propBatches.where('motherPlantId').equals(id).count();
if (batchCount > 0) {
  return {
    warning: `${batchCount} batch(es) will show updated species. Historical data may be confusing.`
  };
}
```

**Test Case**:
- Given: Mother plant with 3 batches
- When: User changes species
- Then: Warning shown, all batches reflect new species

---

### EC-030: Mother Plant with No Location
**Priority**: Medium
**Scenario**: Mother plant created without setting location field

**Expected Behavior**: Allow - location is optional

**Handling**: Nullable field, no special handling

**Test Case**:
- Given: New mother plant form
- When: Location left empty
- Then: Plant created, location shows "Not specified"

---

### EC-031: Mother Plant Health Score Edge Values
**Priority**: Low
**Scenario**: Health score at boundary (1 or 5)

**Expected Behavior**: Accept valid range 1-5

**Handling**:
```typescript
const healthScoreSchema = z.number().int().min(1).max(5);
```

**Test Case**:
- Given: Mother plant edit form
- When: Health set to 0 or 6
- Then: Validation error

---

## 5. Station Management Edge Cases

### EC-032: Station at 100%+ Capacity
**Priority**: Critical
**Scenario**: Adding batch when station is already at capacity

**Expected Behavior**: Warn but allow (soft limit per PRD)

**Handling**:
```typescript
function getStationOccupancy(stationId: string) {
  const batches = await db.propBatches
    .where('stationId').equals(stationId)
    .filter(b => !['graduated', 'failed'].includes(b.stage))
    .toArray();

  const currentOccupancy = batches.reduce((sum, b) => sum + b.quantitySurviving, 0);
  const station = await db.propStations.get(stationId);

  return {
    current: currentOccupancy,
    capacity: station.capacity,
    percentUsed: (currentOccupancy / station.capacity) * 100,
    isOverCapacity: currentOccupancy > station.capacity
  };
}
```

**Test Case**:
- Given: Station with capacity 30, current occupancy 28
- When: Adding batch of 10 propagules
- Then: Warning "Station will be at 127% capacity", allow proceed

---

### EC-033: Deactivate Station with Active Batches
**Priority**: Critical
**Scenario**: Setting station status to inactive while batches are present

**Expected Behavior**: Block or require batch relocation first

**Handling**:
```typescript
const activeBatches = await getActiveBatchesInStation(stationId);
if (activeBatches.length > 0) {
  throw new ValidationError(
    `Cannot deactivate: ${activeBatches.length} active batch(es). Move batches first.`
  );
}
```

**Test Case**:
- Given: Station with 2 active batches
- When: User toggles inactive
- Then: Error with batch count, list of batches to move

---

### EC-034: Delete Station with Historical Batches
**Priority**: High
**Scenario**: Station has no active batches but was used for past batches

**Expected Behavior**: Soft delete (archive) to preserve history

**Handling**:
```typescript
const totalBatches = await db.propBatches.where('stationId').equals(id).count();
if (totalBatches > 0) {
  // Archive instead of delete
  await db.propStations.update(id, {
    status: 'archived',
    archivedAt: new Date()
  });
  return { archived: true, message: 'Station archived to preserve history' };
}
// Safe to hard delete
await db.propStations.delete(id);
```

**Test Case**:
- Given: Station with completed batches
- When: User deletes
- Then: Station archived, historical batches show "Station Name (Archived)"

---

### EC-035: Move Batch Between Stations
**Priority**: High
**Scenario**: Batch needs to move from propagator to cold frame

**Expected Behavior**: Allow with capacity check on destination

**Handling**:
```typescript
async function moveBatch(batchId: string, newStationId: string) {
  const batch = await db.propBatches.get(batchId);
  const destOccupancy = await getStationOccupancy(newStationId);

  if (destOccupancy.current + batch.quantitySurviving > destOccupancy.capacity) {
    return { warning: 'Destination station will be over capacity' };
  }

  await db.propBatches.update(batchId, { stationId: newStationId });
}
```

**Test Case**:
- Given: Batch in Station A
- When: User moves to Station B
- Then: Batch stationId updated, occupancy recalculated both stations

---

### EC-036: Station Capacity Set to Zero
**Priority**: High
**Scenario**: Editing station to have capacity = 0

**Expected Behavior**: Block if batches present, warn otherwise

**Handling**:
```typescript
if (newCapacity === 0) {
  const occupancy = await getStationOccupancy(stationId);
  if (occupancy.current > 0) {
    throw new ValidationError('Cannot set capacity to 0 with active batches');
  }
  return { warning: 'Station with 0 capacity cannot accept batches' };
}
```

**Test Case**:
- Given: Empty station
- When: Set capacity to 0
- Then: Warning shown, station saved with 0 capacity

---

### EC-037: Environmental Log Outside Target Range
**Priority**: High
**Scenario**: Logged temperature is outside station's target range

**Expected Behavior**: Accept but flag as out-of-range

**Handling**:
```typescript
function logEnvironment(stationId: string, temp: number, humidity: number) {
  const station = await db.propStations.get(stationId);
  const flags = [];

  if (temp < station.targetTempMin || temp > station.targetTempMax) {
    flags.push('temp_out_of_range');
  }
  if (humidity < station.targetHumidityMin || humidity > station.targetHumidityMax) {
    flags.push('humidity_out_of_range');
  }

  await db.propStationLogs.add({
    stationId, temp, humidity, flags, timestamp: new Date()
  });

  return { flags };
}
```

**Test Case**:
- Given: Station with target temp 18-24°C
- When: Log temperature 28°C
- Then: Log saved with flag, alert shown

---

### EC-038: Station with No Environmental Targets
**Priority**: Medium
**Scenario**: Station created without temperature/humidity targets

**Expected Behavior**: Allow logging but skip range checks

**Handling**: Targets are optional. If null, no flagging occurs.

**Test Case**:
- Given: Station with null targetTempMin/Max
- When: Log any temperature
- Then: Log saved without flags

---

### EC-039: Concurrent Batch Assignment
**Priority**: Medium
**Scenario**: Two batches created simultaneously for same station

**Expected Behavior**: Both succeed, occupancy correctly updated

**Handling**: Each batch creation reads current occupancy. Race condition possible but low impact (soft limit).

**Test Case**:
- Given: Station at 50% capacity
- When: Two batches created simultaneously
- Then: Both succeed, occupancy shows sum of both

---

### EC-040: Station Type Change with Batches
**Priority**: Low
**Scenario**: Changing station type from "heated_propagator" to "water_propagation"

**Expected Behavior**: Allow with warning about batch compatibility

**Handling**:
```typescript
if (hasActiveBatches && typeChanged) {
  return {
    warning: 'Changing station type may affect propagation method recommendations for active batches'
  };
}
```

**Test Case**:
- Given: Heated propagator with 3 batches
- When: Type changed to cold frame
- Then: Warning shown, type updated

---

## 6. Cost Tracking Edge Cases

### EC-041: Zero Cost Supply
**Priority**: High
**Scenario**: Adding supply with cost = 0 (free samples, donations)

**Expected Behavior**: Allow - valid scenario

**Handling**: Zero cost is valid. Displays as "$0.00"

**Test Case**:
- Given: New supply form
- When: Cost entered as 0
- Then: Supply saved, cost per unit shows $0.00

---

### EC-042: Cost Allocation to Graduated Batch
**Priority**: High
**Scenario**: Adding cost to batch that's already graduated

**Expected Behavior**: Block - graduated batches are finalized

**Handling**:
```typescript
if (batch.stage === 'graduated') {
  throw new ValidationError('Cannot add costs to graduated batch');
}
```

**Test Case**:
- Given: Graduated batch
- When: User tries to allocate cost
- Then: Error "Cannot add costs to graduated batch"

---

### EC-043: Cost Allocation to Failed Batch
**Priority**: High
**Scenario**: Adding cost to failed batch

**Expected Behavior**: Allow - costs were still incurred

**Handling**: Failed batches can receive cost allocations. Important for accurate loss tracking.

**Test Case**:
- Given: Failed batch
- When: User allocates $5 for rooting hormone used
- Then: Cost added, shows in loss calculations

---

### EC-044: Cost Per Surviving with Zero Survivors
**Priority**: Critical
**Scenario**: Calculating cost-per-propagule when all propagules died

**Expected Behavior**: Display "N/A" not infinity or error

**Handling**:
```typescript
function calculateCostPerSurviving(totalCost: number, surviving: number): string {
  if (surviving === 0) return 'N/A';
  return formatCurrency(totalCost / surviving);
}
```

**Test Case**:
- Given: Batch with $50 costs, 0 surviving
- When: Viewing cost summary
- Then: "Cost per surviving: N/A (all failed)"

---

### EC-045: Cost Per Graduated with Zero Graduated
**Priority**: Critical
**Scenario**: Calculating cost-per-graduated-propagule before any graduation

**Expected Behavior**: Display "N/A" or "Pending"

**Handling**:
```typescript
function calculateCostPerGraduated(totalCost: number, graduated: number): string {
  if (graduated === 0) return 'Pending';
  return formatCurrency(totalCost / graduated);
}
```

**Test Case**:
- Given: Batch with costs, 0 graduated yet
- When: Viewing cost summary
- Then: "Cost per graduated: Pending"

---

### EC-046: Concurrent Supply Allocation
**Priority**: Critical
**Scenario**: Two batches allocate from same supply simultaneously

**Expected Behavior**: Prevent negative inventory

**Handling**:
```typescript
await db.transaction('rw', db.propSupplies, db.propBatchCosts, async () => {
  const supply = await db.propSupplies.get(supplyId);
  if (supply.quantityRemaining < quantityUsed) {
    throw new ValidationError(`Only ${supply.quantityRemaining} remaining`);
  }

  await db.propSupplies.update(supplyId, {
    quantityRemaining: supply.quantityRemaining - quantityUsed
  });

  await db.propBatchCosts.add({
    batchId, supplyId, quantityUsed, cost: (quantityUsed / supply.quantity) * supply.cost
  });
});
```

**Test Case**:
- Given: Supply with 10 units remaining
- When: Two batches each try to allocate 8 units
- Then: First succeeds, second fails with insufficient quantity

---

### EC-047: Negative Supply Quantity (Returns)
**Priority**: High
**Scenario**: Returning unused supply, need to increase inventory

**Expected Behavior**: Support negative allocation (or separate "return" action)

**Handling**:
```typescript
async function returnSupply(supplyId: string, quantityReturned: number) {
  await db.propSupplies.update(supplyId, {
    quantityRemaining: supply.quantityRemaining + quantityReturned
  });

  await db.propSupplyReturns.add({
    supplyId, quantityReturned, date: new Date(), reason
  });
}
```

**Test Case**:
- Given: Supply with 5 remaining, batch allocated 3
- When: Return 2 units
- Then: Supply shows 7 remaining

---

### EC-048: Supply Unit Mismatch
**Priority**: Medium
**Scenario**: Supply in "ml", user tries to allocate in "grams"

**Expected Behavior**: Show unit in UI, require matching

**Handling**: UI shows supply unit, allocation must use same unit

**Test Case**:
- Given: Rooting hormone supply (500ml)
- When: Allocating to batch
- Then: Form shows "Amount (ml):" with unit label

---

### EC-049: Very Small Cost Allocation
**Priority**: Medium
**Scenario**: Allocating 0.001 of supply worth $0.005

**Expected Behavior**: Accept and display with appropriate precision

**Handling**: Use 4 decimal places for cost calculations, 2 for display

**Test Case**:
- Given: Batch allocating tiny amount
- When: Cost calculated
- Then: Displays "$0.01" (rounded for display)

---

### EC-050: Delete Supply with Allocations
**Priority**: Low
**Scenario**: Deleting supply that has been allocated to batches

**Expected Behavior**: Block or preserve allocation records

**Handling**:
```typescript
const allocations = await db.propBatchCosts.where('supplyId').equals(id).count();
if (allocations > 0) {
  throw new ValidationError(
    `Cannot delete: ${allocations} allocation(s) reference this supply. Archive instead.`
  );
}
```

**Test Case**:
- Given: Supply with 5 allocations
- When: Delete attempted
- Then: Error with allocation count

---

## 7. Graduation Edge Cases

### EC-051: Graduate More Than Surviving
**Priority**: Critical
**Scenario**: Batch has 10 surviving, user tries to graduate 15

**Expected Behavior**: Block - cannot graduate more than exist

**Handling**:
```typescript
const available = batch.quantitySurviving - batch.quantityGraduated;
if (graduatingNow > available) {
  throw new ValidationError(
    `Cannot graduate ${graduatingNow}. Only ${available} available.`
  );
}
```

**Test Case**:
- Given: Batch with 10 surviving, 3 already graduated
- When: User tries to graduate 10
- Then: Error "Only 7 available for graduation"

---

### EC-052: Partial Graduation
**Priority**: High
**Scenario**: Graduating 5 of 10 surviving propagules

**Expected Behavior**: Allow, batch stays in "ready" stage until all graduated

**Handling**:
```typescript
async function recordGraduation(batchId: string, quantity: number, outcome: string) {
  await db.propGraduations.add({ batchId, quantity, outcome, date: new Date() });

  const totalGraduated = await getTotalGraduated(batchId);
  if (totalGraduated >= batch.quantitySurviving) {
    await db.propBatches.update(batchId, { stage: 'graduated' });
  }
}
```

**Test Case**:
- Given: Batch with 10 surviving in "ready" stage
- When: Graduate 5
- Then: 5 graduated recorded, batch stays "ready", 5 remaining

---

### EC-053: Multiple Outcomes for Same Batch
**Priority**: High
**Scenario**: 3 sold, 2 planted in garden, 5 gifted

**Expected Behavior**: Allow multiple graduation records with different outcomes

**Handling**: Graduation records are separate per event, not per batch

**Test Case**:
- Given: Batch with 10 surviving
- When: Record 3 "sold", then 2 "planted_garden", then 5 "gifted"
- Then: 3 graduation records, batch auto-advances to "graduated"

---

### EC-054: Graduation with Zero Quantity
**Priority**: High
**Scenario**: User submits graduation with quantity = 0

**Expected Behavior**: Block - graduation must have at least 1

**Handling**:
```typescript
if (quantity <= 0) {
  throw new ValidationError('Graduation quantity must be at least 1');
}
```

**Test Case**:
- Given: Graduation form
- When: Quantity entered as 0
- Then: Validation error

---

### EC-055: Auto-Transition to Graduated
**Priority**: High
**Scenario**: Final graduation event makes total graduated = surviving

**Expected Behavior**: Auto-transition batch to "graduated" stage

**Handling**: See EC-052 handling code

**Test Case**:
- Given: Batch with 10 surviving, 9 already graduated
- When: Graduate remaining 1
- Then: Batch stage auto-updates to "graduated"

---

### EC-056: Gift Graduation Without Recipient
**Priority**: Medium
**Scenario**: Outcome is "gifted" but no recipient specified

**Expected Behavior**: Allow - recipient is optional

**Handling**: `giftRecipient` field is nullable

**Test Case**:
- Given: Graduation form with outcome "gifted"
- When: Recipient left blank
- Then: Graduation recorded, recipient shows "Unknown"

---

### EC-057: Sale Graduation Without Price
**Priority**: Medium
**Scenario**: Outcome is "sold" but no sale price recorded

**Expected Behavior**: Warn but allow (price may not be known yet)

**Handling**:
```typescript
if (outcome === 'sold' && !salePrice) {
  return { warning: 'Sale price not recorded. Update later via sales module.' };
}
```

**Test Case**:
- Given: Graduation with outcome "sold"
- When: Price left blank
- Then: Warning shown, graduation saved with null price

---

### EC-058: Edit Past Graduation
**Priority**: Medium
**Scenario**: Need to correct graduation quantity recorded yesterday

**Expected Behavior**: Allow edit with audit trail

**Handling**: Graduation records are editable. Store `updatedAt` timestamp.

**Test Case**:
- Given: Graduation from yesterday
- When: Edit quantity from 5 to 4
- Then: Record updated, updatedAt set, batch quantities recalculated

---

### EC-059: Delete Graduation Record
**Priority**: Low
**Scenario**: Graduation recorded in error

**Expected Behavior**: Allow delete, recalculate batch quantities

**Handling**:
```typescript
async function deleteGraduation(graduationId: string) {
  const graduation = await db.propGraduations.get(graduationId);
  await db.propGraduations.delete(graduationId);

  // Recalculate batch graduated count
  const remaining = await db.propGraduations
    .where('batchId').equals(graduation.batchId)
    .toArray();
  const totalGraduated = remaining.reduce((sum, g) => sum + g.quantity, 0);

  // May need to revert batch from "graduated" stage
  if (totalGraduated < batch.quantitySurviving && batch.stage === 'graduated') {
    await db.propBatches.update(graduation.batchId, { stage: 'ready' });
  }
}
```

**Test Case**:
- Given: Graduated batch
- When: Delete one graduation record
- Then: Batch reverts to "ready" if not fully graduated

---

## 8. Data Integrity Edge Cases

### EC-060: Concurrent Updates to Same Batch
**Priority**: Critical
**Scenario**: Two browser tabs editing same batch simultaneously

**Expected Behavior**: Optimistic locking prevents lost updates

**Handling**:
```typescript
// Each batch has a version field
interface PropBatch {
  // ... other fields
  version: number;
}

async function updateBatch(id: string, updates: Partial<PropBatch>, expectedVersion: number) {
  const result = await db.propBatches.where('id').equals(id).modify((batch) => {
    if (batch.version !== expectedVersion) {
      throw new ConcurrencyError('Batch was modified. Please refresh and try again.');
    }
    Object.assign(batch, updates, { version: batch.version + 1 });
  });

  if (result === 0) {
    throw new NotFoundError('Batch not found');
  }
}
```

**Test Case**:
- Given: Batch open in two tabs, version 1
- When: Tab A saves (version → 2), Tab B saves (expects version 1)
- Then: Tab B gets conflict error

---

### EC-061: Import with Duplicate IDs
**Priority**: Critical
**Scenario**: Importing data that has IDs already existing in database

**Expected Behavior**: Offer merge/skip/overwrite options

**Handling**:
```typescript
async function importData(data: ExportedData, strategy: 'skip' | 'overwrite' | 'merge') {
  for (const batch of data.batches) {
    const existing = await db.propBatches.get(batch.id);

    if (existing) {
      if (strategy === 'skip') continue;
      if (strategy === 'overwrite') {
        await db.propBatches.put(batch);
      }
      if (strategy === 'merge') {
        await db.propBatches.put({ ...existing, ...batch, id: existing.id });
      }
    } else {
      await db.propBatches.add(batch);
    }
  }
}
```

**Test Case**:
- Given: Database with batch ID "abc123"
- When: Import file with same ID
- Then: User prompted for strategy (skip/overwrite/merge)

---

### EC-062: Orphaned Records
**Priority**: Critical
**Scenario**: Mother plant deleted but batches still reference it

**Expected Behavior**: Foreign key validation, prevent orphans

**Handling**: Soft delete mother plants (archive). Batch still shows reference.

**Test Case**:
- Given: Database with batch referencing mother plant
- When: Mother plant hard deleted (via direct DB access)
- Then: Batch shows "Unknown mother plant" gracefully

---

### EC-063: Corrupted Stage Transition History
**Priority**: High
**Scenario**: Transition records don't match current batch stage

**Expected Behavior**: Self-healing or admin warning

**Handling**:
```typescript
async function validateBatchConsistency(batchId: string) {
  const batch = await db.propBatches.get(batchId);
  const lastTransition = await db.propStageTransitions
    .where('batchId').equals(batchId)
    .last();

  if (lastTransition && lastTransition.toStage !== batch.stage) {
    console.warn(`Batch ${batchId} stage mismatch: batch.stage=${batch.stage}, lastTransition=${lastTransition.toStage}`);
    // Auto-repair or flag for admin
  }
}
```

**Test Case**:
- Given: Batch stage "rooted", last transition shows "potted_up"
- When: Batch loads
- Then: Warning logged, admin notified

---

### EC-064: Export During Active Transaction
**Priority**: Medium
**Scenario**: User exports while another tab is creating batches

**Expected Behavior**: Consistent snapshot export

**Handling**: Export uses read transaction to get consistent snapshot

**Test Case**:
- Given: Export started
- When: Another tab creates batch during export
- Then: Export completes without new batch (or with it, but consistent)

---

## 9. Timing Edge Cases

### EC-065: Very Long Propagation Cycle
**Priority**: Critical
**Scenario**: Tree cuttings taking 12+ months to graduate

**Expected Behavior**: Support multi-year batches gracefully

**Handling**: No hardcoded timeouts. Date fields are nullable. UI shows duration in weeks/months/years appropriately.

**Test Case**:
- Given: Batch created January 2026
- When: Viewing in December 2027
- Then: Duration shows "1 year, 11 months" not "730 days"

---

### EC-066: Future-Dated Batch Creation
**Priority**: High
**Scenario**: User tries to pre-schedule a batch for next week

**Expected Behavior**: Block - batches represent actual events

**Handling**:
```typescript
if (dateTaken > new Date()) {
  throw new ValidationError('Batch date cannot be in the future');
}
```

**Test Case**:
- Given: New batch form
- When: Date set to next week
- Then: Validation error

---

### EC-067: Daylight Saving Time Transition
**Priority**: Medium
**Scenario**: Batch created during DST transition

**Expected Behavior**: Store UTC, display local time

**Handling**: All dates stored as ISO strings in UTC. UI converts to local.

**Test Case**:
- Given: Batch created at 2:30 AM during "spring forward"
- When: Viewing batch next day
- Then: Time displayed correctly in local timezone

---

## 10. Test Checklist

### Batch Management
- [ ] EC-001: Create batch with quantity 0
- [ ] EC-002: Create batch with negative quantity
- [ ] EC-003: Create batch exceeding station capacity
- [ ] EC-005: Create batch without station
- [ ] EC-006: Verify unique batch numbers
- [ ] EC-007: Double-submit batch form
- [ ] EC-008: Update surviving > started

### Stage Transitions
- [ ] EC-013: Skip stages in transition
- [ ] EC-014: Transition from graduated
- [ ] EC-015: Transition from failed
- [ ] EC-016: Advance stage with 0 survivors
- [ ] EC-017: Backdate transition
- [ ] EC-018: Future-date transition
- [ ] EC-021: Fail batch without reason

### Mother Plants
- [ ] EC-024: Delete mother with active batches
- [ ] EC-025: Retire mother with active batches
- [ ] EC-027: View 0% success rate mother

### Stations
- [ ] EC-032: Add batch to over-capacity station
- [ ] EC-033: Deactivate station with active batches
- [ ] EC-035: Move batch between stations

### Cost Tracking
- [ ] EC-044: View cost per surviving with 0 survivors
- [ ] EC-046: Concurrent supply allocation

### Graduation
- [ ] EC-051: Graduate more than surviving
- [ ] EC-052: Partial graduation
- [ ] EC-053: Multiple outcomes same batch
- [ ] EC-055: Auto-transition on final graduation

### Data Integrity
- [ ] EC-060: Concurrent batch updates
- [ ] EC-061: Import with duplicate IDs

---

## 11. Error Message Reference

| Code | Message | Context |
|------|---------|---------|
| PROP-E001 | Quantity must be at least 1 | Batch creation |
| PROP-E002 | Station is required | Batch creation |
| PROP-E003 | Surviving cannot exceed started | Batch update |
| PROP-E004 | Cannot modify graduated batch | Stage transition |
| PROP-E005 | Cannot modify failed batch | Stage transition |
| PROP-E006 | No surviving propagules | Stage advance |
| PROP-E007 | Transition date cannot be in the future | Stage transition |
| PROP-E008 | Please specify a failure reason | Mark failed |
| PROP-E009 | Cannot delete: active batches reference this mother plant | Mother delete |
| PROP-E010 | Cannot deactivate: active batches in station | Station deactivate |
| PROP-E011 | Cannot add costs to graduated batch | Cost allocation |
| PROP-E012 | Insufficient supply quantity | Cost allocation |
| PROP-E013 | Cannot graduate more than available | Graduation |
| PROP-E014 | Graduation quantity must be at least 1 | Graduation |
| PROP-E015 | Batch was modified by another session | Concurrent update |
| PROP-E016 | Batch date cannot be in the future | Batch creation |

---

*End of Edge Cases Document*
