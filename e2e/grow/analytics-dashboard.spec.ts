/**
 * E2E Test: Analytics Dashboard
 *
 * Tests the analytics page functionality:
 * 1. Navigate to analytics page
 * 2. Verify dashboard loads without errors
 * 3. Test empty state rendering
 * 4. Create data and verify charts update
 * 5. Test tab switching between Variety and Trends views
 *
 * Analytics provide insights into microgreens performance over time.
 */

import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
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

  test('analytics page loads and shows empty state', async ({ page }) => {
    // First create a site (required to access site-specific analytics)
    await page.goto('/grow');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Analytics Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Analytics Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Enter site and navigate to analytics
    await page.getByText('Analytics Test Site').first().click();
    await expect(page).toHaveURL(/\/grow\/site\//);

    // Navigate to Analytics tab (use specific site analytics link)
    await page.getByRole('link', { name: '📈 Analytics' }).click();
    await expect(page).toHaveURL(/\/analytics/);

    // Page should load without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('Something went wrong');

    // Should show tab buttons for By Variety and Trends
    await expect(page.getByRole('button', { name: 'By Variety' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Trends' })).toBeVisible();

    // With no data, should show empty state message
    await expect(page.locator('text=/No variety data yet|Harvest some trays/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('tab switching between Variety and Trends views', async ({ page }) => {
    // Create site and navigate to analytics
    await page.goto('/grow');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Tab Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Tab Test Site"').first()).toBeVisible({ timeout: 10000 });

    await page.getByText('Tab Test Site').first().click();
    await page.getByRole('link', { name: '📈 Analytics' }).click();

    // By Variety should be selected by default (active styling)
    const varietyTab = page.getByRole('button', { name: 'By Variety' });
    const trendsTab = page.getByRole('button', { name: 'Trends' });

    await expect(varietyTab).toBeVisible();
    await expect(trendsTab).toBeVisible();

    // Click Trends tab
    await trendsTab.click();
    await page.waitForTimeout(300);

    // Should show Trends content (Experiment Progress heading)
    await expect(page.locator('text=/Experiment Progress/i').first()).toBeVisible({ timeout: 5000 });

    // Switch back to Variety
    await varietyTab.click();
    await page.waitForTimeout(300);

    // Should show Variety content (empty state or variety table)
    await expect(page.locator('text=/No variety data yet|Variety Performance/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('trends view shows experiment progress metrics', async ({ page }) => {
    // Create site and navigate to analytics
    await page.goto('/grow');

    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Trends Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Trends Test Site"').first()).toBeVisible({ timeout: 10000 });

    await page.getByText('Trends Test Site').first().click();
    await page.getByRole('link', { name: '📈 Analytics' }).click();

    // Switch to Trends view
    await page.getByRole('button', { name: 'Trends' }).click();
    await page.waitForTimeout(300);

    // Should show experiment progress section
    await expect(page.locator('text=/Experiment Progress/i').first()).toBeVisible({ timeout: 5000 });

    // Should show stat cards
    await expect(page.locator('text=/Days Elapsed/i').first()).toBeVisible();
    await expect(page.locator('text=/Trays Completed/i').first()).toBeVisible();
    await expect(page.locator('text=/Success Rate/i').first()).toBeVisible();

    // Should show progress bar to Week 6
    await expect(page.locator('text=/Progress to Week 6/i').first()).toBeVisible();
  });

  test('global analytics route accessible', async ({ page }) => {
    // Global analytics at /grow/analytics (cross-site view)
    await page.goto('/grow');

    // Create a site first
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Global Analytics Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Global Analytics Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate directly to global analytics
    await page.goto('/grow/analytics');
    await page.waitForLoadState('networkidle');

    // Should load analytics page
    await expect(page.locator('body')).not.toContainText('Error');

    // Should show tab buttons
    await expect(page.getByRole('button', { name: 'By Variety' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Trends' })).toBeVisible();
  });

  test('analytics page renders after creating tray', async ({ page }) => {
    // This test creates a tray and verifies analytics page still works
    await page.goto('/grow');

    // Create site
    const addSiteButton = page.locator('button:has-text("Add Site"), button:has-text("Add Your First Site")').first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Full Analytics Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Full Analytics Site"').first()).toBeVisible({ timeout: 10000 });

    // Enter site and create a tray
    await page.getByText('Full Analytics Site').first().click();
    await page.getByRole('link', { name: /Trays/ }).click();
    await page.getByRole('button', { name: /New Tray/ }).click();
    await page.waitForTimeout(500);

    const varietySelect = page.getByRole('dialog').getByRole('combobox').first();
    await expect(varietySelect).toBeEnabled({ timeout: 10000 });
    await varietySelect.selectOption({ label: 'Sunflower' });
    await page.getByRole('dialog').getByRole('button', { name: /Save Tray/ }).click();
    await page.waitForTimeout(1000);

    // Verify tray was created
    await expect(page.locator('text=/Sunflower/i').first()).toBeVisible({ timeout: 5000 });

    // Navigate to analytics
    await page.getByRole('link', { name: '📈 Analytics' }).click();
    await expect(page).toHaveURL(/\/analytics/);

    // Page should load without errors
    await expect(page.locator('body')).not.toContainText('Error');

    // Should show tabs (with or without data)
    await expect(page.getByRole('button', { name: 'By Variety' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Trends' })).toBeVisible();
  });
});
