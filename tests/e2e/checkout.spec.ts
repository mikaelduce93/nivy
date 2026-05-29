import { expect, hasCredentials, test } from "../fixtures/auth"
import { getProfileIdByEmail, getServiceClient } from "../fixtures/db"

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
const db = getServiceClient()
const TEEN_EMAIL = "teen.amine@teenclub.ma"

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

  test("submitting the checkout advances the booking → parental approval chain", async ({
    page,
    signInAs,
  }) => {
    test.skip(
      !HAS_TEEN_FIXTURE || !PENDING_BOOKING_ID || !db,
      "Requires teen fixture + a fresh pending booking + service-role DB env (this test mutates booking state).",
    )
    const sb = db!
    const teenId = await getProfileIdByEmail(sb, TEEN_EMAIL)
    test.skip(!teenId, "Seed accounts missing — run npm run seed:beta.")

    const startedAt = new Date().toISOString()

    await signInAs("teen")
    await page.goto(`/teen/shop/checkout?booking=${PENDING_BOOKING_ID}`)
    const payButton = page
      .getByRole("button", { name: /payer|confirmer|réserver|valider/i })
      .first()
    await expect(payButton).toBeVisible({ timeout: 10_000 })
    await payButton.click()
    // Let the server-side mutation land.
    await page.waitForTimeout(4_000)

    // The chain must leave a persisted trace: either the booking advanced past
    // its seeded ('pending','pending') state, OR a parental_approvals row was
    // queued for the teen (booking → parental_approvals). Poll briefly.
    let advanced = false
    for (let attempt = 0; attempt < 5 && !advanced; attempt++) {
      const { data: booking } = await sb
        .from("bookings")
        .select("status, payment_status")
        .eq("id", PENDING_BOOKING_ID!)
        .maybeSingle()
      const bookingAdvanced =
        !!booking &&
        !(booking.status === "pending" && booking.payment_status === "pending")

      const { data: approvals } = await sb
        .from("parental_approvals")
        .select("id")
        .eq("teen_id", teenId!)
        .gte("requested_at", startedAt)
        .limit(1)
      const approvalQueued = (approvals?.length ?? 0) >= 1

      advanced = bookingAdvanced || approvalQueued
      if (!advanced) await page.waitForTimeout(1_500)
    }
    expect(
      advanced,
      "expected the booking to advance or a parental_approvals row to be queued",
    ).toBe(true)
  })
})
