/**
 * V11 #296 — parent↔teen link QR + token socle.
 *
 * Verifies:
 *   1. signLinkQr → parseLinkQr round-trip, nivy:link:v1 prefix, 5 fields.
 *   2. verifyLinkQr accepts a fresh payload, rejects expired / bad seed / tamper.
 *   3. Cross-format isolation: a VIP nivy:v1 QR does not parse as a link QR and
 *      vice-versa (prefix + `link:` domain separation).
 *   4. issueTeenLinkToken persists sha256(raw), raw is colon-free, TTL in future.
 */
import { describe, expect, it } from "vitest"
import {
  parseLinkQr,
  parseV2Qr,
  signLinkQr,
  signV2Qr,
  verifyLinkQr,
} from "@/lib/partner/qr-v2"
import { issueTeenLinkToken } from "@/lib/teens/link-token"
import { sha256Hex } from "@/lib/partners/kyc-token"

const SEED = Buffer.from("nivy-test-seed-32-bytes-for-hmac-sha256-x").toString("base64")
const SEED_OTHER = Buffer.from("nivy-other-seed-32-bytes-for-hmac-sha256").toString("base64")
const SUBJECT = "22222222-2222-2222-2222-222222222222"
const TOKEN = "abcdefabcdefabcdefabcdefabcdefab" // colon-free, >=16

describe("link QR (nivy:link:v1)", () => {
  it("signs with the nivy:link:v1 prefix and 5 colon-separated fields", () => {
    const out = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN, ttl_seconds: 300 })
    expect(out.qr.startsWith("nivy:link:v1:")).toBe(true)
    expect(out.qr.slice("nivy:link:v1:".length).split(":")).toHaveLength(5)
  })

  it("round-trips through parse", () => {
    const out = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN })
    const parsed = parseLinkQr(out.qr)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.subject_id).toBe(SUBJECT)
      expect(parsed.token).toBe(TOKEN)
    }
  })

  it("verifies a fresh payload", () => {
    const out = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN, ttl_seconds: 300 })
    const parsed = parseLinkQr(out.qr)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(verifyLinkQr(parsed, SEED).ok).toBe(true)
  })

  it("rejects an expired payload", () => {
    const out = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN, ttl_seconds: -10 })
    const parsed = parseLinkQr(out.qr)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const v = verifyLinkQr(parsed, SEED)
      expect(v.ok).toBe(false)
      if (!v.ok) expect(v.reason).toBe("expired")
    }
  })

  it("rejects a wrong seed", () => {
    const out = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN, ttl_seconds: 300 })
    const parsed = parseLinkQr(out.qr)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const v = verifyLinkQr(parsed, SEED_OTHER)
      expect(v.ok).toBe(false)
      if (!v.ok) expect(v.reason).toBe("bad_signature")
    }
  })

  it("rejects a tampered token", () => {
    const out = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN, ttl_seconds: 300 })
    const tampered = out.qr.replace(TOKEN, TOKEN.replace("a", "b"))
    const parsed = parseLinkQr(tampered)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(verifyLinkQr(parsed, SEED).ok).toBe(false)
  })

  it("is isolated from the VIP nivy:v1 format (prefix + domain)", () => {
    const link = signLinkQr({ seed_b64: SEED, subject_id: SUBJECT, token: TOKEN })
    const vip = signV2Qr({ seed_b64: SEED, user_id: SUBJECT, card_number: "VIP-1" })
    // A VIP QR cannot parse as a link QR, and a link QR cannot parse as VIP.
    expect(parseLinkQr(vip.qr).ok).toBe(false)
    expect(parseV2Qr(link.qr).ok).toBe(false)
  })
})

describe("issueTeenLinkToken", () => {
  it("stores sha256(raw), raw is colon-free, expiry is in the future", () => {
    const t = issueTeenLinkToken(300)
    expect(t.hash).toBe(sha256Hex(t.raw))
    expect(t.raw.includes(":")).toBe(false)
    expect(new Date(t.expires_at).getTime()).toBeGreaterThan(Date.now())
  })
})
