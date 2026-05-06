import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the parent first-run onboarding gate.
 *
 * The flow we cover here:
 *   1. /parent is gated — without a parent session it bounces to /auth/login.
 *   2. /parent/e-signature renders the consent form (signature + CGU).
 *   3. /parent/topup is blocked until the e-signature exists. The gate lives
 *      in app/api/parent/topup/route.ts (lines ~51-69) and the page itself
 *      can either redirect or render a banner asking for the signature.
 *
 * Without a seeded parent session we exercise the public bounces; the
 * authenticated assertions are guarded behind an env-var fixture.
 *
 * TODO(seed): expose tests/fixtures/auth/parent.ts that signs in a parent
 * user (E2E_PARENT_EMAIL / E2E_PARENT_PASSWORD). For the topup-gate test
 * we additionally need that parent to NOT yet have a row in `e_signatures`
 * with terms_accepted=true (i.e. a fresh fixture or a reset hook).
 */

const HAS_PARENT_FIXTURE = Boolean(
  process.env.E2E_PARENT_EMAIL && process.env.E2E_PARENT_PASSWORD,
)

test.describe("parent / onboarding", () => {
  test("/parent bounces unauthenticated visitors to /auth/login", async ({ page }) => {
    const response = await page.goto("/parent", { waitUntil: "domcontentloaded" })
    const status = response?.status() ?? 200
    expect([200, 307, 308]).toContain(status)
    await expect(page).toHaveURL(/\/auth\/(login|redirect)/, { timeout: 15_000 })
  })

  test("/parent/e-signature renders the consent form for a signed-in parent", async ({ page }) => {
    test.skip(
      !HAS_PARENT_FIXTURE,
      "Requires a signed-in parent fixture. " +
        "TODO: wire tests/fixtures/auth/parent.ts (E2E_PARENT_EMAIL/PASSWORD).",
    )

    await page.goto("/parent/e-signature")

    // Page header from app/parent/e-signature/page.tsx
    await expect(
      page.getByRole("heading", { name: /autorisation parentale/i }),
    ).toBeVisible({ timeout: 15_000 })

    // The ESignatureForm exposes a CGU acceptance control + a submit button.
    // We tolerate either checkbox, button or labelled control to avoid coupling
    // to internal markup.
    const cgu = page.getByText(/cgu|conditions générales|accepte/i).first()
    await expect(cgu).toBeVisible({ timeout: 10_000 })

    const submit = page.getByRole("button", { name: /signer|valider|envoyer|accepter/i }).first()
    await expect(submit).toBeVisible()
  })

  test("/parent/topup is blocked when no e-signature is on file", async ({ page }) => {
    test.skip(
      !HAS_PARENT_FIXTURE,
      "Requires a parent fixture that has NOT yet signed the CGU. " +
        "TODO: ensure the test parent has zero rows in e_signatures with terms_accepted=true, or reset before run.",
    )

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
