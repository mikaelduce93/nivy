import { expect, test } from "@playwright/test"

/**
 * Visual regression snapshots for NIVY's most-visited pages.
 *
 * These specs use `toHaveScreenshot()` which:
 *   - Writes a baseline PNG on first run (`__screenshots__/<spec>/<name>.png`).
 *   - Diffs against the baseline on subsequent runs and fails when the diff
 *     exceeds the project's `maxDiffPixelRatio` (set in `playwright.config.ts`).
 *
 * Regenerating baselines (e.g. after a deliberate UI change):
 *   $ npx playwright test tests/visual --update-snapshots
 *
 * Notes on flakiness mitigation:
 *   - We mask animated/dynamic regions (countdowns, hero images, leaflet
 *     tiles) so unrelated content variations don't break the diff.
 *   - We disable CSS animations by injecting a stylesheet before each capture.
 *   - We use `fullPage: false` to bound the screenshot to the current
 *     viewport, which keeps mobile/desktop snapshots stable across runs.
 */

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
`

const MOBILE_VIEWPORT = { width: 390, height: 844 } // iPhone 14 Pro
const DESKTOP_VIEWPORT = { width: 1280, height: 800 } // typical laptop

test.describe("visual / critical pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })
  })

  test("home @ mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto("/", { waitUntil: "networkidle" })
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })

    await expect(page).toHaveScreenshot("home-mobile.png", {
      fullPage: false,
      mask: [
        page.locator('[data-testid="countdown"]'),
        page.locator('img[src*="event"]'),
        page.locator('img[src*="avatar"]'),
        page.locator("video"),
      ],
    })
  })

  test("home @ desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto("/", { waitUntil: "networkidle" })
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })

    await expect(page).toHaveScreenshot("home-desktop.png", {
      fullPage: false,
      mask: [
        page.locator('[data-testid="countdown"]'),
        page.locator('img[src*="event"]'),
        page.locator('img[src*="avatar"]'),
        page.locator("video"),
      ],
    })
  })

  test("login @ mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto("/auth/login", { waitUntil: "networkidle" })
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })

    await expect(page).toHaveScreenshot("login-mobile.png", {
      fullPage: false,
      mask: [page.locator("img[alt*='logo' i]")],
    })
  })

  test("aide / help center @ mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto("/aide", { waitUntil: "networkidle" })
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })

    await expect(page).toHaveScreenshot("aide-mobile.png", {
      fullPage: false,
    })
  })

  test("agenda @ desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto("/agenda", { waitUntil: "networkidle" })
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })

    await expect(page).toHaveScreenshot("agenda-desktop.png", {
      fullPage: false,
      mask: [
        page.locator('[data-testid="countdown"]'),
        page.locator('img[src*="event"]'),
        // Leaflet/map tiles render asynchronously and would otherwise flap.
        page.locator(".leaflet-container"),
      ],
    })
  })
})
