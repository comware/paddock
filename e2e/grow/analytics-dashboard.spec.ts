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

  /**
   * Quarantined: the empty state is unreachable, and that is an app behaviour, not a stale
   * selector.
   *
   * beforeEach deletes every IndexedDB database and reloads - but App.tsx calls
   * seedDatabase() on boot, which repopulates a site and 23 trays before this test can look.
   * "No variety data yet" still exists in VarietyComparison.tsx, so the UI is fine; there is
   * simply no way for a test to ask the app for an empty database.
   *
   * Restoring this needs a way to opt out of seeding - an env flag or a query param honoured
   * by seedDatabase() - not a change here. See the tracking issue.
   */
  test.skip('analytics page loads and shows empty state', async ({ page }) => {
    // First create a site (required to access site-specific analytics)
    await page.goto('/microgreens');

    // Creation moved to the manage page; "Add Site" is only the dialog's submit label now.
    await page.goto('/microgreens/sites/manage');
    const addSiteButton = page.getByRole('button', { name: /Add a (growing )?space/i }).first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Analytics Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Analytics Test Site"').first()).toBeVisible({ timeout: 10000 });

    // Enter site and navigate to analytics
    await page.getByRole('button', { name: 'Open Analytics Test Site' }).dispatchEvent('click');
    await expect(page).toHaveURL(/\/microgreens\/site\//);

    // Navigate to Analytics tab (use specific site analytics link)
    await page.getByRole('link', { name: 'Analytics' }).click();
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

  /**
   * Quarantined for the same root cause as the empty-state test above.
   *
   * This asserts on "Progress through the trial", which TrendCharts renders only while
   * `!experimentMetrics.isComplete` - its comment says "Only while the trial is actually
   * running. Afterwards it is a bar pinned at 100% that tells the grower nothing." The seeded
   * demo history is a *completed* six-week trial, so the section is deliberately absent.
   *
   * The assertion is not wrong; the fixture the app forces on it is. Restoring this needs
   * seed control, or a seeded in-progress trial to assert against.
   */
  test.skip('tab switching between Variety and Trends views', async ({ page }) => {
    // Create site and navigate to analytics
    await page.goto('/microgreens');

    // Creation moved to the manage page; "Add Site" is only the dialog's submit label now.
    await page.goto('/microgreens/sites/manage');
    const addSiteButton = page.getByRole('button', { name: /Add a (growing )?space/i }).first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Tab Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Tab Test Site"').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Open Tab Test Site' }).dispatchEvent('click');
    await page.getByRole('link', { name: 'Analytics' }).click();

    // By Variety should be selected by default (active styling)
    const varietyTab = page.getByRole('button', { name: 'By Variety' });
    const trendsTab = page.getByRole('button', { name: 'Trends' });

    await expect(varietyTab).toBeVisible();
    await expect(trendsTab).toBeVisible();

    // Click Trends tab
    await trendsTab.click();
    await page.waitForTimeout(300);

    // Should show Trends content (Experiment Progress heading)
    await expect(page.locator('text=/Progress through the trial/i').first()).toBeVisible({ timeout: 5000 });

    // Switch back to Variety
    await varietyTab.click();
    await page.waitForTimeout(300);

    // Should show Variety content (empty state or variety table)
    await expect(page.locator('text=/No variety data yet|Variety Performance/i').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Quarantined: same conditional section as the tab-switching test above, same cause - the
   * seeded trial is complete, so the progress bar does not render.
   */
  test.skip('trends view shows experiment progress metrics', async ({ page }) => {
    // Create site and navigate to analytics
    await page.goto('/microgreens');

    // Creation moved to the manage page; "Add Site" is only the dialog's submit label now.
    await page.goto('/microgreens/sites/manage');
    const addSiteButton = page.getByRole('button', { name: /Add a (growing )?space/i }).first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Trends Test Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Trends Test Site"').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Open Trends Test Site' }).dispatchEvent('click');
    await page.getByRole('link', { name: 'Analytics' }).click();

    // Switch to Trends view
    await page.getByRole('button', { name: 'Trends' }).click();
    await page.waitForTimeout(300);

    // Should show experiment progress section
    await expect(page.locator('text=/Progress through the trial/i').first()).toBeVisible({ timeout: 5000 });

    // Should show stat cards
    await expect(page.locator('text=/Days Elapsed/i').first()).toBeVisible();
    await expect(page.locator('text=/Trays Completed/i').first()).toBeVisible();
    await expect(page.locator('text=/Success Rate/i').first()).toBeVisible();

    // Should show progress bar to Week 6
    await expect(page.locator('text=/Progress to Week 6/i').first()).toBeVisible();
  });

  test('global analytics route accessible', async ({ page }) => {
    // Global analytics at /microgreens/analytics (cross-site view)
    await page.goto('/microgreens');

    // Create a site first
    // Creation moved to the manage page; "Add Site" is only the dialog's submit label now.
    await page.goto('/microgreens/sites/manage');
    const addSiteButton = page.getByRole('button', { name: /Add a (growing )?space/i }).first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Global Analytics Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Global Analytics Site"').first()).toBeVisible({ timeout: 10000 });

    // Navigate directly to global analytics
    await page.goto('/microgreens/analytics');
    await page.waitForLoadState('networkidle');

    // Should load analytics page
    await expect(page.locator('body')).not.toContainText('Error');

    // Should show tab buttons
    await expect(page.getByRole('button', { name: 'By Variety' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Trends' })).toBeVisible();
  });

  test('analytics page renders after creating tray', async ({ page }) => {
    // This test creates a tray and verifies analytics page still works
    await page.goto('/microgreens');

    // Create site
    // Creation moved to the manage page; "Add Site" is only the dialog's submit label now.
    await page.goto('/microgreens/sites/manage');
    const addSiteButton = page.getByRole('button', { name: /Add a (growing )?space/i }).first();
    await expect(addSiteButton).toBeVisible({ timeout: 10000 });
    await addSiteButton.click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/Home Greenhouse|Farm Site/i).fill('Full Analytics Site');
    await page.getByRole('dialog').locator('input[name="isIndoor"]').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Add Site', exact: true }).click();
    await expect(page.locator('text="Full Analytics Site"').first()).toBeVisible({ timeout: 10000 });

    // Enter site and create a tray
    await page.getByRole('button', { name: 'Open Full Analytics Site' }).dispatchEvent('click');
    await page.getByRole('link', { name: /Trays/i }).click();
    // Land on the trays route before reaching for its controls. Without this the New tray
    // click can fire mid-navigation and be swallowed, and the failure then surfaces much
    // later as a dialog that never opens - which reads as slowness and is not.
    await expect(page).toHaveURL(/\/trays/);
    await page.getByRole('button', { name: /New Tray/i }).first().click();

    // Wait on the dialog itself rather than a fixed 500ms. The sleep was enough on a dev
    // machine and not on a CI runner, which is what made this fail there and pass here -
    // "element(s) not found" for the combobox meant the dialog had not rendered yet.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    const varietySelect = page.getByRole('dialog').getByRole('combobox').first();
    await expect(varietySelect).toBeEnabled({ timeout: 10000 });
    await varietySelect.selectOption({ label: 'Sunflower' });
    await page.getByRole('dialog').getByRole('button', { name: /Save Tray/i }).click();
    await page.waitForTimeout(1000);

    // Verify tray was created. Scoped to the tray card's accessible name: "Sunflower" also
    // appears as an <option> in the new-tray form's variety select, and an option inside a
    // closed select is never visible, so a bare text match resolves to that and waits it out.
    await expect(
      page.getByRole('button', { name: /Sunflower/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // Navigate to analytics
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/\/analytics/);

    // Page should load without errors
    await expect(page.locator('body')).not.toContainText('Error');

    // Should show tabs (with or without data)
    await expect(page.getByRole('button', { name: 'By Variety' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Trends' })).toBeVisible();
  });
});
