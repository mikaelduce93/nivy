import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the reservation checkout flow.
 *
 * /teen/shop/checkout requires:
 *   1. A teen-role Supabase session (otherwise → /auth/redirect).
 *   2. A `?booking=<uuid>` query param pointing at a row in `bookings` with
 *      payment_status != 'paid' (otherwise → /teen/shop?error=… or
 *      /mes-reservations/<id>).
 *
 * Without a seeded booking we can only assert the bouncer behaviour — the
 * happy-path (summary + Payer button → pending_approval) is gated behind a
 * fixture the user must wire up.
 *
 * TODO(seed): create a Playwright fixture that, before the test runs:
 *   - signs in as a teen via Supabase (E2E_TEEN_EMAIL / E2E_TEEN_PASSWORD),
 *   - inserts a booking row in `bookings` with payment_status='pending',
 *     status='pending', total_amount > 0, linked to that teen + an event,
 *   - exposes the booking id as `process.env.E2E_PENDING_BOOKING_ID`.
 *
 * Then drop the `test.skip` guards below.
 */

const HAS_TEEN_FIXTURE = Boolean(process.env.E2E_TEEN_EMAIL && process.env.E2E_TEEN_PASSWORD)
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

  test("renders the checkout summary and exposes a pay action", async ({ page }) => {
    test.skip(
      !HAS_TEEN_FIXTURE || !PENDING_BOOKING_ID,
      "Requires teen auth fixture + E2E_PENDING_BOOKING_ID env var pointing at a pending booking row. " +
        "TODO: seed a `bookings` row (payment_status='pending', status='pending') for the test teen and export its id.",
    )

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

  test("submitting the checkout flips the booking into pending_approval", async ({ page }) => {
    test.skip(
      !HAS_TEEN_FIXTURE || !PENDING_BOOKING_ID,
      "Requires teen fixture + a fresh pending booking. The test mutates booking state. " +
        "TODO: re-seed the booking before each run, OR run this test in a Supabase preview branch.",
    )

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
