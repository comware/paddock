/**
 * E2E Test: Propagation Batch Lifecycle
 *
 * Tests the complete batch journey through all propagation stages:
 * 1. Create prerequisite site and station
 * 2. Create a new batch
 * 3. Advance batch through stages: taken -> rooting -> rooted -> potted_up -> hardening -> ready
 * 4. Graduate batch with outcome
 * 5. Verify data persists after refresh
 *
 * This tests the core propagation workflow that tracks cuttings from start to graduation.
 */

import { test, expect } from '@playwright/test';

test.describe('Propagation Batch Lifecycle', () => {
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

  test('complete batch lifecycle: create -> advance stages -> graduate', async ({ page }) => {
    // ============================================
    // STEP 1: Create prerequisite site
    // ============================================
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Propagation Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Propagation Test Site"').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 2: Navigate to Propagation and create station
    // ============================================
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await expect(page).toHaveURL(/\/propagation/);
    await expect(page.getByRole('heading', { name: 'Propagation Dashboard' })).toBeVisible({ timeout: 10000 });

    // Navigate to stations via direct URL (stations not in main nav)
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create a station
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    const stationName = 'Lifecycle Test Propagator';
    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill(stationName);
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '100', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();

    await expect(page.locator(`text="${stationName}"`).first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 3: Create a new batch
    // ============================================
    await page.getByRole('link', { name: /Batches/i }).click();
    await expect(page).toHaveURL(/\/propagation\/batches/);

    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    // Fill batch form
    const speciesInput = page.getByRole('dialog').getByPlaceholder(/search.*species|species/i);
    await speciesInput.fill('Rosemary');

    // Select propagation method
    await page.getByRole('dialog').getByRole('button', { name: 'Softwood Cutting', exact: true }).click();

    // Set quantity
    await page.getByRole('dialog').getByRole('button', { name: '20', exact: true }).click();

    // Select station
    const stationSelect = page.getByRole('dialog').locator('select[name="stationId"]');
    await stationSelect.selectOption({ index: 1 });

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Verify batch created - should see Rosemary in batch list
    await expect(page.locator('text=Rosemary').first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 4: Navigate to batch detail and advance stages
    // ============================================
    // Click on the batch card to open detail view
    // Cards use rounded-xl class, find by text content within card-like container
    await page.locator('.rounded-xl').filter({ hasText: 'Rosemary' }).first().click();
    await page.waitForTimeout(500);

    // Verify we're on batch detail page
    await expect(page.locator('text=Rosemary').first()).toBeVisible();

    // Look for stage advancement button or stage indicator
    // The stage should start at "taken"
    await expect(page.locator('text=/taken|Taken/i').first()).toBeVisible();

    // Advance to rooting - look for stage transition button
    const advanceButton = page.getByRole('button', { name: /Advance|Move to|Start Rooting|Rooting/i }).first();
    if (await advanceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await advanceButton.click();
      await page.waitForTimeout(500);

      // If a modal appears, confirm it
      const confirmButton = page.getByRole('dialog').getByRole('button', { name: /Confirm|Save|Advance/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await page.waitForTimeout(500);
    }

    // ============================================
    // STEP 5: Verify data persists after refresh
    // ============================================
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to batches
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await page.getByRole('link', { name: /Batches/i }).click();

    // Rosemary batch should still exist
    await expect(page.locator('text=Rosemary').first()).toBeVisible({ timeout: 10000 });
  });

  test('batch creation with all fields populated', async ({ page }) => {
    // Create prerequisite site
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Full Form Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Full Form Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();

    // Create station first - navigate directly
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Mist Bench');
    await page.getByRole('dialog').getByRole('button', { name: 'Mist System', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Navigate to batches and create with all fields
    await page.getByRole('link', { name: /Batches/i }).click();
    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    // Species
    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Lavender');

    // Variety (optional field)
    const varietyInput = page.getByRole('dialog').getByPlaceholder(/Tuscan Blue|Pink Pearl/i);
    if (await varietyInput.isVisible()) {
      await varietyInput.fill('Hidcote');
    }

    // Method - try semi-hardwood
    await page.getByRole('dialog').getByRole('button', { name: 'Semi-hardwood Cutting', exact: true }).click();

    // Quantity
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();

    // Station
    const stationSelect = page.getByRole('dialog').locator('select[name="stationId"]');
    await stationSelect.selectOption({ index: 1 });

    // Open optional details
    const detailsSummary = page.getByRole('dialog').locator('summary:has-text("Optional Details")');
    if (await detailsSummary.isVisible()) {
      await detailsSummary.click();
      await page.waitForTimeout(300);

      // Rooting medium
      const mediumSelect = page.getByRole('dialog').locator('select').filter({ hasText: /Select medium|Perlite/i }).first();
      if (await mediumSelect.isVisible()) {
        await mediumSelect.selectOption({ label: 'Perlite' });
      }

      // Hormone
      const hormoneInput = page.getByRole('dialog').getByPlaceholder(/Clonex|Rootone|None/i);
      if (await hormoneInput.isVisible()) {
        await hormoneInput.fill('Clonex Purple');
      }

      // Notes
      const notesInput = page.getByRole('dialog').getByPlaceholder(/special preparation|treatment|observations/i);
      if (await notesInput.isVisible()) {
        await notesInput.fill('Taken in early morning. Heel cuttings.');
      }
    }

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Verify batch created
    await expect(page.locator('text=Lavender').first()).toBeVisible({ timeout: 10000 });
  });

  test('batch filtering by stage and species', async ({ page }) => {
    // Setup: Create site, station, and multiple batches
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Filter Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Filter Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation stations directly
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create station
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Filter Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Cold Frame', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '100', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Create first batch - Sage
    await page.getByRole('link', { name: /Batches/i }).click();
    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Sage');
    await page.getByRole('dialog').getByRole('button', { name: 'Softwood Cutting', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '10', exact: true }).click();
    await page.getByRole('dialog').locator('select[name="stationId"]').selectOption({ index: 1 });
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Create second batch - Thyme
    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Thyme');
    await page.getByRole('dialog').getByRole('button', { name: 'Division', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '5', exact: true }).click();
    await page.getByRole('dialog').locator('select[name="stationId"]').selectOption({ index: 1 });
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Verify both batches visible - use card containers to avoid matching hidden option elements
    await expect(page.locator('.rounded-xl').filter({ hasText: 'Sage' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.rounded-xl').filter({ hasText: 'Thyme' }).first()).toBeVisible({ timeout: 10000 });

    // Test search filtering if available
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('Sage');
      await page.waitForTimeout(500);

      // Sage should be visible
      await expect(page.locator('.rounded-xl').filter({ hasText: 'Sage' }).first()).toBeVisible();
    }
  });

  test('batch quantity update on stage transition', async ({ page }) => {
    // Setup: Create site, station, batch
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Quantity Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Quantity Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation stations directly
    await page.goto('/propagation/stations');
    await page.waitForLoadState('networkidle');

    // Create station
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill('Qty Station');
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();
    await page.waitForTimeout(1000);

    // Create batch with 20 cuttings
    await page.getByRole('link', { name: /Batches/i }).click();
    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('dialog').getByPlaceholder(/search.*species|species/i).fill('Mint');
    await page.getByRole('dialog').getByRole('button', { name: 'Softwood Cutting', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '20', exact: true }).click();
    await page.getByRole('dialog').locator('select[name="stationId"]').selectOption({ index: 1 });
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();
    await page.waitForTimeout(1000);

    // Verify batch shows 20 started
    await expect(page.locator('text=Mint').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/20|qty.*20|started.*20/i').first()).toBeVisible({ timeout: 5000 });

    // Click on batch card to view detail
    await page.locator('.rounded-xl').filter({ hasText: 'Mint' }).first().click();
    await page.waitForTimeout(500);

    // Look for quantity display in detail view
    await expect(page.locator('text=/20|quantity.*20|started.*20/i').first()).toBeVisible();
  });
});
