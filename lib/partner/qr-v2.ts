/**
 * Wave 3A — canonical v2 partner-scanner QR helpers (canon §4.2).
 *
 * Format:
 *   nivy:v1:{user_id}:{card_number}:{exp_unix}:{nonce}:{hmac_sha256}
 *
 * - HMAC seed lives in `partner_qr_secret.secret_b64` (single-row table,
 *   service-role only). Never logged. Never returned to the client.
 * - Nonces are random 16-byte hex strings, single-use (`qr_nonces` table).
 * - Default issuance window: 60 seconds (canon §4.2 — short-lived).
 * - Backward-compat with the legacy `TPVIP:userId:cardNumber` format is
 *   gated by env flag `ALLOW_LEGACY_TPVIP_QR=true`. Default OFF.
 *
 * Server-only module — imports `node:crypto`. Never bundle this client-side.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import "server-only"

export interface SignedQrPayload {
  qr: string
  user_id: string
  card_number: string
  exp_unix: number
  nonce: string
}

export interface ParsedV2Qr {
  ok: true
  user_id: string
  card_number: string
  exp_unix: number
  nonce: string
  hmac_b64: string
}

export interface QrParseFailure {
  ok: false
  reason:
    | "empty"
    | "wrong_prefix"
    | "wrong_field_count"
    | "invalid_exp_unix"
    | "invalid_user_id"
    | "invalid_card_number"
    | "invalid_nonce"
    | "invalid_hmac"
    | "expired"
    | "bad_signature"
}

const MAX_TTL_SECONDS = 300 // hard cap (5 min)
const DEFAULT_TTL_SECONDS = 60 // canon-recommended short window

function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
}

function newNonce(): string {
  return randomBytes(16).toString("hex")
}

function canonicalPayload(
  user_id: string,
  card_number: string,
  exp_unix: number,
  nonce: string,
): string {
  return `${user_id}:${card_number}:${exp_unix}:${nonce}`
}

function hmacB64(seed_b64: string, payload: string): string {
  const key = Buffer.from(seed_b64, "base64")
  return createHmac("sha256", key).update(payload).digest("base64")
}

export function isLegacyTpvipAllowed(): boolean {
  return process.env.ALLOW_LEGACY_TPVIP_QR === "true"
}

/**
 * Sign a fresh v2 QR. Caller MUST have already loaded the seed via
 * `loadQrSecretSeed()` (service-role) — we never read env or storage here.
 */
export function signV2Qr(opts: {
  seed_b64: string
  user_id: string
  card_number: string
  ttl_seconds?: number
}): SignedQrPayload {
  const ttl = Math.min(opts.ttl_seconds ?? DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS)
  const exp_unix = nowUnix() + ttl
  const nonce = newNonce()
  const payload = canonicalPayload(opts.user_id, opts.card_number, exp_unix, nonce)
  const sig = hmacB64(opts.seed_b64, payload)
  const qr = `nivy:v1:${opts.user_id}:${opts.card_number}:${exp_unix}:${nonce}:${sig}`
  return { qr, user_id: opts.user_id, card_number: opts.card_number, exp_unix, nonce }
}

/** Pure parse — does NOT verify the HMAC (separate step that needs the seed). */
export function parseV2Qr(qr: string): ParsedV2Qr | QrParseFailure {
  if (!qr || typeof qr !== "string") return { ok: false, reason: "empty" }
  if (!qr.startsWith("nivy:v1:")) return { ok: false, reason: "wrong_prefix" }
  const rest = qr.slice("nivy:v1:".length)
  const parts = rest.split(":")
  if (parts.length !== 5) return { ok: false, reason: "wrong_field_count" }
  const [user_id, card_number, exp_str, nonce, hmac_b64] = parts
  if (!user_id) return { ok: false, reason: "invalid_user_id" }
  if (!card_number) return { ok: false, reason: "invalid_card_number" }
  const exp_unix = Number(exp_str)
  if (!Number.isFinite(exp_unix) || exp_unix <= 0) {
    return { ok: false, reason: "invalid_exp_unix" }
  }
  if (!nonce || nonce.length < 16) return { ok: false, reason: "invalid_nonce" }
  if (!hmac_b64 || hmac_b64.length < 16) return { ok: false, reason: "invalid_hmac" }
  return { ok: true, user_id, card_number, exp_unix, nonce, hmac_b64 }
}

/**
 * Verify a parsed v2 QR against the seed. Constant-time HMAC compare.
 * Caller validates exp_unix vs current time (DB RPC also rechecks).
 */
export function verifyV2Qr(
  parsed: ParsedV2Qr,
  seed_b64: string,
): { ok: true } | { ok: false; reason: "expired" | "bad_signature" } {
  if (parsed.exp_unix < nowUnix()) return { ok: false, reason: "expired" }
  const expected = hmacB64(
    seed_b64,
    canonicalPayload(parsed.user_id, parsed.card_number, parsed.exp_unix, parsed.nonce),
  )
  const a = Buffer.from(parsed.hmac_b64, "base64")
  const b = Buffer.from(expected, "base64")
  if (a.length !== b.length) return { ok: false, reason: "bad_signature" }
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "bad_signature" }
  return { ok: true }
}

/** Resolve the server-side HMAC seed from `partner_qr_secret`. Service-role only. */
export async function loadQrSecretSeed(
  serviceRole: { from: (table: string) => any },
): Promise<string> {
  const { data, error } = await serviceRole
    .from("partner_qr_secret")
    .select("secret_b64")
    .eq("id", 1)
    .maybeSingle()
  if (error) throw new Error(`partner_qr_secret read failed: ${error.message}`)
  if (!data?.secret_b64) throw new Error("partner_qr_secret_missing")
  return data.secret_b64 as string
}
