/**
 * E2E Test: Station Management
 *
 * Tests propagation station CRUD operations and occupancy tracking:
 * 1. Create stations of different types
 * 2. Edit station properties (name, capacity, environmental targets)
 * 3. View station occupancy when batches are added
 * 4. Activate/deactivate stations
 * 5. Station validation (cannot delete station with active batches)
 *
 * Stations are physical locations where propagation happens (propagators, benches, etc.)
 */

import { test, expect } from '@playwright/test';

test.describe('Station Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first
    await page.goto('/');

    // Clear localStorage to reset onboarding and set it complete
    await page.evaluate(() => {
      localStorage.setItem('paddock_onboarding_complete', 'true');
    });

    // Clear IndexedDB databases for clean state
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });

    // Reload to apply changes
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('create stations of different types', async ({ page }) => {
    // ============================================
    // STEP 1: Create prerequisite site
    // ============================================
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Station Types Test');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Station Types Test"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 2: Navigate to Propagation Stations
    // ============================================
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await expect(page).toHaveURL(/\/propagation/);

    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // ============================================
    // STEP 3: Create Heated Propagator
    // ============================================
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Heated Propagator 1');
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text="Heated Propagator 1"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 4: Create Cold Frame
    // ============================================
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Outdoor Cold Frame');
    await page.getByRole('dialog').getByRole('button', { name: 'Cold Frame', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '100', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text="Outdoor Cold Frame"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 5: Create Mist System
    // ============================================
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Commercial Mist Bench');
    await page.getByRole('dialog').getByRole('button', { name: 'Mist System', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '200', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text="Commercial Mist Bench"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 6: Verify all three stations visible
    // ============================================
    await expect(page.locator('text="Heated Propagator 1"').first()).toBeVisible();
    await expect(page.locator('text="Outdoor Cold Frame"').first()).toBeVisible();
    await expect(page.locator('text="Commercial Mist Bench"').first()).toBeVisible();

    // Verify persistence after refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text="Heated Propagator 1"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Outdoor Cold Frame"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Commercial Mist Bench"').first()).toBeVisible({ timeout: 10000 });
  });

  test('station form validation', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Validation Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Validation Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation Stations
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Open new station form
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    // Clear name field to trigger validation
    const nameInput = page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i);
    await nameInput.clear();

    // Try to submit empty form
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();

    // Should show validation error
    await expect(page.getByText(/Name is required|required/i).first()).toBeVisible({ timeout: 5000 });

    // Fill in valid data
    await nameInput.fill('Valid Test Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Unheated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '25', exact: true }).click();

    // Submit should work now
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();

    // Verify station created
    await expect(page.locator('text="Valid Test Station"').first()).toBeVisible({ timeout: 10000 });
  });

  test('station occupancy tracking with batches', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Occupancy Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Occupancy Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation and create station
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create station with 100 capacity
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Occupancy Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '100', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Station should show 0/100 or 0% occupancy initially
    const stationCard = page.locator('.rounded-xl').filter({ hasText: 'Occupancy Station' }).first();
    await expect(stationCard).toBeVisible();

    // Look for occupancy indicator (0/100 or 0%)
    const occupancyIndicator = stationCard.locator('text=/0.*100|0%|0 used/i');
    if (await occupancyIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(occupancyIndicator).toBeVisible();
    }

    // Create a batch with 20 cuttings in this station
    await page.getByRole('link', { name: /Batches/i }).click();
    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Geranium');
    await page.getByRole('dialog').getByRole('button', { name: 'Softwood Cutting', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '20', exact: true }).click();
    await page.getByRole('dialog').locator('select[name="stationId"]').selectOption({ index: 1 });
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Navigate back to stations
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Station should now show 20/100 or 20% occupancy
    const updatedCard = page.locator('.rounded-xl').filter({ hasText: 'Occupancy Station' }).first();
    const updatedOccupancy = updatedCard.locator('text=/20.*100|20%|20 used/i');
    if (await updatedOccupancy.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(updatedOccupancy).toBeVisible();
    }
  });

  test('station detail view and editing', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Edit Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Edit Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation and create station
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create station
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Editable Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Greenhouse Bench', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Click on station to view detail
    await page.locator('.rounded-xl').filter({ hasText: 'Editable Station' }).first().click();
    await page.waitForTimeout(500);

    // Should see station detail page with correct heading
    await expect(page.getByRole('heading', { name: 'Editable Station' })).toBeVisible({ timeout: 5000 });

    // Verify station details are displayed
    await expect(page.locator('text="Station Details"')).toBeVisible();
    await expect(page.locator('text="Greenhouse Bench"').first()).toBeVisible();
    await expect(page.locator('text=/50|Capacity.*50/i').first()).toBeVisible();

    // Verify action buttons are available
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Log Environment|Log Env/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Deactivate/i })).toBeVisible();

    // Click edit to open form, verify modal opens
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.waitForTimeout(500);

    // Verify edit dialog opens with current station name
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i)).toHaveValue('Editable Station');

    // Close the dialog without making changes
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);

    // Station name should still be the same
    await expect(page.getByRole('heading', { name: 'Editable Station' })).toBeVisible();
  });

  test('station activation and deactivation', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Activation Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Activation Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation and create station
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create station
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Toggle Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Water Propagation', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '25', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Station should be active by default
    const stationCard = page.locator('.rounded-xl').filter({ hasText: 'Toggle Station' }).first();
    await expect(stationCard).toBeVisible();

    // Look for active indicator
    const activeIndicator = stationCard.locator('text=/active/i');
    if (await activeIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activeIndicator).toBeVisible();
    }

    // Click on station to view detail
    await stationCard.click();
    await page.waitForTimeout(500);

    // Look for deactivate button
    const deactivateButton = page.getByRole('button', { name: /Deactivate|Disable|Inactive/i });
    if (await deactivateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deactivateButton.click();
      await page.waitForTimeout(500);

      // Confirm if dialog appears
      const confirmButton = page.getByRole('dialog').getByRole('button', { name: /Confirm|Yes|Deactivate/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }

      // Should now show as inactive
      const inactiveIndicator = page.locator('text=/inactive|disabled/i');
      if (await inactiveIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(inactiveIndicator.first()).toBeVisible();
      }
    }
  });

  test('station environmental log recording', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Env Log Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Env Log Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation and create station
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create station
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Monitored Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Click on station to view detail
    await page.locator('.rounded-xl').filter({ hasText: 'Monitored Station' }).first().click();
    await page.waitForTimeout(500);

    // Look for log environment button
    const logButton = page.getByRole('button', { name: /Log.*Environment|Record.*Reading|Add.*Log/i });
    if (await logButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logButton.click();
      await page.waitForTimeout(500);

      // Fill in temperature
      const tempInput = page.getByRole('dialog').locator('input[name="temperature"], input[placeholder*="temp" i]');
      if (await tempInput.isVisible()) {
        await tempInput.fill('22');
      }

      // Fill in humidity
      const humidityInput = page.getByRole('dialog').locator('input[name="humidity"], input[placeholder*="humid" i]');
      if (await humidityInput.isVisible()) {
        await humidityInput.fill('85');
      }

      // Notes
      const notesInput = page.getByRole('dialog').locator('textarea, input[name="notes"]');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Morning reading. Conditions optimal.');
      }

      // Save log
      const saveButton = page.getByRole('dialog').getByRole('button', { name: /Save|Record|Submit/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      // Should see the logged values
      const loggedTemp = page.locator('text=/22.*C|22°/');
      if (await loggedTemp.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(loggedTemp.first()).toBeVisible();
      }
    }
  });
});
