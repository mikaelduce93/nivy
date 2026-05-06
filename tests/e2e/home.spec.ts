import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the public marketing home page.
 *
 * Validates that the page renders without crashing and that the key
 * navigation/preview landmarks are present.
 */
test.describe("home / landing page", () => {
  test("loads the public home page and shows main landmarks", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.status(), "home page must respond with a successful status").toBeLessThan(400)

    // Document should have a non-empty title.
    await expect(page).toHaveTitle(/.+/)

    // The page should expose at least one heading (h1 from the hero section).
    const heading = page.locator("h1").first()
    await expect(heading).toBeVisible()
  })

  test("renders the avatar preview block (anonymous marketing)", async ({ page }) => {
    await page.goto("/")

    // The marketing preview block uses the literal "Aperçu" username.
    await expect(page.getByText(/aperçu/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test("exposes navigation toward auth", async ({ page }) => {
    await page.goto("/")

    // At least one link to the login / signup flow should be reachable from
    // the landing page (header, hero CTA or footer).
    const authLinks = page.locator('a[href*="/auth/"]')
    await expect(authLinks.first()).toBeVisible({ timeout: 10_000 })
  })
})
