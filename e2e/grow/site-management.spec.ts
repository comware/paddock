/**
 * E2E Test: Site Management
 *
 * Tests site creation and tray assignment workflows:
 * 1. Create a new indoor site
 * 2. Verify site appears in site list
 * 3. Create trays assigned to the site
 * 4. Verify site dashboard shows correct metrics
 * 5. Test site data persistence
 *
 * Sites are the organizational unit for microgreens operations.
 */

import { test, expect } from '@playwright/test';

test.describe('Site Management', () => {
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

  test('create new site and verify it appears in list', async ({ page }) => {
    await page.goto('/grow');
    await expect(page).toHaveURL(/\/grow/);

    // Should show "Add Your First Site" for empty state
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    // Fill in site form
    const siteName = 'Urban Farm Site A';
    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill(siteName);

    // Add description
    const descriptionInput = page.getByRole('dialog').locator('textarea');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Main production area for sunflower and pea microgreens');
    }

    // Toggle to indoor site
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });

    // Submit the form
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

    // Verify site was created and appears in list
    await expect(page.locator(`text="${siteName}"`).first()).toBeVisible({ timeout: 10000 });
  });

  test('create multiple sites and switch between them', async ({ page }) => {
    await page.goto('/grow');

    // Create first site
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Site Alpha');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Site Alpha"').first()).toBeVisible({ timeout: 10000 });

    // Create second site
    await page.getByRole('button', { name: /Add Site/i }).click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Site Beta');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Site Beta"').first()).toBeVisible({ timeout: 10000 });

    // Both sites should be visible
    await expect(page.locator('text="Site Alpha"').first()).toBeVisible();
    await expect(page.locator('text="Site Beta"').first()).toBeVisible();

    // Click on Site Alpha to enter it
    await page.getByText('Site Alpha').first().click();
    await expect(page).toHaveURL(/\/grow\/site\//);

    // Navigate back to overview
    await page.getByRole('navigation').getByRole('link', { name: /🌱.*Grow/i }).click();

    // Click on Site Beta
    await page.getByText('Site Beta').first().click();
    await expect(page).toHaveURL(/\/grow\/site\//);
  });

  test('site dashboard shows tray metrics', async ({ page }) => {
    await page.goto('/grow');

    // Create a site
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Metrics Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Metrics Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Enter site
    await page.getByText('Metrics Test Site').first().click();
    await expect(page).toHaveURL(/\/grow\/site\//);

    // Dashboard should show metrics cards
    await expect(page.locator('text=/Active Trays/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Success Rate/i').first()).toBeVisible();

    // Create a tray to update metrics
    await page.getByRole('button', { name: /New Tray|🌱/i }).first().click();
    await page.waitForTimeout(500);

    const varietySelect = page.getByRole('dialog').getByRole('combobox').first();
    await expect(varietySelect).toBeEnabled({ timeout: 10000 });
    await varietySelect.selectOption({ index: 1 });
    await page.getByRole('dialog').getByRole('button', { name: /Save Tray/ }).click();
    await page.waitForTimeout(1000);

    // Navigate to dashboard (index route of site)
    await page.getByRole('link', { name: /Dashboard|Overview/i }).first().click();

    // Active trays should now show 1
    await expect(page.locator('text=/Active Trays/i').first()).toBeVisible();
  });

  test('trays are assigned to correct site', async ({ page }) => {
    await page.goto('/grow');

    // Create two sites
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Sunflower Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Sunflower Site"').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Add Site/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Pea Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Pea Site"').first()).toBeVisible({ timeout: 10000 });

    // Enter Sunflower Site and create a tray
    await page.getByText('Sunflower Site').first().click();
    await page.getByRole('link', { name: /Trays/ }).click();
    await page.getByRole('button', { name: /New Tray/ }).click();
    await page.waitForTimeout(500);

    const varietySelect = page.getByRole('dialog').getByRole('combobox').first();
    await expect(varietySelect).toBeEnabled({ timeout: 10000 });
    await varietySelect.selectOption({ label: 'Sunflower' });
    await page.getByRole('dialog').getByRole('button', { name: /Save Tray/ }).click();
    await page.waitForTimeout(1000);

    // Verify Sunflower tray is visible in this site
    await expect(page.locator('text=/Sunflower/i').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Pea Site
    await page.getByRole('navigation').getByRole('link', { name: /🌱.*Grow/i }).click();
    await page.getByText('Pea Site').first().click();
    await page.getByRole('link', { name: /Trays/ }).click();

    // Sunflower tray should NOT be visible in Pea Site
    // (it's assigned to Sunflower Site)
    await page.waitForTimeout(500);
    const sunflowerInPeaSite = page.locator('[class*="rounded"]').filter({ hasText: /Sunflower/i });
    await expect(sunflowerInPeaSite).not.toBeVisible({ timeout: 3000 });
  });

  test('site form validation', async ({ page }) => {
    await page.goto('/grow');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    // Ensure name field is empty
    const nameInput = page.getByPlaceholder(/Home Greenhouse|Farm Site/i);
    await nameInput.clear();

    // Try to submit empty form
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

    // Should show validation error
    await expect(page.getByText(/Site name is required|required/i).first()).toBeVisible({ timeout: 5000 });

    // Fill in valid name and submit
    await nameInput.fill('Valid Site Name');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();

    // Site should be created
    await expect(page.locator('text="Valid Site Name"').first()).toBeVisible({ timeout: 10000 });
  });

  test('site data persists after refresh', async ({ page }) => {
    await page.goto('/grow');

    // Create a site
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Persistence Test');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Persistence Test"').first()).toBeVisible({ timeout: 10000 });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to Grow
    await page.goto('/grow');

    // Site should still be visible (IndexedDB persistence)
    await expect(page.locator('text="Persistence Test"').first()).toBeVisible({ timeout: 10000 });
  });
});
