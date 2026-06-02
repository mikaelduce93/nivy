import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/teen/partners/buy
 * V6 boutiques partenaires (#232) — achat d'une offre partenaire avec des coins.
 *
 * Body: { offerId: string }
 * Appelle la RPC live `purchase_partner_offer(p_offer_id, p_teen_id, p_idempotency_key)`.
 * Le teen === auth.uid(). Une clé d'idempotence fraîche est générée par tentative
 * (les retours réseau se dédupliquent côté RPC).
 *
 * La réponse de la RPC est relayée honnêtement : aucun faux succès. Les codes
 * d'erreur sont mappés vers des messages FR + un statut HTTP cohérent.
 */

// Codes d'erreur du contrat RPC → message FR + statut HTTP.
const ERROR_MAP: Record<string, { message: string; status: number }> = {
  offer_not_found: { message: "Cette offre n'existe plus.", status: 404 },
  offer_unavailable: { message: "Cette offre n'est pas disponible.", status: 409 },
  offer_out_of_window: { message: "Cette offre n'est pas valable en ce moment.", status: 409 },
  offer_not_purchasable: {
    message: "Cette offre ne s'achète pas avec des coins.",
    status: 409,
  },
  offer_sold_out: { message: "Cette offre est épuisée.", status: 409 },
  user_limit_reached: {
    message: "Tu as déjà atteint la limite pour cette offre.",
    status: 409,
  },
  vip_required: { message: "Cette offre est réservée aux membres VIP.", status: 403 },
  vip_level_too_low: {
    message: "Ton niveau VIP est trop bas pour cette offre.",
    status: 403,
  },
  insufficient_balance: {
    message: "Tu n'as pas assez de coins pour cette offre.",
    status: 402,
  },
  no_wallet: { message: "Aucun portefeuille trouvé sur ton compte.", status: 409 },
  unauthorized_caller: { message: "Action non autorisée.", status: 403 },
}

function friendlyError(code: string | undefined): { message: string; status: number } {
  if (code && ERROR_MAP[code]) return ERROR_MAP[code]
  return { message: "L'achat n'a pas pu être effectué.", status: 400 }
}

export async function POST(request: NextRequest) {
  try {
    let body: { offerId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const offerId = typeof body.offerId === "string" ? body.offerId : ""
    if (!offerId) {
      return NextResponse.json({ error: "offerId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase.rpc("purchase_partner_offer", {
      p_offer_id: offerId,
      p_teen_id: user.id,
      p_idempotency_key: randomUUID(),
    })

    if (error) {
      console.error("[teen/partners/buy] rpc error:", error)
      return NextResponse.json(
        { success: false, error: "L'achat n'a pas pu être effectué." },
        { status: 500 },
      )
    }

    const result = (data ?? {}) as {
      success?: boolean
      error?: string
      redemption_id?: string
      redemption_code?: string
      new_balance?: number
      xp_earned?: number
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        redemption_id: result.redemption_id,
        redemption_code: result.redemption_code,
        new_balance: result.new_balance,
        xp_earned: result.xp_earned,
      })
    }

    // Échec honnête : on relaie le code d'erreur + un message FR.
    const { message, status } = friendlyError(result.error)
    return NextResponse.json(
      { success: false, error: result.error ?? "unknown_error", message },
      { status },
    )
  } catch (error) {
    console.error("[teen/partners/buy] unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
