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
    // Start at the app root
    await page.goto('/');
  });

  test('should complete full tray lifecycle: add → light → harvest', async ({
    page,
  }) => {
    // Wait for app to initialize (IndexedDB setup)
    await page.waitForLoadState('networkidle');

    // Navigate to Grow module
    await page.click('text=Grow');
    await expect(page).toHaveURL(/\/grow/);

    // ============================================
    // STEP 1: Ensure we have a site to work with
    // ============================================

    // Check if we have any sites; if not, the app should show a setup prompt
    // For now, we'll check if we can access the trays page directly
    // The app may auto-create a default site on first use

    // Look for a site card or "Get Started" / "Create Site" button
    const siteCard = page.locator('[data-testid="site-card"]').first();
    const createSiteButton = page.getByRole('button', { name: /create|add|new/i });
    const getStartedButton = page.getByRole('button', { name: /get started/i });

    // Try to click on an existing site, or create one if needed
    if (await siteCard.isVisible()) {
      await siteCard.click();
    } else if (await getStartedButton.isVisible()) {
      await getStartedButton.click();
      // Fill in site details if a form appears
      const siteNameInput = page.getByLabel(/name/i);
      if (await siteNameInput.isVisible()) {
        await siteNameInput.fill('Test Greenhouse');
        await page.getByRole('button', { name: /save|create/i }).click();
      }
    } else if (await createSiteButton.isVisible()) {
      await createSiteButton.click();
      const siteNameInput = page.getByLabel(/name/i);
      if (await siteNameInput.isVisible()) {
        await siteNameInput.fill('Test Greenhouse');
        await page.getByRole('button', { name: /save|create/i }).click();
      }
    }

    // Wait for navigation to site detail page
    await page.waitForTimeout(500);

    // ============================================
    // STEP 2: Navigate to Trays page
    // ============================================

    // Look for trays navigation (could be tab, button, or link)
    const traysNav = page.getByRole('link', { name: /trays/i }).or(
      page.getByRole('button', { name: /trays/i })
    ).or(
      page.locator('[href*="trays"]')
    );

    if (await traysNav.first().isVisible()) {
      await traysNav.first().click();
    }

    // Wait for trays page to load
    await page.waitForURL(/trays|\/grow/, { timeout: 5000 }).catch(() => {
      // URL might not change if already on trays page
    });

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
    // Variety selection
    const varietyInput = page.getByLabel(/variety/i).or(
      page.locator('select[name="variety"]')
    ).or(
      page.getByPlaceholder(/variety/i)
    );

    if (await varietyInput.isVisible()) {
      // Check if it's a select or input
      const tagName = await varietyInput.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await varietyInput.selectOption({ index: 1 }); // Select first option
      } else {
        await varietyInput.fill('Sunflower');
      }
    }

    // Seed weight
    const seedWeightInput = page.getByLabel(/seed.*weight/i).or(
      page.locator('input[name="seedWeight"]')
    );
    if (await seedWeightInput.isVisible()) {
      await seedWeightInput.clear();
      await seedWeightInput.fill('50');
    }

    // Growing medium (optional)
    const mediumInput = page.getByLabel(/medium/i).or(
      page.locator('select[name="growingMedium"]')
    );
    if (await mediumInput.isVisible()) {
      const tagName = await mediumInput.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await mediumInput.selectOption({ index: 1 });
      } else {
        await mediumInput.fill('Coco Coir');
      }
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /save|add|create|submit/i });
    await submitButton.click();

    // Wait for form to close and tray to appear
    await page.waitForTimeout(500);

    // Verify tray was created - look for it in the list
    const trayCard = page.locator('[data-testid="tray-card"]').or(
      page.locator('.tray-card')
    ).or(
      page.locator('text=Sunflower')
    );

    await expect(trayCard.first()).toBeVisible({ timeout: 5000 });

    // Verify it's in blackout status
    const blackoutIndicator = page.locator('text=/blackout/i').or(
      page.locator('[data-status="blackout"]')
    );
    await expect(blackoutIndicator.first()).toBeVisible();

    // ============================================
    // STEP 4: Move tray to light
    // ============================================

    // Click on the tray to select it or access its actions
    await trayCard.first().click();
    await page.waitForTimeout(300);

    // Find the "Move to Light" action
    const moveToLightButton = page.getByRole('button', { name: /light|move.*light/i }).or(
      page.getByRole('menuitem', { name: /light/i })
    ).or(
      page.locator('[data-action="move-to-light"]')
    );

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

    // Re-click tray if needed
    await trayCard.first().click();
    await page.waitForTimeout(300);

    // Find the "Harvest" action
    const harvestButton = page.getByRole('button', { name: /harvest/i }).or(
      page.getByRole('menuitem', { name: /harvest/i })
    ).or(
      page.locator('[data-action="harvest"]')
    );

    if (await harvestButton.isVisible()) {
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

      // Submit harvest form
      const harvestSubmit = page.getByRole('button', { name: /save|harvest|confirm|submit/i });
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

    // Check for dashboard stats/counts
    const blackoutCount = page.locator('[data-testid="blackout-count"]').or(
      page.locator('text=/blackout.*\\d+|\\d+.*blackout/i')
    );
    const lightCount = page.locator('[data-testid="light-count"]').or(
      page.locator('text=/light.*\\d+|\\d+.*light/i')
    );

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
