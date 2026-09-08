import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Configured for Paddock's local-first architecture:
 * - Uses Vite dev server on port 5173
 * - Tests against Chromium primarily (fastest)
 * - Screenshots on failure for debugging
 * - Trace on first retry for detailed analysis
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /**
   * Playwright's default is 30s, which is a dev-machine figure. A CI runner is slower at
   * every step these tests depend on - seeding 23 trays into IndexedDB on boot, loading the
   * variety list before the new-tray select is enabled - and two tests were exceeding it
   * there while passing locally every time. They were reported as flaky because they passed
   * on retry, which is the same slowness wearing a friendlier label.
   *
   * Raised on CI only, so a genuine hang still fails fast in local development.
   */
  timeout: process.env.CI ? 60_000 : 30_000,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for cross-browser testing:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
