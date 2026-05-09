/**
 * Wave 3A — v2 partner-scanner QR primitives.
 *
 * Verifies:
 *   1. signV2Qr → parseV2Qr round-trip and produces nivy:v1 prefix.
 *   2. verifyV2Qr accepts a freshly-signed payload.
 *   3. verifyV2Qr rejects expired payloads.
 *   4. verifyV2Qr rejects bad HMAC (wrong seed).
 *   5. parseV2Qr rejects TPVIP: format and other malformed inputs.
 *   6. isLegacyTpvipAllowed defaults to false.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  isLegacyTpvipAllowed,
  parseV2Qr,
  signV2Qr,
  verifyV2Qr,
} from "@/lib/partner/qr-v2"

const SEED = Buffer.from("nivy-test-seed-32-bytes-for-hmac-sha256-x").toString("base64")
const SEED_OTHER = Buffer.from("nivy-other-seed-32-bytes-for-hmac-sha256").toString("base64")
const USER_ID = "11111111-1111-1111-1111-111111111111"
const CARD = "VIP-CARD-007"

describe("qr-v2", () => {
  beforeEach(() => {
    delete process.env.ALLOW_LEGACY_TPVIP_QR
  })
  afterEach(() => {
    delete process.env.ALLOW_LEGACY_TPVIP_QR
  })

  it("signs a v2 QR with the nivy:v1 prefix and 5 colon-separated fields after the prefix", () => {
    const out = signV2Qr({ seed_b64: SEED, user_id: USER_ID, card_number: CARD, ttl_seconds: 30 })
    expect(out.qr.startsWith("nivy:v1:")).toBe(true)
    const rest = out.qr.slice("nivy:v1:".length)
    expect(rest.split(":")).toHaveLength(5)
  })

  it("signed QR round-trips through parse", () => {
    const out = signV2Qr({ seed_b64: SEED, user_id: USER_ID, card_number: CARD })
    const parsed = parseV2Qr(out.qr)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.user_id).toBe(USER_ID)
      expect(parsed.card_number).toBe(CARD)
      expect(parsed.exp_unix).toBe(out.exp_unix)
      expect(parsed.nonce).toBe(out.nonce)
    }
  })

  it("verifyV2Qr accepts a fresh signed payload", () => {
    const out = signV2Qr({ seed_b64: SEED, user_id: USER_ID, card_number: CARD })
    const parsed = parseV2Qr(out.qr)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(verifyV2Qr(parsed, SEED).ok).toBe(true)
    }
  })

  it("verifyV2Qr rejects expired payload", () => {
    // Build an expired QR by hand: parse a fresh one then mutate exp_unix in place.
    const out = signV2Qr({ seed_b64: SEED, user_id: USER_ID, card_number: CARD, ttl_seconds: 5 })
    const parsed = parseV2Qr(out.qr)
    if (!parsed.ok) throw new Error("parse failed")
    const expired = { ...parsed, exp_unix: Math.floor(Date.now() / 1000) - 60 }
    const v = verifyV2Qr(expired, SEED)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe("expired")
  })

  it("verifyV2Qr rejects bad HMAC (wrong seed)", () => {
    const out = signV2Qr({ seed_b64: SEED, user_id: USER_ID, card_number: CARD })
    const parsed = parseV2Qr(out.qr)
    if (!parsed.ok) throw new Error("parse failed")
    const v = verifyV2Qr(parsed, SEED_OTHER)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe("bad_signature")
  })

  it("parseV2Qr rejects TPVIP: format", () => {
    const r = parseV2Qr("TPVIP:user-1:card-1")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("wrong_prefix")
  })

  it("parseV2Qr rejects empty / random / wrong-field-count", () => {
    expect((parseV2Qr("") as any).reason).toBe("empty")
    expect((parseV2Qr("hello") as any).reason).toBe("wrong_prefix")
    expect((parseV2Qr("nivy:v1:onlytwo:fields") as any).reason).toBe("wrong_field_count")
  })

  it("isLegacyTpvipAllowed defaults to false (env unset)", () => {
    expect(isLegacyTpvipAllowed()).toBe(false)
  })

  it("isLegacyTpvipAllowed honors ALLOW_LEGACY_TPVIP_QR=true", () => {
    process.env.ALLOW_LEGACY_TPVIP_QR = "true"
    expect(isLegacyTpvipAllowed()).toBe(true)
  })
})
