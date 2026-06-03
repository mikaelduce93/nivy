import { expect, hasCredentials, test } from "../../fixtures/auth"
import { MOBILE_USE, expectNoErrors, expectNoHorizontalOverflow, watchErrors } from "./_mobile"

/**
 * V5 #224 — food ordering / checkout on a mobile viewport. The food menu carries
 * a sticky "Commander" bar that must clear the mobile dock (bottom-dock, #222).
 *
 * Always-run: the checkout route bounces cleanly when unauthenticated.
 * Auth-gated: the food hub renders with no horizontal overflow and no crash, and
 * the sticky order bar does not overflow.
 */
test.use(MOBILE_USE)

test.describe("mobile · food & checkout", () => {
  test("checkout route bounces cleanly when unauthenticated", async ({ page }) => {
    const errs = watchErrors(page)
    await page.goto("/teen/shop/checkout", { waitUntil: "domcontentloaded" })
    // Missing-booking / unauth bounce → /teen/shop or /auth/(login|redirect); all fine.
    await expectNoHorizontalOverflow(page, "/teen/shop/checkout (unauth)")
    expect(errs.page, `checkout: uncaught exception(s):\n${errs.page.join("\n")}`).toEqual([])
  })

  test("food hub renders without horizontal overflow on mobile", async ({ page, signInAs }) => {
    test.skip(!hasCredentials("teen"), "Set E2E_TEEN_EMAIL/PASSWORD or E2E_USE_SEEDED_DEFAULTS=1.")
    const errs = watchErrors(page)

    await signInAs("teen")
    await page.goto("/teen/food", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/teen/food")
    expectNoErrors(errs, "/teen/food")
  })

  test("XP store / checkout entry renders without overflow on mobile", async ({ page, signInAs }) => {
    test.skip(!hasCredentials("teen"), "Set E2E_TEEN_EMAIL/PASSWORD or E2E_USE_SEEDED_DEFAULTS=1.")
    const errs = watchErrors(page)

    await signInAs("teen")
    await page.goto("/teen/shop", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/teen/shop")
    expectNoErrors(errs, "/teen/shop")
  })
})
