/**
 * Wave Ops-D — Shared PSP webhook plumbing for Cash Plus / Wafacash / M2T.
 *
 * Each provider has its own signature header & payload shape, but the post-
 * verification path is identical:
 *   1. Parse provider payload → normalised TopupEvent.
 *   2. Resolve parent_id from psp_customer_ref / phone (best-effort).
 *   3. Idempotency: if (provider, provider_ref) already in payment_transactions
 *      with status='succeeded', no-op.
 *   4. ENV gate `PSP_AUTO_TOPUP_ENABLED`:
 *        - true  → call top_up_teen RPC (5-arg) via service-role.
 *        - false → log only ("would have credited X DH"), do not credit.
 *   5. ALWAYS return 200 to prevent provider retries (we log failures).
 *
 * Founder: when ready to flip auto mode on, set PSP_AUTO_TOPUP_ENABLED=true in
 * Vercel env and redeploy. See docs/vision/ops-runbooks/05-psp-activation.md.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import crypto from "node:crypto"

export type PSPProvider = "cashplus" | "wafacash" | "m2t"

export interface NormalisedTopupEvent {
  provider: PSPProvider
  /** Provider-side unique transaction reference (idempotency key). */
  providerRef: string
  amountDh: number
  /** Free-form metadata the provider sends — phone, parent CIN, etc. */
  raw: Record<string, unknown>
  /** Hint we use to locate the parent. Provider may send phone, CIN, or our linkRef. */
  parentHint?: {
    phone?: string
    cin?: string
    linkRef?: string
    parentId?: string
    teenId?: string
  }
}

export interface ProcessResult {
  ok: boolean
  reason?: string
  paymentId?: string
  idempotentReplay?: boolean
  autoCreditEnabled: boolean
}

/**
 * Constant-time HMAC verifier.
 * Most Moroccan PSPs ship hex- or base64-encoded HMAC-SHA256 of the raw body.
 * Each provider route calls this with its own secret + algorithm.
 */
