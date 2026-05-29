import { randomUUID } from "node:crypto"
import { expect, hasCredentials, test } from "../fixtures/auth"
import { getProfileIdByEmail, getServiceClient } from "../fixtures/db"

/**
 * E2E lock for the parent → teen top-up flow (#75 · Pilier E/K).
 *
 * Route under test: app/api/parent/topup/route.ts
 *   - parentId is derived from the session, never the body.
 *   - e-signature gate → 403 + requiresSignature:true (route.ts:133-151).
 *   - amount_coins = amount_dh * 100, computed server-side.
 *   - client_idempotency_key dedupe → idempotent_replay, no double credit
 *     (route.ts:156-183).
 *
 * The request goes through `page.request` AFTER signInAs, so it carries the
 * real cookie session — this exercises getUserRole() + the RPC end-to-end
 * against the live DB, not a mock.
 *
 * Requires (else the seeded tests skip):
 *   - parent credentials (E2E_PARENT_* or E2E_USE_SEEDED_DEFAULTS=1)
 *   - SUPABASE_SERVICE_ROLE_KEY (+ NEXT_PUBLIC_SUPABASE_URL) for the
 *     arrange/assert helper (tests/fixtures/db.ts).
 * The standard seed links parent.test@teenclub.ma → teen.amine@teenclub.ma.
 */

const HAS_PARENT = hasCredentials("parent")
const db = getServiceClient()
const PARENT_EMAIL = "parent.test@teenclub.ma"
const TEEN_EMAIL = "teen.amine@teenclub.ma"

// Serial: the unsigned-gate test mutates the parent's e_signatures state and
// restores it; serial execution (also enforced by CI workers:1) keeps it from
// racing the happy-path test that needs the signed state.
test.describe.configure({ mode: "serial" })

test.describe("parent / top-up (cross-account credit)", () => {
  test("POST /api/parent/topup without a session → 401", async ({ page }) => {
    const res = await page.request.post("/api/parent/topup", {
      data: {
        teenId: randomUUID(),
        amount_dh: 10,
        client_idempotency_key: randomUUID(),
      },
    })
    expect(res.status()).toBe(401)
  })

  test("signed parent tops up a teen → 1 payment row (coins=dh×100); replay is idempotent", async ({
    page,
    signInAs,
  }) => {
    test.skip(!HAS_PARENT || !db, "Requires parent creds + service-role DB env.")
    const sb = db!
    const teenId = await getProfileIdByEmail(sb, TEEN_EMAIL)
    const parentId = await getProfileIdByEmail(sb, PARENT_EMAIL)
    test.skip(!teenId || !parentId, "Seed accounts missing — run npm run seed:beta.")

    // The standard seed signs parent.test; assert that precondition so a
    // missing signature fails loudly here rather than masquerading as a 403.
    const { data: sig } = await sb
      .from("e_signatures")
      .select("id")
      .eq("parent_id", parentId!)
      .eq("terms_accepted", true)
      .limit(1)
      .maybeSingle()
    test.skip(!sig, "Seeded parent has no signed e_signature — run npm run seed:beta.")

    await signInAs("parent")

    const key = randomUUID()
    const res = await page.request.post("/api/parent/topup", {
      data: { teenId, amount_dh: 12, client_idempotency_key: key },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.amountCoins).toBe(1200) // 12 DH × 100

    // Exactly one payment_transactions row, with the server-computed coins.
    const { data: rows1 } = await sb
      .from("payment_transactions")
      .select("id, amount_coins, amount_dh, teen_id, parent_id")
      .eq("client_idempotency_key", key)
    expect(rows1?.length).toBe(1)
    expect(rows1![0].amount_coins).toBe(1200)
    expect(Number(rows1![0].amount_dh)).toBe(12)
    expect(rows1![0].teen_id).toBe(teenId)
    expect(rows1![0].parent_id).toBe(parentId)

    // Replaying the SAME idempotency key returns the prior payment, no 2nd row.
    const res2 = await page.request.post("/api/parent/topup", {
      data: { teenId, amount_dh: 12, client_idempotency_key: key },
    })
    expect(res2.status()).toBe(200)
    const body2 = await res2.json()
    expect(body2.idempotent_replay).toBe(true)

    const { data: rows2 } = await sb
      .from("payment_transactions")
      .select("id")
      .eq("client_idempotency_key", key)
    expect(rows2?.length).toBe(1)
  })

  test("parent without an e-signature → 403 requiresSignature, no payment row", async ({
    page,
    signInAs,
  }) => {
    test.skip(!HAS_PARENT || !db, "Requires parent creds + service-role DB env.")
    const sb = db!
    const teenId = await getProfileIdByEmail(sb, TEEN_EMAIL)
    const parentId = await getProfileIdByEmail(sb, PARENT_EMAIL)
    test.skip(!teenId || !parentId, "Seed accounts missing — run npm run seed:beta.")

    // Arrange: revoke the parent's accepted signature; restore in finally so
    // the seeded state is unchanged for every other spec.
    await sb
      .from("e_signatures")
      .update({ terms_accepted: false })
      .eq("parent_id", parentId!)
    try {
      await signInAs("parent")
      const key = randomUUID()
      const res = await page.request.post("/api/parent/topup", {
        data: { teenId, amount_dh: 10, client_idempotency_key: key },
      })
      expect(res.status()).toBe(403)
      const body = await res.json()
      expect(body.requiresSignature).toBe(true)

      const { data: rows } = await sb
        .from("payment_transactions")
        .select("id")
        .eq("client_idempotency_key", key)
      expect(rows?.length ?? 0).toBe(0)
    } finally {
      await sb
        .from("e_signatures")
        .update({ terms_accepted: true })
        .eq("parent_id", parentId!)
    }
  })
})
