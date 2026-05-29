import { createHmac, randomBytes, randomUUID } from "node:crypto"
import { expect, hasCredentials, test } from "../fixtures/auth"
import { getProfileIdByEmail, getServiceClient } from "../fixtures/db"

/**
 * E2E lock for teen↔partner scanner redemption (#75 · Pilier B/K).
 *
 * Route under test: app/api/partner/scanner/apply/route.ts → RPC
 * apply_partner_offer (mig 099). The QR format is
 * `nivy:v1:{user_id}:{card_number}:{exp}:{nonce}:{hmac}` (lib/partner/qr-v2.ts).
 *
 * Negative paths (run without seed): unauth → 401; invalid body → 400; legacy
 * TPVIP → 400 legacy_qr_rejected; tampered HMAC → 400 bad_signature.
 *
 * Full redemption + replay (gated on partner creds + service-role env + a
 * partner-owned active offer): a freshly-signed valid QR redeems via
 * apply_partner_offer; replaying the SAME nonce → 400 qr_replay (the unique
 * index on qr_nonces.nonce). The QR is signed at runtime with a fresh exp so
 * it never expires before the assertion.
 */

const HAS_PARTNER = hasCredentials("partner")
const db = getServiceClient()
const TEEN_EMAIL = "teen.amine@teenclub.ma"
const PARTNER_EMAIL = "retail.partner@teenclub.ma"

/** Replicates lib/partner/qr-v2.ts signV2Qr (that module is `server-only`). */
function signQr(
  seedB64: string,
  userId: string,
  cardNumber: string,
  expUnix: number,
  nonce: string,
): string {
  const key = Buffer.from(seedB64, "base64")
  const payload = `${userId}:${cardNumber}:${expUnix}:${nonce}`
  const sig = createHmac("sha256", key).update(payload).digest("base64")
  return `nivy:v1:${userId}:${cardNumber}:${expUnix}:${nonce}:${sig}`
}

test.describe.configure({ mode: "serial" })

test.describe("partner / scanner redemption", () => {
  test("POST /api/partner/scanner/apply without a session → 401", async ({ page }) => {
    const res = await page.request.post("/api/partner/scanner/apply", {
      data: {
        qr_payload: `nivy:v1:${randomUUID()}:VIP-X:9999999999:${randomBytes(16).toString("hex")}:c2ln`,
        offer_id: randomUUID(),
        purchase_amount: 100,
        idempotency_key: randomUUID(),
      },
    })
    expect(res.status()).toBe(401)
  })

  test("partner-authed invalid body → 400", async ({ page, signInAs }) => {
    test.skip(!HAS_PARTNER, "Requires partner credentials.")
    await signInAs("partner")
    const res = await page.request.post("/api/partner/scanner/apply", {
      data: { nope: true },
    })
    expect(res.status()).toBe(400)
  })

  test("partner-authed legacy TPVIP payload is rejected → 400 legacy_qr_rejected", async ({
    page,
    signInAs,
  }) => {
    test.skip(!HAS_PARTNER, "Requires partner credentials.")
    await signInAs("partner")
    const res = await page.request.post("/api/partner/scanner/apply", {
      data: {
        qr_payload: "TPVIP:some-user:some-card",
        offer_id: randomUUID(),
        purchase_amount: 100,
        idempotency_key: randomUUID(),
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("legacy_qr_rejected")
  })

  test("partner-authed QR with a tampered HMAC → 400 bad_signature", async ({ page, signInAs }) => {
    test.skip(!HAS_PARTNER || !db, "Requires partner creds + service-role DB env.")
    const sb = db!
    const teenId = await getProfileIdByEmail(sb, TEEN_EMAIL)
    test.skip(!teenId, "Seed accounts missing — run npm run seed:beta.")
    const { data: card } = await sb
      .from("vip_cards")
      .select("card_number")
      .eq("profile_id", teenId!)
      .eq("status", "active")
      .maybeSingle()
    test.skip(!card, "No active vip_card for the seeded teen.")

    await signInAs("partner")
    const expUnix = Math.floor(Date.now() / 1000) + 120
    const nonce = randomBytes(16).toString("hex")
    // Well-formed nivy:v1 frame, but the signature is bogus.
    const qr = `nivy:v1:${teenId}:${card!.card_number}:${expUnix}:${nonce}:bm90LWEtcmVhbC1zaWc=`
    const res = await page.request.post("/api/partner/scanner/apply", {
      data: {
        qr_payload: qr,
        offer_id: randomUUID(),
        purchase_amount: 100,
        idempotency_key: randomUUID(),
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("bad_signature")
  })

  test("a valid fresh QR redeems; replaying the same nonce → 400 qr_replay", async ({
    page,
    signInAs,
  }) => {
    test.skip(!HAS_PARTNER || !db, "Requires partner creds + service-role DB env.")
    const sb = db!
    const teenId = await getProfileIdByEmail(sb, TEEN_EMAIL)
    const partnerUserId = await getProfileIdByEmail(sb, PARTNER_EMAIL)
    test.skip(!teenId || !partnerUserId, "Seed accounts missing — run npm run seed:beta.")

    // The signed-in partner must be active staff of a partner that owns an
    // active, approved offer (apply_partner_offer authorizes via partner_staff).
    const { data: staff } = await sb
      .from("partner_staff")
      .select("partner_id")
      .eq("user_id", partnerUserId!)
      .eq("is_active", true)
      .maybeSingle()
    test.skip(!staff, "Signed-in partner is not active staff of any partner.")
    const { data: offer } = await sb
      .from("partner_offers")
      .select("id")
      .eq("partner_id", staff!.partner_id)
      .eq("is_active", true)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle()
    test.skip(!offer, "No active approved offer for this partner — run npm run seed:e2e-data.")

    const { data: card } = await sb
      .from("vip_cards")
      .select("card_number")
      .eq("profile_id", teenId!)
      .eq("status", "active")
      .maybeSingle()
    test.skip(!card, "No active vip_card for the seeded teen.")

    const { data: secret } = await sb
      .from("partner_qr_secret")
      .select("secret_b64")
      .eq("id", 1)
      .maybeSingle()
    test.skip(!secret?.secret_b64, "partner_qr_secret seed missing.")

    await signInAs("partner")
    const expUnix = Math.floor(Date.now() / 1000) + 120
    const nonce = randomBytes(16).toString("hex")
    const qr = signQr(secret!.secret_b64, teenId!, card!.card_number, expUnix, nonce)

    const res = await page.request.post("/api/partner/scanner/apply", {
      data: {
        qr_payload: qr,
        offer_id: offer!.id,
        purchase_amount: 100,
        idempotency_key: randomUUID(),
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // Replaying the SAME nonce is rejected by the unique qr_nonces index.
    const res2 = await page.request.post("/api/partner/scanner/apply", {
      data: {
        qr_payload: qr,
        offer_id: offer!.id,
        purchase_amount: 100,
        idempotency_key: randomUUID(),
      },
    })
    expect(res2.status()).toBe(400)
    const body2 = await res2.json()
    expect(body2.error).toBe("qr_replay")
  })
})
