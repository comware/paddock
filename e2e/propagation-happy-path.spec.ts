/**
 * E2E Test: Propagation Module Happy Path
 *
 * Tests the critical user journey for the Propagation module:
 * 1. Set up a site first (prerequisite)
 * 2. Navigate to Propagation module
 * 3. Create a new station
 * 4. Create a new batch
 * 5. Verify data persists after refresh
 */

import { test, expect } from '@playwright/test';

test.describe('Propagation Module Happy Path', () => {
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

  test('complete workflow: create site -> create station -> create batch -> verify persistence', async ({ page }) => {
    // 0. First, create a site (prerequisite for propagation module)
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    // Create a site
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Main Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Main Site"').first()).toBeVisible({ timeout: 10000 });

    // 1. Now navigate to Propagation module
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await expect(page).toHaveURL(/\/propagation/);

    // Should see the dashboard heading
    await expect(page.getByRole('heading', { name: 'Propagation Dashboard' })).toBeVisible({ timeout: 10000 });

    // 2. Navigate to stations page and create a station
    await page.getByRole('button', { name: '# Stations' }).click();
    await expect(page).toHaveURL(/\/propagation\/stations/);

    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    // Fill in station form
    const stationName = 'Test Propagator E2E';
    await page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i).fill(stationName);

    // Select station type (use exact: true to avoid matching multiple buttons)
    await page.getByRole('dialog').getByRole('button', { name: 'Heated Propagator', exact: true }).click();

    // Set capacity using quick select button
    await page.getByRole('dialog').getByRole('button', { name: '50', exact: true }).click();

    // Submit the form
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();

    // Wait for modal to close and verify station was created
    await expect(page.locator(`text="${stationName}"`).first()).toBeVisible({ timeout: 10000 });

    // 3. Navigate to batches page (not dashboard) to create a batch
    await page.getByRole('link', { name: /📋.*Batches/i }).click();
    await expect(page).toHaveURL(/\/propagation\/batches/);

    // Click "New Batch" button on the batches page (this opens a modal)
    await page.getByRole('button', { name: /New Batch/i }).click();
    await page.waitForTimeout(500);

    // Fill in batch form - species/plant name
    const speciesInput = page.getByRole('dialog').getByPlaceholder(/search.*species|species/i);
    await speciesInput.fill('Lavender');

    // Select propagation method by clicking a method button
    await page.getByRole('dialog').getByRole('button', { name: 'Softwood Cutting', exact: true }).click();

    // Set quantity using quick select button (10 should already be selected based on context)
    // Quantity is already 10 from the UI context

    // Select the station we created - it's in a select dropdown
    // The station name includes the type in parentheses, so select by index (first non-placeholder option)
    const stationSelect = page.getByRole('dialog').locator('select[name="stationId"]');
    await stationSelect.selectOption({ index: 1 }); // Select first actual option after placeholder

    // Submit the form
    await page.getByRole('dialog').getByRole('button', { name: 'Create Batch' }).click();

    // Wait for modal to close
    await page.waitForTimeout(1000);

    // Verify batch was created
    await expect(page.locator('text=Lavender').first()).toBeVisible({ timeout: 10000 });

    // 4. Verify data persists after refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Lavender batch should still be visible
    await expect(page.locator('text=Lavender').first()).toBeVisible({ timeout: 10000 });

    // Navigate to stations to verify station persists
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await page.getByRole('button', { name: '# Stations' }).click();
    await expect(page.locator(`text="${stationName}"`).first()).toBeVisible({ timeout: 10000 });
  });

  test('station creation with form validation', async ({ page }) => {
    // First, create a site (prerequisite)
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Propagation module
    await page.getByRole('navigation').getByRole('link', { name: /🪴.*Propagation/i }).click();
    await expect(page).toHaveURL(/\/propagation/);

    // Navigate to stations page
    await page.getByRole('button', { name: '# Stations' }).click();
    await expect(page).toHaveURL(/\/propagation\/stations/);

    // Click new station button
    await page.getByRole('button', { name: /New Station/i }).click();
    await page.waitForTimeout(500);

    // Ensure name is empty
    const nameInput = page.getByRole('dialog').getByPlaceholder(/Main Propagator|South Bench/i);
    await nameInput.clear();

    // Try to submit empty form
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();

    // Should show validation error for required name field
    await expect(page.getByText(/Name is required|required/i).first()).toBeVisible({ timeout: 5000 });

    // Fill in valid data
    await nameInput.fill('Valid Station');

    // Select type by clicking button
    await page.getByRole('dialog').getByRole('button', { name: 'Cold Frame', exact: true }).click();

    // Set capacity using quick select
    await page.getByRole('dialog').getByRole('button', { name: '25', exact: true }).click();

    // Submit should now work
    await page.getByRole('dialog').getByRole('button', { name: 'Create Station' }).click();

    // Modal should close and station should appear
    await expect(page.locator('text="Valid Station"').first()).toBeVisible({ timeout: 10000 });
  });
});
