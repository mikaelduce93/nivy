import { expect, hasCredentials, test } from "../fixtures/auth"

/**
 * Smoke tests for the parent first-run onboarding gate.
 *
 * Coverage:
 *   1. /parent bounces unauthenticated visitors to /auth/login.
 *   2. /parent/e-signature renders the consent form for a signed-in parent.
 *   3. /parent/topup is blocked until the e-signature exists (gate lives in
 *      app/api/parent/topup/route.ts:51-69).
 *
 * The topup-gate test requires the test parent to NOT yet have a row in
 * `e_signatures` with terms_accepted=true — re-seed before each run.
 */

const HAS_PARENT_FIXTURE = hasCredentials("parent")

test.describe("parent / onboarding", () => {
  test("/parent bounces unauthenticated visitors to /auth/login", async ({ page }) => {
    const response = await page.goto("/parent", { waitUntil: "domcontentloaded" })
    const status = response?.status() ?? 200
    expect([200, 307, 308]).toContain(status)
    await expect(page).toHaveURL(/\/auth\/(login|redirect)/, { timeout: 15_000 })
  })

  test("/parent/e-signature renders the consent form for a signed-in parent", async ({ page, signInAs }) => {
    test.skip(!HAS_PARENT_FIXTURE, "Requires parent credentials.")

    await signInAs("parent")
    await page.goto("/parent/e-signature")

    // Page header from app/parent/e-signature/page.tsx
    await expect(
      page.getByRole("heading", { name: /autorisation parentale/i }),
    ).toBeVisible({ timeout: 15_000 })

    // The form is a multi-step wizard. Step 1 starts with "Informations
    // parentales" and a disabled "Suivant" CTA — proves the form mounted.
    await expect(
      page.getByRole("heading", { name: /informations parentales/i }),
    ).toBeVisible({ timeout: 10_000 })

    const nextButton = page.getByRole("button", { name: /suivant|continuer|signer|accepter/i }).first()
    await expect(nextButton).toBeVisible()
  })

  test("/parent/topup is blocked when no e-signature is on file", async ({ page, signInAs }) => {
    test.skip(
      !HAS_PARENT_FIXTURE,
      "Requires a parent fixture that has NOT yet signed the CGU (re-seed before run).",
    )

    await signInAs("parent")
    const response = await page.goto("/parent/topup", { waitUntil: "domcontentloaded" })
    const status = response?.status() ?? 200
    expect([200, 307, 308]).toContain(status)

    // Two acceptable outcomes mirror what the gate in
    // app/api/parent/topup/route.ts:51-69 + the page wrapper can produce:
    //   1. A redirect to /parent/e-signature
    //   2. A banner / inline error demanding the signature before any top-up
    const redirectedToSignature = /\/parent\/e-signature/.test(page.url())
    const banner = page
      .getByText(/signature.*requise|autorisation.*requise|signez|consentement/i)
      .first()

    if (!redirectedToSignature) {
      await expect(banner).toBeVisible({ timeout: 10_000 })
    } else {
      // Already on /parent/e-signature — assert the form is reachable.
      await expect(page).toHaveURL(/\/parent\/e-signature/)
    }

    // Either way the parent must NOT have been allowed to interact with the
    // top-up amount input.
    const amountInput = page.getByLabel(/montant|amount/i).first()
    expect(await amountInput.count()).toBe(0)
  })
})
