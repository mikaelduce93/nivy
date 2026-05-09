/**
 * Wave 3A — canonical v2 scanner apply (canon §4.2).
 *
 * POST /api/partner/scanner/apply
 *   {
 *     qr_payload: 'nivy:v1:{user_id}:{card_number}:{exp_unix}:{nonce}:{hmac_sha256}',
 *     offer_id: uuid,
 *     purchase_amount: number,
 *     idempotency_key: uuid
 *   }
 *
 * Atomic via SECURITY DEFINER RPC `apply_partner_offer` (mig 099). Server
 * verifies the HMAC against the seed in `partner_qr_secret`. Replays are
 * rejected by the unique index on `qr_nonces.nonce`.
 *
 * Legacy `TPVIP:userId:cardNumber` payload is REJECTED unless
 * `ALLOW_LEGACY_TPVIP_QR=true` is set (default off — canon §6 F2).
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import {
  isLegacyTpvipAllowed,
  loadQrSecretSeed,
  parseV2Qr,
  verifyV2Qr,
} from "@/lib/partner/qr-v2"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  qr_payload: z.string().min(8).max(2048),
  offer_id: z.string().uuid(),
  purchase_amount: z.number().positive(),
  idempotency_key: z.string().uuid(),
})

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 },
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "invalid_body" },
      { status: 400 },
    )
  }

  // Reject legacy TPVIP unconditionally unless the env flag is on (off by default).
  if (body.qr_payload.startsWith("TPVIP:")) {
    if (!isLegacyTpvipAllowed()) {
      const sr = createServiceRoleClient()
      await sr.from("audit_log").insert({
        actor_id: userInfo.profileId,
        action: "partner_scanner.legacy_qr_rejected",
        resource_type: "partner_offer",
        resource_id: body.offer_id,
        metadata: { reason: "legacy_tpvip_disabled" },
      })
      return NextResponse.json(
        {
          success: false,
          error: "legacy_qr_rejected",
          message:
            "TPVIP: format is no longer accepted. Generate a fresh nivy:v1 QR.",
        },
        { status: 400 },
      )
    }
    // If the flag is on, fall through to the parse — but the strict v2 parser
    // will reject the prefix anyway. We log and surface a clearer error.
    return NextResponse.json(
      {
        success: false,
        error: "legacy_qr_format",
        message:
          "Legacy TPVIP fallback enabled but unsupported in v2 apply. Migrate the issuer.",
      },
      { status: 400 },
    )
  }

  const parsed = parseV2Qr(body.qr_payload)
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: "qr_parse_failed", reason: parsed.reason },
      { status: 400 },
    )
  }

  // Verify HMAC against the server-side seed (service role only).
  const sr = createServiceRoleClient()
  let seed: string
  try {
    seed = await loadQrSecretSeed(sr)
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "qr_secret_unavailable" },
      { status: 500 },
    )
  }
  const verify = verifyV2Qr(parsed, seed)
  if (!verify.ok) {
    await sr.from("audit_log").insert({
      actor_id: userInfo.profileId,
      action: "partner_scanner.verify_failed",
      resource_type: "partner_offer",
      resource_id: body.offer_id,
      metadata: { reason: verify.reason },
    })
    return NextResponse.json(
      { success: false, error: verify.reason },
      { status: 400 },
    )
  }

  // Resolve the VIP card to confirm `card_number` matches `user_id`.
  const { data: vipCard } = await sr
    .from("vip_cards")
    .select("card_number, profile_id, status, end_date")
    .eq("card_number", parsed.card_number)
    .maybeSingle()
  if (!vipCard) {
    return NextResponse.json(
      { success: false, error: "card_not_found" },
      { status: 404 },
    )
  }
  if (vipCard.profile_id !== parsed.user_id) {
    return NextResponse.json(
      { success: false, error: "card_user_mismatch" },
      { status: 400 },
    )
  }
  if (vipCard.status !== "active") {
    return NextResponse.json(
      { success: false, error: "card_inactive", card_status: vipCard.status },
      { status: 400 },
    )
  }
  if (vipCard.end_date && new Date(vipCard.end_date).getTime() < Date.now()) {
    return NextResponse.json(
      { success: false, error: "card_expired" },
      { status: 400 },
    )
  }

  // Atomic apply via the canonical RPC. The RPC writes nonce, increments
  // counter, writes discount_usage, all in one transaction. auth.uid() is
  // resolved from the cookie session to authorize the partner staff row.
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("apply_partner_offer", {
    p_offer_id: body.offer_id,
    p_member_user_id: parsed.user_id,
    p_purchase_amount: body.purchase_amount,
    p_idempotency_key: body.idempotency_key,
    p_nonce: parsed.nonce,
    p_qr_exp_unix: parsed.exp_unix,
  })
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
  const result = data as { success?: boolean; error?: string } | null
  if (!result?.success) {
    return NextResponse.json(
      { success: false, error: result?.error ?? "rpc_failed", detail: result },
      { status: 400 },
    )
  }

  return NextResponse.json(result)
}
