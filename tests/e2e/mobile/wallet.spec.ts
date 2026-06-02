import { expect, hasCredentials, test } from "../../fixtures/auth"
import { MOBILE_USE, expectNoErrors, expectNoHorizontalOverflow, watchErrors } from "./_mobile"

/**
 * V5 #224 — wallet on a mobile viewport. The wallet shows large currency
 * amounts + a tabbed shop; both must fit a 390px phone without sideways scroll.
 *
 * Always-run: the wallet route bounces cleanly when unauthenticated.
 * Auth-gated: /teen/wallet and /teen/wallet?tab=shop render with no overflow.
 */
test.use(MOBILE_USE)

test.describe("mobile · wallet", () => {
  test("wallet route bounces cleanly when unauthenticated", async ({ page }) => {
    const errs = watchErrors(page)
    await page.goto("/teen/wallet", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/teen/wallet (unauth)")
    expect(errs.page, `wallet: uncaught exception(s):\n${errs.page.join("\n")}`).toEqual([])
  })

  test("wallet hub renders without horizontal overflow on mobile", async ({ page, signInAs }) => {
    test.skip(!hasCredentials("teen"), "Set E2E_TEEN_EMAIL/PASSWORD or E2E_USE_SEEDED_DEFAULTS=1.")
    const errs = watchErrors(page)

    await signInAs("teen")
    await page.goto("/teen/wallet", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/teen/wallet")
    expectNoErrors(errs, "/teen/wallet")
  })

  test("wallet shop tab renders without horizontal overflow on mobile", async ({ page, signInAs }) => {
    test.skip(!hasCredentials("teen"), "Set E2E_TEEN_EMAIL/PASSWORD or E2E_USE_SEEDED_DEFAULTS=1.")
    const errs = watchErrors(page)

    await signInAs("teen")
    await page.goto("/teen/wallet?tab=shop", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/teen/wallet?tab=shop")
    expectNoErrors(errs, "/teen/wallet?tab=shop")
  })
})
