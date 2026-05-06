import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright configuration — NIVY E2E + a11y suites.
 *
 * Smoke specs (under `tests/e2e`) target navigation, redirects and basic form
 * behaviour without depending on a live Supabase environment.
 * a11y specs (under `tests/a11y`) use @axe-core/playwright to scan public pages.
 *
 * The webServer block boots `next start` before tests; locally we reuse any
 * existing dev server to keep iteration fast.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})
