import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import { signV2Qr, loadQrSecretSeed } from "@/lib/partner/qr-v2"

/**
 * GET /api/teen/vip-qr — issue a fresh signed `nivy:v1` QR for the logged-in
 * teen's active VIP card (issue #27, bullet c).
 *
 * This is the first real (non-test) caller of signV2Qr: the partner scanner
 * (/api/partner/scanner/apply) verifies exactly this payload. The QR is
 * short-lived (signV2Qr default TTL) and must be refetched as it expires.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Teen reads their own card (vip_cards RLS self-read).
    const { data: card } = await supabase
      .from("vip_cards")
      .select("card_number, status, expiry_date")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .gte("expiry_date", new Date().toISOString().split("T")[0])
      .order("issue_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!card) {
      return NextResponse.json(
        { error: "no_active_card", message: "Aucune carte VIP active." },
        { status: 404 }
      )
    }

    // The signing seed is service-role only.
    const sr = createServiceRoleClient()
    const seed = await loadQrSecretSeed(sr)
    const signed = signV2Qr({
      seed_b64: seed,
      user_id: user.id,
      card_number: card.card_number,
    })

    return NextResponse.json({
      qr: signed.qr,
      cardNumber: signed.card_number,
      expiresAt: signed.exp_unix,
    })
  } catch (error: any) {
    console.error("[teen/vip-qr] Error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