export function verifyHmacSignature(opts: {
  rawBody: Buffer | string
  signatureHeader: string | null
  secret: string
  algorithm?: "sha256" | "sha512"
  encoding?: "hex" | "base64"
}): boolean {
  const { rawBody, signatureHeader, secret } = opts
  if (!signatureHeader || !secret) return false
  const algo = opts.algorithm ?? "sha256"
  const enc = opts.encoding ?? "hex"

  const computed = crypto
    .createHmac(algo, secret)
    .update(typeof rawBody === "string" ? rawBody : rawBody)
    .digest(enc)

  // The provider may prefix (e.g. "sha256="). Normalise both sides.
  const provided = signatureHeader.replace(/^[a-zA-Z0-9_+-]+=/, "").trim()
  const a = Buffer.from(computed)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function readRawBody(request: Request): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = request.body?.getReader()
  if (!reader) return Buffer.from("")
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

/**
 * Look up (parent, teen) pair from a provider hint. Strategy:
 *   1. If parentHint.parentId + teenId are both present → use directly.
 *   2. If linkRef present → match against profiles.psp_customer_ref (column
 *      may not exist — best-effort, returns null on miss).
 *   3. If phone present → match profiles.phone.
 *   4. Fallback: null. Caller decides whether to drop or queue for manual.
 */
async function resolveParentTeen(
  hint: NormalisedTopupEvent["parentHint"]
): Promise<{ parentId: string; teenId: string } | null> {
  if (!hint) return null
  const sr = createServiceRoleClient()

  if (hint.parentId && hint.teenId) {
    const { data: link } = await sr
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", hint.parentId)
      .eq("teen_id", hint.teenId)
      .maybeSingle()
    if (link) return { parentId: hint.parentId, teenId: hint.teenId }
  }

  // Try phone lookup → parent profile, then pick first linked teen.
  if (hint.phone) {
    const { data: parent } = await sr
      .from("profiles")
      .select("id, role")
      .eq("phone", hint.phone)
      .eq("role", "parent")
      .maybeSingle()
    if (parent) {
      const { data: link } = await sr
        .from("parent_teen_links")
        .select("teen_id")
        .eq("parent_id", parent.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
      if (link?.teen_id) return { parentId: parent.id, teenId: link.teen_id }
    }
  }

  return null
}

/**
 * Common post-parse path: idempotency check, env gate, RPC call, audit log.
 * Always returns — caller maps to a 200 response regardless of internal outcome.
 */
export async function processTopupEvent(
  event: NormalisedTopupEvent
): Promise<ProcessResult> {
  const autoCreditEnabled = process.env.PSP_AUTO_TOPUP_ENABLED === "true"
  const sr = createServiceRoleClient()

  // 1. Idempotency: check payment_transactions UNIQUE on (provider, ref).
  const { data: existing } = await sr
    .from("payment_transactions")
    .select("id, status")
    .eq("psp_provider", event.provider)
    .eq("psp_reference", event.providerRef)
    .maybeSingle()

  if (existing && existing.status === "succeeded") {
    console.log(
      `[psp-webhook][${event.provider}] idempotent replay ref=${event.providerRef} → existing=${existing.id}`
    )
    return {
      ok: true,
      idempotentReplay: true,
      paymentId: existing.id,
      autoCreditEnabled,
    }
  }

  // 2. Resolve parent/teen.
  const link = await resolveParentTeen(event.parentHint)

  // Always log the inbound event for audit / triage.
  try {
    await sr.from("admin_audit_logs").insert({
      user_id: null,
      action: "psp.webhook.received",
      target_type: event.provider,
      target_id: event.providerRef,
      payload: {
        provider: event.provider,
        provider_ref: event.providerRef,
        amount_dh: event.amountDh,
        parent_hint: event.parentHint ?? null,
        resolved_link: link,
        auto_credit_enabled: autoCreditEnabled,
        raw: event.raw,
        received_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.warn("[psp-webhook] audit log insert failed", e)
  }

  // 3. ENV-gated: skip RPC when manual mode is still active.
  if (!autoCreditEnabled) {
    console.log(
      `[psp-webhook][${event.provider}] PSP_AUTO_TOPUP_ENABLED=false — logged but not credited (ref=${event.providerRef}, amount=${event.amountDh} DH)`
    )
    return {
      ok: true,
      reason: "auto_topup_disabled",
      autoCreditEnabled: false,
    }
  }

  if (!link) {
    console.warn(
      `[psp-webhook][${event.provider}] cannot resolve parent/teen for ref=${event.providerRef} — manual reconciliation required`
    )
    return {
      ok: false,
      reason: "parent_teen_not_resolved",
      autoCreditEnabled,
    }
  }

  // 4. Credit via 5-arg top_up_teen RPC.
  const { data, error } = await sr.rpc("top_up_teen", {
    p_parent_id: link.parentId,
    p_teen_id: link.teenId,
    p_amount_dh: event.amountDh,
    p_provider: event.provider,
    p_provider_ref: event.providerRef,
  })

  if (error) {
    console.error(
      `[psp-webhook][${event.provider}] top_up_teen RPC failed for ref=${event.providerRef}:`,
      error
    )
    return { ok: false, reason: error.message, autoCreditEnabled }
  }

  if (!data?.success) {
    console.warn(
      `[psp-webhook][${event.provider}] RPC returned non-success for ref=${event.providerRef}:`,
      data
    )
    return { ok: false, reason: data?.error ?? "rpc_failed", autoCreditEnabled }
  }

  console.log(
    `[psp-webhook][${event.provider}] credited ref=${event.providerRef} → payment=${data.payment_id} amount=${event.amountDh} DH`
  )
  return {
    ok: true,
    paymentId: data.payment_id,
    idempotentReplay: data.idempotent_replay === true,
    autoCreditEnabled,
  }
}
