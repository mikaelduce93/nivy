import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the partner first-run onboarding flow.
 *
 * Coverage:
 *   1. /partner is gated — unauthenticated visitors bounce to /auth/login.
 *   2. A partner whose `partners.status` is NOT in PARTNER_ACTIVE_STATUSES
 *      (i.e. pending / in_review / rejected / suspended) sees the
 *      <PartnerAwaitingApproval> banner instead of the dashboard.
 *   3. The public partner signup page (/devenir-partenaire/inscription)
 *      renders its 4-type wizard.
 *
 * TODO(seed): wire tests/fixtures/auth/partner-pending.ts that signs in as a
 * partner with status='pending' so we can exercise the awaiting-approval
 * banner without depending on production data.
 */

const HAS_PENDING_PARTNER_FIXTURE = Boolean(
  process.env.E2E_PARTNER_PENDING_EMAIL && process.env.E2E_PARTNER_PENDING_PASSWORD,
)

test.describe("partner / onboarding", () => {
  test("/partner bounces unauthenticated visitors to /auth/login", async ({ page }) => {
    const response = await page.goto("/partner", { waitUntil: "domcontentloaded" })
    const status = response?.status() ?? 200
    expect([200, 307, 308]).toContain(status)
    await expect(page).toHaveURL(/\/auth\/(login|redirect)/, { timeout: 15_000 })
  })

  test("a pending partner sees the awaiting-approval banner on /partner", async ({ page }) => {
    test.skip(
      !HAS_PENDING_PARTNER_FIXTURE,
      "Requires E2E_PARTNER_PENDING_EMAIL/PASSWORD signed-in fixture with partners.status='pending' or 'in_review'. " +
        "TODO: seed a partner row in that state and wire the fixture.",
    )

    await page.goto("/partner")

    // From components/dashboard/partner/awaiting-approval.tsx: the headline
    // copy varies (pending / in_review / suspended / rejected) but always
    // mentions « validation » or « attente ».
    await expect(
      page.getByText(/validation|attente|approbation|examen/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    // The banner offers a CTA toward the KYC flow OR the support page.
    const kycCta = page.getByRole("link", { name: /kyc|compléter/i })
    const supportCta = page.getByRole("link", { name: /support|contact/i })
    await expect(kycCta.or(supportCta).first()).toBeVisible()
  })

  test("/devenir-partenaire/inscription renders the 4-type signup wizard", async ({ page }) => {
    const response = await page.goto("/devenir-partenaire/inscription", {
      waitUntil: "domcontentloaded",
    })
    expect(response?.status() ?? 200).toBeLessThan(400)

    // The page lists 4 partner types — Commerce, Restaurants, Clubs, Éducation.
    // We assert at least 2 of the 4 are reachable to keep the test resilient
    // to copy tweaks while still catching a fully-broken render.
    const retail = page.getByText(/commerce|retail/i).first()
    const venue = page.getByText(/restaurants|lieux/i).first()
    const club = page.getByText(/clubs|fitness/i).first()
    const education = page.getByText(/éducation|formation/i).first()

    const visibleCount = (
      await Promise.all(
        [retail, venue, club, education].map((loc) =>
          loc.isVisible().catch(() => false),
        ),
      )
    ).filter(Boolean).length

    expect(visibleCount, "expected at least 2 partner-type tiles to render").toBeGreaterThanOrEqual(2)
  })
})
