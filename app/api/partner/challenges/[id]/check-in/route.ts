import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

// ----------------------------------------------------------------------
// TICKET-027 [partner-defi] Partner challenge check-in
//
// Sibling route to /api/partner/apply-discount. Where apply-discount is
// fired by the scanner when the partner picks a `discount` offer, this
// route is fired when the picked offer has `offer_type = 'challenge'`.
//
// Contract:
//   POST /api/partner/challenges/:id/check-in
//   Body: { memberId: string }   // teen profile id from verify-card
//
// On success the route:
//   1. validates the offer exists, is active, has type='challenge',
//      lives inside its valid_from/valid_until window, and is owned
//      by the calling partner;
//   2. enforces the per-teen cap (max_check_ins, default 1) inside the
//      rolling check_in_window_days (NULL = lifetime cap);
//   3. inserts a partner_challenge_check_ins row;
//   4. awards xp_reward via add_xp_to_user(...) — same XP pipeline as
//      every other surface, so the level recompute / xp_transactions
//      tail follows automatically.
//
// Failure modes return JSON with success=false + an explicit message.
// ----------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "partner") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { id: offerId } = await context.params
    if (!offerId) {
      return NextResponse.json(
        { success: false, error: "Identifiant de défi manquant" },
        { status: 400 }
      )
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("id, company_name")
      .eq("email", userInfo.email)
      .single()

    if (!partner) {
      return NextResponse.json(
        { success: false, error: "Partenaire non trouvé" },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const memberId = (body as { memberId?: string }).memberId

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json(
        { success: false, error: "Membre manquant" },
        { status: 400 }
      )
    }

    // ---- 1. Load + validate the offer ----
    const { data: offer, error: offerError } = await supabase
      .from("partner_offers")
      .select(
        "id, partner_id, title, offer_type, is_active, valid_from, valid_until, xp_reward, max_check_ins, check_in_window_days"
      )
      .eq("id", offerId)
      .eq("partner_id", partner.id)
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { success: false, error: "Défi introuvable" },
        { status: 404 }
      )
    }

    if (offer.offer_type !== "challenge") {
      return NextResponse.json(
        { success: false, error: "Cette offre n'est pas un défi" },
        { status: 400 }
      )
    }

    if (!offer.is_active) {
      return NextResponse.json(
        { success: false, error: "Ce défi n'est plus actif" },
        { status: 400 }
      )
    }

    const now = new Date()
    const validFromOk = !offer.valid_from || new Date(offer.valid_from) <= now
    const validUntilOk = !offer.valid_until || new Date(offer.valid_until) >= now
    if (!validFromOk || !validUntilOk) {
      return NextResponse.json(
        { success: false, error: "Ce défi n'est pas valide actuellement" },
        { status: 400 }
      )
    }

    // ---- 2. Confirm the member is a teen ----
    const { data: memberProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", memberId)
      .single()

    if (!memberProfile || memberProfile.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Le check-in n'est ouvert qu'aux teens" },
        { status: 400 }
      )
    }

    // ---- 3. Enforce per-teen cap inside the rolling window ----
    const cap = offer.max_check_ins ?? 1
    const windowDays = offer.check_in_window_days
    let countQuery = supabase
      .from("partner_challenge_check_ins")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offer.id)
      .eq("teen_id", memberId)

    if (windowDays && windowDays > 0) {
      const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
      countQuery = countQuery.gte("scanned_at", since.toISOString())
    }

    const { count: existingCount, error: countError } = await countQuery
    if (countError) {
      console.error("partner challenge check-in count error", countError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la vérification" },
        { status: 500 }
      )
    }

    if ((existingCount ?? 0) >= cap) {
      return NextResponse.json(
        {
          success: false,
          error:
            windowDays && windowDays > 0
              ? `Ce teen a déjà atteint la limite (${cap}) sur la fenêtre de ${windowDays} jours`
              : `Ce teen a déjà atteint la limite (${cap}) pour ce défi`,
        },
        { status: 400 }
      )
    }

    // ---- 4. Award XP via the canonical pipeline ----
    const xpReward = Math.max(0, offer.xp_reward ?? 0)
    let xpAwarded = 0
    if (xpReward > 0) {
      const { data: xpResult, error: xpError } = await supabase.rpc(
        "add_xp_to_user",
        {
          p_teen_id: memberId,
          p_xp_amount: xpReward,
          p_source_type: "partner_challenge",
          p_source_category: "partner",
          p_source_id: offer.id,
          p_description: `Check-in défi partenaire — ${offer.title}`,
        }
      )

      if (xpError) {
        console.error("add_xp_to_user failed for partner challenge", xpError)
        return NextResponse.json(
          { success: false, error: "Erreur lors de l'attribution des XP" },
          { status: 500 }
        )
      }

      const xpResultRecord = (xpResult ?? null) as { xp_gained?: number } | null
      xpAwarded = xpResultRecord?.xp_gained ?? xpReward
    }

    // ---- 5. Capture the check-in row ----
    const { data: insertedRow, error: insertError } = await supabase
      .from("partner_challenge_check_ins")
      .insert({
        offer_id: offer.id,
        teen_id: memberId,
        partner_id: partner.id,
        scanner_user_id: userInfo.profileId,
        scanned_at: now.toISOString(),
        xp_awarded: xpAwarded,
      })
      .select("id, scanned_at")
      .single()

    if (insertError) {
      console.error("partner challenge check-in insert failed", insertError)
      return NextResponse.json(
        { success: false, error: "Impossible d'enregistrer le check-in" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Check-in enregistré",
      data: {
        checkInId: insertedRow?.id ?? null,
        offerId: offer.id,
        offerTitle: offer.title,
        teenId: memberId,
        xpAwarded,
        scannedAt: insertedRow?.scanned_at ?? now.toISOString(),
        capRemaining: Math.max(0, cap - ((existingCount ?? 0) + 1)),
      },
    })
  } catch (error) {
    console.error("Partner challenge check-in API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
