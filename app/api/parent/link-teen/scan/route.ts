/**
 * POST /api/parent/link-teen/scan — V11 #298 (sens ado→parent, côté scan).
 *
 * Le parent scanne le QR `nivy:link:v1` affiché par l'ado. On reprend le
 * squelette parse→verify de /api/partner/scanner/apply mais on consomme un
 * `teen_link_tokens` (socle #296) au lieu d'une carte VIP, puis on déclenche la
 * cascade de liaison atomique (#301). Gated `role==='parent'`.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { loadQrSecretSeed, parseLinkQr, verifyLinkQr } from "@/lib/partner/qr-v2"
import { consumeTeenLinkToken } from "@/lib/teens/link-token"
import { linkParentTeen } from "@/lib/teens/link-cascade"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({ qr_payload: z.string().min(8).max(2048) })

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
  }

  // 1. Parse + verify the link QR (format + HMAC + expiry).
  const parsed = parseLinkQr(body.qr_payload)
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: "invalid_qr", reason: parsed.reason },
      { status: 400 },
    )
  }

  const sr = createServiceRoleClient()
  const seed = await loadQrSecretSeed(sr)
  const verified = verifyLinkQr(parsed, seed)
  if (!verified.ok) {
    return NextResponse.json(
      { success: false, error: verified.reason }, // 'expired' | 'bad_signature'
      { status: verified.reason === "expired" ? 410 : 401 },
    )
  }

  // 2. Consume the single-use token (teen_to_parent direction).
  const consumed = await consumeTeenLinkToken(sr, parsed.token, {
    expectedDirection: "teen_to_parent",
    usedBy: userInfo.profileId,
  })
  if (!consumed.ok) {
    const status = consumed.reason === "expired" ? 410 : consumed.reason === "already_used" ? 409 : 400
    return NextResponse.json({ success: false, error: consumed.reason }, { status })
  }

  const teenId = consumed.row.teen_id
  // The QR subject_id must match the token's teen (anti-substitution).
  if (!teenId || parsed.subject_id !== teenId) {
    return NextResponse.json({ success: false, error: "subject_mismatch" }, { status: 400 })
  }

  // 3. Atomic link parent ↔ teen (active) via the factored cascade (#301).
  const result = await linkParentTeen(sr, {
    parentId: userInfo.profileId,
    teenId,
    status: "active",
    channel: "qr_teen_to_parent",
    actorId: userInfo.profileId,
    actorRole: "parent",
  })
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.reason }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { teenId, linkId: result.linkId, alreadyLinked: result.alreadyActive },
    message: result.alreadyActive ? "Ce teen est déjà lié à ton compte." : "Liaison réussie.",
  })
}
