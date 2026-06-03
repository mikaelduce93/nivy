import { expect, hasCredentials, test } from "../../fixtures/auth"
import { MOBILE_USE, expectNoErrors, expectNoHorizontalOverflow, expectTappable, watchErrors } from "./_mobile"

/**
 * V5 #224 — `login → dashboard` on a mobile viewport. This is the flow where the
 * original "crash à la connexion" was reported, so it MUST be green on mobile.
 *
 * Always-run: the login screen renders cleanly (no overflow, no uncaught error,
 * fields tappable) and protected routes bounce without crashing.
 * Auth-gated (skips without a seed/creds): a real teen login lands on a
 * dashboard with no horizontal overflow and no crash.
 */
test.use(MOBILE_USE)

test.describe("mobile · login → dashboard", () => {
  test("login page renders cleanly on a phone", async ({ page }) => {
    const errs = watchErrors(page)
    await page.goto("/auth/login")

    // A hero heading must render (don't couple to exact copy — the page was
    // redesigned in V2). The key controls must be present and tappable
    // (the form uses #email / #password).
    await expect(page.locator("h1").first()).toBeVisible()
    await expectTappable(page, page.locator("#email"), "email field")
    await expectTappable(page, page.locator("#password"), "password field")
    await expect(page.locator('button[type="submit"]').first()).toBeVisible()

    await expectNoHorizontalOverflow(page, "/auth/login")
    expectNoErrors(errs, "/auth/login")
  })

  test("protected /teen bounces without crashing on a phone", async ({ page }) => {
    const errs = watchErrors(page)
    await page.goto("/teen", { waitUntil: "domcontentloaded" })
    // Unauthenticated → middleware sends us to the login/redirect flow. We don't
    // over-assert the exact destination (env-dependent); we assert no crash and
    // no sideways scroll on whatever renders.
    await expectNoHorizontalOverflow(page, "/teen (unauth)")
    expect(errs.page, `/teen: uncaught exception(s):\n${errs.page.join("\n")}`).toEqual([])
  })

  test("authenticated teen reaches a dashboard on mobile", async ({ page, signInAs }) => {
    test.skip(!hasCredentials("teen"), "Set E2E_TEEN_EMAIL/PASSWORD or E2E_USE_SEEDED_DEFAULTS=1 (docs/TEST_ACCOUNTS.md).")
    const errs = watchErrors(page)

    await signInAs("teen")
    // We must be OFF the login page (on /teen or an intermediate role route).
    await expect(page).not.toHaveURL(/\/auth\/login/)

    await expectNoHorizontalOverflow(page, "teen dashboard")
    expectNoErrors(errs, "teen dashboard")
  })
})
