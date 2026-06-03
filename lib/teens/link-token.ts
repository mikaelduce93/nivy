/**
 * V11 #296 — parent↔teen link token primitives (socle Pilier B).
 *
 * Server-only. Modelled on `lib/partners/kyc-token.ts`: the raw token lives in
 * the QR only; only sha256(raw) is persisted in `teen_link_tokens`. Single-use
 * via `used_at` (atomic flip guarded by `.is('used_at', null)`).
 */

import { randomBytes } from "node:crypto"
import "server-only"
import { sha256Hex } from "@/lib/partners/kyc-token"

export type LinkDirection = "teen_to_parent" | "parent_to_teen"

export interface IssuedLinkToken {
  raw: string
  hash: string
  expires_at: string
}

const DEFAULT_TTL_SECONDS = 300 // presentiel default (5 min)
const MAX_TTL_SECONDS = 86_400 // 24h cap (shareable link)

/** Mint a fresh single-use link token. Raw is 256-bit base64url (no `:`). */
export function issueTeenLinkToken(ttlSeconds: number = DEFAULT_TTL_SECONDS): IssuedLinkToken {
  const ttl = Math.min(Math.max(ttlSeconds, 30), MAX_TTL_SECONDS)
  const raw = randomBytes(32).toString("base64url")
  const hash = sha256Hex(raw)
  const expires_at = new Date(Date.now() + ttl * 1000).toISOString()
  return { raw, hash, expires_at }
}

export interface LinkTokenRow {
  id: string
  direction: LinkDirection
  teen_id: string | null
  parent_id: string | null
  expires_at: string
  used_at: string | null
}

export type ConsumeResult =
  | { ok: true; row: LinkTokenRow }
  | { ok: false; reason: "invalid_token" | "already_used" | "expired" | "wrong_direction" }

type ServiceClient = { from: (table: string) => any }

/**
 * Look up a raw link token, validate it (exists / not used / not expired /
 * direction), then atomically flip `used_at` (single-use). Returns the row on
 * success. The atomic flip uses `.is('used_at', null)` so concurrent scans
 * can't both consume the same token.
 */
export async function consumeTeenLinkToken(
  sr: ServiceClient,
  rawToken: string,
  opts: { expectedDirection?: LinkDirection; usedBy?: string } = {},
): Promise<ConsumeResult> {
  const tokenHash = sha256Hex(rawToken)

  const { data: row } = await sr
    .from("teen_link_tokens")
    .select("id, direction, teen_id, parent_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (!row) return { ok: false, reason: "invalid_token" }
  if (row.used_at) return { ok: false, reason: "already_used" }
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" }
  if (opts.expectedDirection && row.direction !== opts.expectedDirection) {
    return { ok: false, reason: "wrong_direction" }
  }

  // Atomic single-use flip — guarded on used_at IS NULL.
  const { data: updated, error: updErr } = await sr
    .from("teen_link_tokens")
    .update({ used_at: new Date().toISOString(), used_by: opts.usedBy ?? null })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle()

  if (updErr || !updated) return { ok: false, reason: "already_used" }

  return { ok: true, row: row as LinkTokenRow }
}
