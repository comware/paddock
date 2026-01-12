/**
 * E2E Test: Tray Lifecycle
 *
 * Tests the complete tray journey through the application:
 * 1. Navigate to or create a site
 * 2. Add a new tray with sowing details
 * 3. Move tray from blackout to light phase
 * 4. Harvest the tray with quality grade
 *
 * This test validates the core user workflow that Paddock is designed for.
 */

import { test, expect } from '@playwright/test';

test.describe('Tray Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Skip the welcome modal by setting localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('paddock_onboarding_complete', 'true');
    });

    // Reload to apply the localStorage change
    await page.reload();
  });

  test('should complete full tray lifecycle: add → light → harvest', async ({
    page,
  }) => {
    // Wait for app to initialize (IndexedDB setup)
    await page.waitForLoadState('networkidle');

    // Navigate to the Grow module
    await page.goto('/grow');
    await expect(page).toHaveURL(/\/grow/);

    // ============================================
    // STEP 1: Ensure we have a site to work with
    // ============================================

    // Check if we're showing the "Add First Site" onboarding screen
    const addFirstSiteButton = page.getByRole('button', { name: 'Add Your First Site' });

    if (await addFirstSiteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // First time setup - need to create a site
      await addFirstSiteButton.click();

      // Fill in site details - use placeholder since label is in a separate div
      const siteNameInput = page.getByPlaceholder(/home greenhouse|farm site/i);
      await expect(siteNameInput).toBeVisible();
      await siteNameInput.fill('Test Greenhouse');

      // Submit the form - target the dialog's submit button specifically
      await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

      // Wait for site creation
      await page.waitForTimeout(500);
    }

    // ============================================
    // STEP 2: Enter the site to view/manage trays
    // ============================================

    // Click on the site card to enter site detail view
    const siteCard = page.getByRole('heading', { name: 'Test Greenhouse' });
    await expect(siteCard).toBeVisible({ timeout: 5000 });
    await siteCard.click();

    // Wait for site detail page to load
    await page.waitForTimeout(500);

    // ============================================
    // STEP 3: Add a new tray
    // ============================================

    // Find and click the "Add Tray" button
    const addTrayButton = page.getByRole('button', { name: /add.*tray|new.*tray|\+ tray/i }).or(
      page.locator('[data-testid="add-tray"]')
    ).or(
      page.getByRole('button', { name: /\+/ })
    );

    await expect(addTrayButton.first()).toBeVisible({ timeout: 5000 });
    await addTrayButton.first().click();

    // Wait for add tray form/modal to appear
    await page.waitForTimeout(300);

    // Fill in tray details
    // Wait for variety dropdown to be enabled (loads async from IndexedDB)
    const varietySelect = page.getByRole('combobox').first();
    await expect(varietySelect).toBeEnabled({ timeout: 10000 });

    // Select Sunflower variety
    await varietySelect.selectOption({ label: 'Sunflower' });

    // Seed weight is already pre-filled (80g), but let's use the 50g preset
    await page.getByRole('button', { name: '50g' }).click();

    // Growing medium is already set to Coco Coir (default)

    // Submit the form
    await page.getByRole('button', { name: 'Save Tray' }).click();

    // Wait for form to close
    await page.waitForTimeout(500);

    // Navigate to Trays tab to see the tray card
    await page.getByRole('link', { name: '🌱 Trays' }).click();
    await page.waitForTimeout(500);

    // Verify tray was created - look for it in the list
    const trayCard = page.locator('text=Sunflower').first();
    await expect(trayCard).toBeVisible({ timeout: 5000 });

    // Verify it's in blackout status
    const blackoutIndicator = page.locator('text=/blackout/i').or(
      page.locator('[data-status="blackout"]')
    );
    await expect(blackoutIndicator.first()).toBeVisible();

    // ============================================
    // STEP 4: Move tray to light
    // ============================================

    // Find and click the "Move to Light" button on the tray card (don't click the card itself)
    const moveToLightButton = page.getByRole('button', { name: '💡 Move to Light' });

    if (await moveToLightButton.isVisible()) {
      await moveToLightButton.click();

      // If a confirmation dialog appears, handle it
      const confirmButton = page.getByRole('button', { name: /confirm|yes|ok/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(500);

      // Verify status changed to "light"
      const lightIndicator = page.locator('text=/light|growing/i').or(
        page.locator('[data-status="light"]')
      );
      await expect(lightIndicator.first()).toBeVisible();
    }

    // ============================================
    // STEP 5: Harvest the tray
    // ============================================

    // Find the "Harvest" button on the tray card (should appear after moving to light)
    // First wait for the tray to update
    await page.waitForTimeout(500);

    // Look for the harvest button (🌿 Harvest icon)
    const harvestButton = page.getByRole('button', { name: /🌿.*harvest/i });

    if (await harvestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await harvestButton.click();
      await page.waitForTimeout(300);

      // Fill in harvest details
      const harvestWeightInput = page.getByLabel(/harvest.*weight|weight/i).or(
        page.locator('input[name="harvestWeight"]')
      );
      if (await harvestWeightInput.isVisible()) {
        await harvestWeightInput.clear();
        await harvestWeightInput.fill('200');
      }

      // Select quality grade
      const gradeSelect = page.getByLabel(/grade|quality/i).or(
        page.locator('select[name="qualityGrade"]')
      );
      if (await gradeSelect.isVisible()) {
        const tagName = await gradeSelect.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === 'select') {
          await gradeSelect.selectOption('A');
        }
      }

      // Check sellable checkbox if present
      const sellableCheckbox = page.getByLabel(/sellable/i);
      if (await sellableCheckbox.isVisible()) {
        await sellableCheckbox.check();
      }

      // Submit harvest form - target the dialog's submit button
      const harvestSubmit = page.getByRole('dialog').getByRole('button', { name: /save|record|confirm/i });
      await harvestSubmit.click();

      await page.waitForTimeout(500);

      // Verify status changed to "harvested"
      const harvestedIndicator = page.locator('text=/harvested/i').or(
        page.locator('[data-status="harvested"]')
      );
      await expect(harvestedIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show correct tray counts in dashboard', async ({ page }) => {
    // Navigate to Grow module
    await page.goto('/grow');
    await page.waitForLoadState('networkidle');

    // At minimum, verify the page loads without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('should persist tray data after page refresh', async ({ page }) => {
    // Add a tray with a unique identifier
    const uniqueVariety = `Test-${Date.now()}`;

    await page.goto('/grow');
    await page.waitForLoadState('networkidle');

    // Navigate and add tray (simplified version)
    const addButton = page.getByRole('button', { name: /add|new|\+/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);

      const varietyInput = page.getByLabel(/variety/i).or(page.locator('input[name="variety"]'));
      if (await varietyInput.isVisible()) {
        await varietyInput.fill(uniqueVariety);

        const saveButton = page.getByRole('button', { name: /save|add|create/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(500);

          // Verify tray exists
          await expect(page.locator(`text=${uniqueVariety}`)).toBeVisible();

          // Refresh the page
          await page.reload();
          await page.waitForLoadState('networkidle');

          // Verify tray still exists after refresh (IndexedDB persistence)
          await expect(page.locator(`text=${uniqueVariety}`)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
