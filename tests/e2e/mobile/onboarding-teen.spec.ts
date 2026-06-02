import { expect, hasCredentials, test } from "../../fixtures/auth"
import { MOBILE_USE, expectNoErrors, expectNoHorizontalOverflow, watchErrors } from "./_mobile"

/**
 * V5 #224 — parent onboarding → teen validation on a mobile viewport.
 *
 * `/auth/validate-teen` is the public, token-based teen-activation page that was
 * the #216 CSR-bailout fix (useSearchParams without <Suspense>). Loading it on a
 * phone (even without a token) must render the invalid-token state, NOT crash —
 * this is the regression guard for the original "Application error".
 *
 * Auth-gated: a parent reaches the add-teen screen with no overflow / no crash.
 */
test.use(MOBILE_USE)

test.describe("mobile · onboarding & teen validation", () => {
  test("teen activation page renders (not crashes) without a token on mobile", async ({ page }) => {
    const errs = watchErrors(page)
    await page.goto("/auth/validate-teen", { waitUntil: "domcontentloaded" })
    // The page is public and self-suspends (#216): it must paint an
    // invalid/missing-token state, never an uncaught crash or CSR bailout error.
    await expectNoHorizontalOverflow(page, "/auth/validate-teen")
    expectNoErrors(errs, "/auth/validate-teen")
  })

  test("parent onboarding bounces cleanly when unauthenticated", async ({ page }) => {
    const errs = watchErrors(page)
    await page.goto("/onboarding/parent/e-signature", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/onboarding/parent/e-signature (unauth)")
    expect(errs.page, `onboarding: uncaught exception(s):\n${errs.page.join("\n")}`).toEqual([])
  })

  test("parent add-teen screen renders without horizontal overflow on mobile", async ({ page, signInAs }) => {
    test.skip(!hasCredentials("parent"), "Set E2E_PARENT_EMAIL/PASSWORD or E2E_USE_SEEDED_DEFAULTS=1.")
    const errs = watchErrors(page)

    await signInAs("parent")
    await page.goto("/parent/teens/add", { waitUntil: "domcontentloaded" })
    await expectNoHorizontalOverflow(page, "/parent/teens/add")
    expectNoErrors(errs, "/parent/teens/add")
  })
})
