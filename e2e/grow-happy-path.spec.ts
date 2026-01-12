/**
 * E2E Test: Grow Module Happy Path
 *
 * Tests the critical user journey for the Grow module:
 * 1. Navigate to Grow module
 * 2. Create a new site (indoor to avoid geo requirements)
 * 3. Create a new tray with variety
 * 4. Verify data persists after refresh
 */

import { test, expect } from '@playwright/test';

test.describe('Grow Module Happy Path', () => {
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

  test('complete workflow: create site -> create tray -> verify persistence', async ({ page }) => {
    // 1. Navigate to Grow module from landing page
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    // 2. Create a new site
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    // Fill in site form
    const siteName = 'Test Greenhouse E2E';
    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill(siteName);

    // Toggle to indoor site using force option for sr-only checkbox
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });

    // Submit the form
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

    // Wait for modal to close and verify site was created (use first() for multiple matches)
    await expect(page.locator(`text="${siteName}"`).first()).toBeVisible({ timeout: 10000 });

    // 3. Click on the site card to navigate to it
    await page.getByText(siteName).first().click();
    await expect(page).toHaveURL(/\/grow\/site\//);

    // 4. Navigate to Trays tab
    await page.getByRole('link', { name: /Trays/ }).click();
    await expect(page).toHaveURL(/\/trays/);

    // 5. Create a new tray
    await page.getByRole('button', { name: /New Tray/ }).click();
    await page.waitForTimeout(500);

    // Fill in tray form - select a variety from the dropdown
    const varietySelect = page.getByRole('dialog').getByRole('combobox').first();
    await expect(varietySelect).toBeEnabled({ timeout: 10000 });
    await varietySelect.selectOption({ index: 1 }); // Select first available variety

    // Submit the form
    await page.getByRole('dialog').getByRole('button', { name: /Save Tray/ }).click();

    // Wait for modal to close
    await page.waitForTimeout(1000);

    // Verify tray was created - look for any tray indicator
    await expect(page.locator('[class*="rounded"]').filter({ hasText: /Tray|#\d+|Sunflower|Pea/i }).first()).toBeVisible({ timeout: 10000 });

    // 6. Verify data persists after refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to Grow overview using top nav
    await page.getByRole('navigation').getByRole('link', { name: /🌱.*Grow/i }).click();
    await expect(page.locator(`text="${siteName}"`).first()).toBeVisible({ timeout: 10000 });
  });

  test('site creation with form validation', async ({ page }) => {
    // Navigate to Grow module
    await page.click('a[href="/grow"]:has-text("Start Learning"), a[href="/grow"]:has-text("Begin Your Growing Journey")');
    await expect(page).toHaveURL(/\/grow/);

    // Open new site form
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    // Ensure form starts empty
    const nameInput = page.getByPlaceholder(/Home Greenhouse|Farm Site/i);
    await nameInput.clear();

    // Click submit
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

    // Should show validation error
    await expect(page.getByText('Site name is required')).toBeVisible({ timeout: 5000 });

    // Fill in valid data
    await nameInput.fill('Valid Test Site');

    // Toggle indoor using force option for sr-only checkbox
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });

    // Submit should now work
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

    // Modal should close and site should appear
    await expect(page.locator('text="Valid Test Site"').first()).toBeVisible({ timeout: 10000 });
  });
});
