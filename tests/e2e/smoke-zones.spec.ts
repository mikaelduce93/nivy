import { expect, test, type ConsoleMessage, type Page } from "@playwright/test"

/**
 * Cross-zone smoke tests for NIVY.
 *
 * Each NIVY user-zone (public marketing, teen, parent, partner, admin,
 * ambassador) is exercised here with three minimal invariants:
 *   1. Navigating to the zone root resolves with a non-5xx response.
 *   2. The zone exposes its expected mobile dock (or, for protected zones,
 *      bounces to /auth/login with a 200/307/308).
 *   3. No `error` level message bubbles up from the browser console while the
 *      page is loading.
 *
 * These tests are intentionally lightweight — they do not log anyone in, and
 * therefore do not assert on the *internals* of authenticated dashboards.
 * Their job is to catch crashes, broken redirects, hydration errors, and
 * regressions in the public dock landmark.
 */

type ZoneSpec = {
  /** Display name used in the test title. */
  name: string
  /** Path to navigate to. */
  path: string
  /** True when the zone is gated behind /auth/login and should redirect. */
  requiresAuth: boolean
  /**
   * When provided, the zone is expected to render its own dock while
   * unauthenticated. Used to assert dock landmarks on the public surface.
   */
  expectsPublicDock?: boolean
}

const ZONES: ZoneSpec[] = [
  { name: "public", path: "/", requiresAuth: false, expectsPublicDock: true },
  { name: "teen", path: "/teen", requiresAuth: true },
  { name: "parent", path: "/parent", requiresAuth: true },
  { name: "partner", path: "/partner", requiresAuth: true },
  { name: "admin", path: "/admin", requiresAuth: true },
  { name: "ambassador", path: "/ambassador", requiresAuth: true },
]

/**
 * Subscribe to console events and return a getter for the collected error
 * messages. We deliberately ignore informational/warn level entries because
 * Next.js dev mode and 3rd-party scripts emit unrelated noise.
 */
function captureConsoleErrors(page: Page): () => string[] {
  const errors: string[] = []
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      errors.push(msg.text())
    }
  })
  page.on("pageerror", (error: Error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  return () => errors
}

test.describe("smoke / zones", () => {
  test("public zone loads without 500 and exposes main navigation", async ({ page }) => {
    const getErrors = captureConsoleErrors(page)
    const response = await page.goto("/", { waitUntil: "domcontentloaded" })

    expect(response?.status() ?? 200, "home should respond < 500").toBeLessThan(500)
    await expect(page).toHaveTitle(/.+/)

    // The marketing layout renders a header navigation. We accept either the
    // explicit aria-label OR a generic <nav> landmark, depending on which
    // scaffolding the design system ends up shipping.
    const nav = page.locator("nav").first()
    await expect(nav).toBeVisible({ timeout: 10_000 })

    // Console error gate — we tolerate hydration/DevTools noise during fast
    // navigation, but flag genuine runtime exceptions.
    const errors = getErrors().filter(
      (msg) => !msg.includes("Failed to load resource") && !msg.includes("Download the React DevTools"),
    )
    expect(errors, `unexpected console errors on /:\n${errors.join("\n")}`).toEqual([])
  })

  for (const zone of ZONES.filter((z) => z.requiresAuth)) {
    test(`${zone.name} zone redirects to /auth/login when unauthenticated`, async ({ page }) => {
      const getErrors = captureConsoleErrors(page)
      const response = await page.goto(zone.path, { waitUntil: "domcontentloaded" })

      const status = response?.status() ?? 200
      // Acceptable outcomes:
      //   - 200 with the login form rendered (middleware rewrite path)
      //   - 307 / 308 (Next.js redirect)
      expect([200, 307, 308], `unexpected status ${status} on ${zone.path}`).toContain(status)

      // Final URL should be the login page or a public surface — never the
      // gated zone itself when unauthenticated.
      const finalUrl = page.url()
      expect(finalUrl).toMatch(/\/auth\/login|\/$/)

      // Surface unexpected errors. Auth bounces sometimes log a benign
      // "AuthSessionMissingError" — we filter those out as known noise.
      const errors = getErrors().filter(
        (msg) =>
          !msg.includes("AuthSessionMissingError") &&
          !msg.includes("Failed to load resource") &&
          !msg.includes("Download the React DevTools"),
      )
      expect(
        errors,
        `unexpected console errors when bouncing ${zone.path}:\n${errors.join("\n")}`,
      ).toEqual([])
    })
  }

  test("public marketing dock surfaces its primary CTAs", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    // The marketing surface should expose at least one /auth/* link reachable
    // via header / hero / footer — this is the user's only path to sign in.
    const authLinks = page.locator('a[href*="/auth/"]')
    await expect(authLinks.first()).toBeVisible({ timeout: 10_000 })
  })
})
