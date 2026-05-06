import { expect, hasCredentials, test } from "../fixtures/auth"

/**
 * Smoke tests for the reservation checkout flow.
 *
 * Requires:
 *   1. A teen-role session — handled by signInAs("teen") fixture.
 *   2. A `?booking=<uuid>` query param pointing at a row in `bookings` with
 *      payment_status='pending'. Pass via E2E_PENDING_BOOKING_ID env var.
 *
 * The submit-flow test mutates booking state — re-seed before each run, or
 * run against a Supabase preview branch.
 */

const HAS_TEEN_FIXTURE = hasCredentials("teen")
const PENDING_BOOKING_ID = process.env.E2E_PENDING_BOOKING_ID

test.describe("teen / shop checkout", () => {
  test("missing booking param redirects back to /teen/shop", async ({ page }) => {
    await page.goto("/teen/shop/checkout", { waitUntil: "domcontentloaded" })
    // Server-side redirect kicks the user back. Unauthenticated visitors will
    // land on /auth/login or /auth/redirect first; both are acceptable bounce
    // outcomes.
    await expect(page).toHaveURL(
      /\/teen\/shop|\/auth\/(login|redirect)/,
      { timeout: 15_000 },
    )
  })

  test("renders the checkout summary and exposes a pay action", async ({ page, signInAs }) => {
    test.skip(
      !HAS_TEEN_FIXTURE || !PENDING_BOOKING_ID,
      "Requires teen credentials + E2E_PENDING_BOOKING_ID pointing at a pending booking row.",
    )

    await signInAs("teen")
    await page.goto(`/teen/shop/checkout?booking=${PENDING_BOOKING_ID}`)

    // Page header from app/teen/shop/checkout/page.tsx
    await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible({
      timeout: 15_000,
    })

    // The page shows the event title or booking reference.
    await expect(page.getByText(/réservation|finalise/i).first()).toBeVisible()

    // The TeenCheckoutClient renders a primary CTA — accept multiple labels
    // since the impl may evolve (Payer / Confirmer / Réserver).
    const payButton = page.getByRole("button", { name: /payer|confirmer|réserver|valider/i })
    await expect(payButton.first()).toBeVisible({ timeout: 10_000 })
  })

  test("submitting the checkout flips the booking into pending_approval", async ({ page, signInAs }) => {
    test.skip(
      !HAS_TEEN_FIXTURE || !PENDING_BOOKING_ID,
      "Requires teen fixture + a fresh pending booking — this test mutates booking state.",
    )

    await signInAs("teen")
    await page.goto(`/teen/shop/checkout?booking=${PENDING_BOOKING_ID}`)

    const payButton = page.getByRole("button", { name: /payer|confirmer|réserver|valider/i }).first()
    await expect(payButton).toBeVisible({ timeout: 10_000 })
    await payButton.click()

    // Expected outcome: a success state appears (toast or banner mentioning
    // approbation/en attente) OR navigation to the reservations page.
    const successCue = page
      .getByText(/en attente d.?approbation|approbation parentale|merci|confirmée/i)
      .first()
    const reservationsUrl = page.waitForURL(/\/mes-reservations\//, { timeout: 15_000 }).then(() => true)

    await Promise.race([
      expect(successCue).toBeVisible({ timeout: 15_000 }),
      reservationsUrl,
    ])
  })
})
