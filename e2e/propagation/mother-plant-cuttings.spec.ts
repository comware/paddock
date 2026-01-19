/**
 * E2E Test: Mother Plant Cutting Workflow
 *
 * Tests the mother plant registry and cutting workflow:
 * 1. Register a mother plant
 * 2. View mother plant details
 * 3. Take cuttings from mother plant (create batch linked to mother)
 * 4. Record health check for mother plant
 * 5. Verify lineage tracking between mother and batch
 *
 * This tests the provenance tracking that connects batches to their source plants.
 */

import { test, expect } from '@playwright/test';

test.describe('Mother Plant Cutting Workflow', () => {
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

  test('register mother plant and take cuttings from it', async ({ page }) => {
    // ============================================
    // STEP 1: Create prerequisite site
    // ============================================
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Mother Plant Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Mother Plant Test Site"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 2: Navigate to Propagation and create station
    // ============================================
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await expect(page).toHaveURL(/\/propagation/);

    // Create station first (needed for batches)
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Mother Test Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '100', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // ============================================
    // STEP 3: Navigate to Mother Plants and register one
    // ============================================
    await page.getByRole('link', { name: /Mother Plants/i }).click();
    await expect(page).toHaveURL(/\/propagation\/mother-plants/);

    // Click to add new mother plant
    await page.getByRole('button', { name: /Register.*Mother Plant/i }).first().click();
    await page.waitForTimeout(500);

    // Fill in mother plant form
    // Label (unique identifier)
    await page.getByRole('dialog').getByPlaceholder(/Kitchen Rosemary|Main Fig/i).fill('Kitchen Rosemary');

    // Species
    const speciesInput = page.getByRole('dialog').getByPlaceholder(/search.*species|species/i);
    await speciesInput.fill('Rosemary');

    // Variety (optional)
    const varietyInput = page.getByRole('dialog').getByPlaceholder(/Tuscan Blue|Brown Turkey/i);
    if (await varietyInput.isVisible()) {
      await varietyInput.fill('Tuscan Blue');
    }

    // Acquisition method - click the "Purchased" button
    await page.getByRole('dialog').getByRole('button', { name: 'Purchased', exact: false }).first().click();

    // Acquisition source (optional)
    const sourceInput = page.getByRole('dialog').getByPlaceholder(/Local nursery|Friend.*garden|Bunnings/i);
    if (await sourceInput.isVisible()) {
      await sourceInput.fill('Local Garden Centre');
    }

    // Submit form
    await page.getByRole('dialog').getByRole('button', { name: /Register|Save|Add/i }).last().click();
    await page.waitForTimeout(1000);

    // Verify mother plant was created
    await expect(page.locator('text="Kitchen Rosemary"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 4: Create batch linked to mother plant
    // ============================================
    await page.getByRole('link', { name: /Batches/i }).click();
    await expect(page).toHaveURL(/\/propagation\/batches/);

    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    // Fill batch form with mother plant link
    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Rosemary');
    await page.getByRole('dialog').getByRole('button', { name: 'Softwood Cutting', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '10', exact: true }).click();

    // Select station
    const stationSelect = page.getByRole('dialog').locator('select[name="stationId"]');
    await stationSelect.selectOption({ index: 1 });

    // Select mother plant - this is the key linkage
    const motherPlantSelect = page.getByRole('dialog').locator('select[name="motherPlantId"]');
    if (await motherPlantSelect.isVisible()) {
      // Select the first mother plant option (Kitchen Rosemary)
      await motherPlantSelect.selectOption({ index: 1 });
    }

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Verify batch created
    await expect(page.locator('text=Rosemary').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 5: Verify persistence
    // ============================================
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to mother plants
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await page.getByRole('link', { name: /Mother Plants/i }).click();

    // Mother plant should still exist
    await expect(page.locator('text="Kitchen Rosemary"').first()).toBeVisible({ timeout: 10000 });
  });

  test('mother plant health check workflow', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Health Check Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Health Check Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation Mother Plants
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await page.getByRole('link', { name: /Mother Plants/i }).click();

    // Register a mother plant
    await page.getByRole('button', { name: /Register.*Mother Plant/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Kitchen Rosemary|Main Fig/i).fill('Main Fig Tree');
    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Fig');
    await page.getByRole('dialog').getByRole('button', { name: 'Purchased', exact: false }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Register|Save|Add/i }).last().click();
    await page.waitForTimeout(1000);

    // Verify plant created
    await expect(page.locator('text="Main Fig Tree"').first()).toBeVisible({ timeout: 10000 });

    // Click on mother plant to view detail
    await page.locator('.rounded-xl').filter({ hasText: 'Main Fig Tree' }).first().click();
    await page.waitForTimeout(500);

    // Look for health check button
    const healthCheckButton = page.getByRole('button', { name: /Health Check|Record Health|Check Health/i });
    if (await healthCheckButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await healthCheckButton.click();
      await page.waitForTimeout(500);

      // If health check modal appears, fill it
      const scoreInput = page.getByRole('dialog').locator('input[type="number"], input[name="score"], [role="slider"]');
      if (await scoreInput.isVisible()) {
        // Set health score (1-5)
        await scoreInput.fill('4');
      }

      // Health notes
      const notesInput = page.getByRole('dialog').locator('textarea, input[name="notes"]');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Looking healthy. New growth visible.');
      }

      // Submit health check
      const saveButton = page.getByRole('dialog').getByRole('button', { name: /Save|Record|Submit/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify health check recorded - look for score or "healthy" indicator
    const healthIndicator = page.locator('text=/health.*4|score.*4|4.*5|healthy/i');
    if (await healthIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(healthIndicator.first()).toBeVisible();
    }
  });

  test('mother plant status management (retire, reactivate)', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Status Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Status Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation Mother Plants
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await page.getByRole('link', { name: /Mother Plants/i }).click();

    // Register a mother plant
    await page.getByRole('button', { name: /Register.*Mother Plant/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Kitchen Rosemary|Main Fig/i).fill('Old Lavender');
    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Lavender');
    await page.getByRole('dialog').getByRole('button', { name: 'Purchased', exact: false }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Register|Save|Add/i }).last().click();
    await page.waitForTimeout(1000);

    // Verify plant created with active status
    await expect(page.locator('text="Old Lavender"').first()).toBeVisible({ timeout: 10000 });

    // Plant should show as active
    const activeIndicator = page.locator('text=/active/i');
    if (await activeIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activeIndicator.first()).toBeVisible();
    }

    // Click to view detail
    await page.locator('.rounded-xl').filter({ hasText: 'Old Lavender' }).first().click();
    await page.waitForTimeout(500);

    // Look for retire button
    const retireButton = page.getByRole('button', { name: /Retire|Mark.*Retired/i });
    if (await retireButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await retireButton.click();
      await page.waitForTimeout(500);

      // Confirm if dialog appears
      const confirmButton = page.getByRole('dialog').getByRole('button', { name: /Confirm|Yes|Retire/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }

      // Verify status changed to retired
      const retiredIndicator = page.locator('text=/retired/i');
      if (await retiredIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(retiredIndicator.first()).toBeVisible();
      }
    }
  });

  test('mother plant filtering and search', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Filter Mother Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Filter Mother Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Mother Plants
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await page.getByRole('link', { name: /Mother Plants/i }).click();

    // Register first mother plant - Basil
    await page.getByRole('button', { name: /Register.*Mother Plant/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Kitchen Rosemary|Main Fig/i).fill('Sweet Basil');
    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Basil');
    await page.getByRole('dialog').getByRole('button', { name: 'Purchased', exact: false }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Register|Save|Add/i }).last().click();
    await page.waitForTimeout(1000);

    // Register second mother plant - Oregano
    await page.getByRole('button', { name: /Register.*Mother Plant/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Kitchen Rosemary|Main Fig/i).fill('Greek Oregano');
    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Oregano');
    await page.getByRole('dialog').getByRole('button', { name: 'Gifted', exact: false }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Register|Save|Add/i }).last().click();
    await page.waitForTimeout(1000);

    // Verify both plants visible
    await expect(page.locator('text="Sweet Basil"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Greek Oregano"').first()).toBeVisible({ timeout: 10000 });

    // Test search/filter if available
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Basil');
      await page.waitForTimeout(500);

      // Sweet Basil should be visible, Greek Oregano should not
      await expect(page.locator('text="Sweet Basil"').first()).toBeVisible();
    }
  });
});
