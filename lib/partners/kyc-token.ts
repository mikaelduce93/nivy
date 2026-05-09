/**
 * Wave 3B.3 — partner KYC pre-auth token primitives.
 *
 * Server-only. The raw token is returned ONCE to the issuer (admin) and never
 * stored. Only the sha256(raw) is persisted. The token is single-use:
 * `verifyAndConsumeKycToken` flips `used_at` atomically.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import "server-only"

export interface IssuedKycToken {
  raw: string
  hash: string
  expires_at: string
}

const DEFAULT_TTL_DAYS = 7

export function issueKycToken(ttlDays: number = DEFAULT_TTL_DAYS): IssuedKycToken {
  const ttl = Math.min(Math.max(ttlDays, 1), 30)
  const raw = randomBytes(32).toString("base64url") // 43 chars
  const hash = sha256Hex(raw)
  const expires_at = new Date(Date.now() + ttl * 86400_000).toISOString()
  return { raw, hash, expires_at }
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

/**
 * Constant-time compare two hex strings of equal length. Used by callers
 * that want to compare a recomputed hash to a stored hash without leaking
 * timing.
 */
export function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const ab = Buffer.from(a, "hex")
  const bb = Buffer.from(b, "hex")
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
