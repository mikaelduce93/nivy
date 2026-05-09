/**
 * Wave 3B.3 — KYC token primitive sanity.
 *
 * Verifies that issueKycToken / sha256Hex / timingSafeHexEqual are
 * non-leaky and behave the way the routes expect.
 */
import { describe, expect, it } from "vitest"
import { issueKycToken, sha256Hex, timingSafeHexEqual } from "@/lib/partners/kyc-token"

describe("kyc-token primitives", () => {
  it("issueKycToken returns raw, hash, and a future ISO expiry", () => {
    const t = issueKycToken(7)
    expect(t.raw.length).toBeGreaterThanOrEqual(40)
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(new Date(t.expires_at).getTime()).toBeGreaterThan(Date.now())
  })

  it("sha256(raw) matches the stored hash (round-trip)", () => {
    const t = issueKycToken(1)
    expect(sha256Hex(t.raw)).toBe(t.hash)
  })

  it("two issuances are distinct (random nonces)", () => {
    const a = issueKycToken(1)
    const b = issueKycToken(1)
    expect(a.raw).not.toBe(b.raw)
    expect(a.hash).not.toBe(b.hash)
  })

  it("issueKycToken clamps ttl to [1, 30] days", () => {
    const small = issueKycToken(0)
    const large = issueKycToken(999)
    const oneDay = Date.now() + 1 * 86_400_000
    const thirtyDays = Date.now() + 30 * 86_400_000
    expect(new Date(small.expires_at).getTime()).toBeGreaterThanOrEqual(oneDay - 1000)
    expect(new Date(large.expires_at).getTime()).toBeLessThanOrEqual(thirtyDays + 1000)
  })

  it("timingSafeHexEqual is true for equal hex, false otherwise", () => {
    const t = issueKycToken(1)
    expect(timingSafeHexEqual(t.hash, t.hash)).toBe(true)
    expect(timingSafeHexEqual(t.hash, t.hash.replace(/.$/, "0"))).toBe(false)
    expect(timingSafeHexEqual("ab", "abc")).toBe(false) // length mismatch
  })
})
