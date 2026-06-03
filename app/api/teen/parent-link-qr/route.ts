/**
 * GET /api/teen/parent-link-qr — V11 #297 (sens ado→parent, émetteur).
 *
 * Émet un QR de liaison `nivy:link:v1` que l'ado affiche pour que SON parent le
 * scanne (/parent/scan-teen, #298). Découplé de `vip_cards` (contrairement à
 * /api/teen/vip-qr qui exige une carte active). Token single-use court (300s
 * présentiel) persisté dans teen_link_tokens (socle #296).
 */
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { loadQrSecretSeed, signLinkQr } from "@/lib/partner/qr-v2"
import { issueTeenLinkToken } from "@/lib/teens/link-token"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TTL_SECONDS = 300 // présentiel : 5 min

export async function GET() {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
    }

    const sr = createServiceRoleClient()
    const token = issueTeenLinkToken(TTL_SECONDS)

    const { error: insErr } = await sr.from("teen_link_tokens").insert({
      direction: "teen_to_parent",
      teen_id: userInfo.profileId,
      token_hash: token.hash,
      issued_by: userInfo.profileId,
      expires_at: token.expires_at,
    })
    if (insErr) {
      console.error("[teen/parent-link-qr] token insert failed:", insErr.message)
      return NextResponse.json({ error: "token_insert_failed" }, { status: 500 })
    }

    const seed = await loadQrSecretSeed(sr)
    const signed = signLinkQr({
      seed_b64: seed,
      subject_id: userInfo.profileId,
      token: token.raw,
      ttl_seconds: TTL_SECONDS,
    })

    return NextResponse.json({ qr: signed.qr, expiresAt: signed.exp_unix })
  } catch (error: any) {
    console.error("[teen/parent-link-qr] Error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
