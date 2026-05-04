import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/ambassador/shop/redeem
 * Échanger des points contre une récompense
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { reward_id, delivery_address, delivery_notes } = body

    // Validation
    if (!reward_id) {
      return NextResponse.json(
        { success: false, error: "ID de récompense requis" },
        { status: 400 }
      )
    }

    // Vérifier l'utilisateur
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un ambassadeur approuvé
    const { data: ambassador, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("id, status")
      .eq("profile_id", user.id)
      .eq("status", "approved")
      .single()

    if (ambassadorError || !ambassador) {
      return NextResponse.json(
        { success: false, error: "Vous devez être un ambassadeur approuvé" },
        { status: 403 }
      )
    }

    // Appeler la fonction RPC pour échanger
    const { data: redemptionId, error: redeemError } = await supabase.rpc(
      "redeem_ambassador_reward",
      {
        p_ambassador_id: ambassador.id,
        p_reward_id: reward_id,
        p_delivery_address: delivery_address || null,
        p_delivery_notes: delivery_notes || null,
      }
    )

    if (redeemError) {
      console.error("Redeem error:", redeemError)
      return NextResponse.json(
        {
          success: false,
          error: redeemError.message || "Erreur lors de l'échange",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        redemption_id: redemptionId,
        message: "Récompense échangée avec succès",
      },
    })
  } catch (error: any) {
    console.error("Shop redeem API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ambassador/shop/redeem
 * Récupérer l'historique des échanges
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")

    // Vérifier l'utilisateur
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un ambassadeur
    const { data: ambassador, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("id")
      .eq("profile_id", user.id)
      .single()

    if (ambassadorError || !ambassador) {
      return NextResponse.json(
        { success: false, error: "Ambassadeur non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer les échanges
    const { data: redemptions, error: redemptionsError } = await supabase
      .from("ambassador_redemptions")
      .select(
        `
        id,
        points_spent,
        status,
        delivery_address,
        tracking_number,
        created_at,
        reward:ambassador_rewards(id, name, description, emoji, points_cost, category)
      `
      )
      .eq("ambassador_id", ambassador.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (redemptionsError) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de la récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: redemptions,
    })
  } catch (error: any) {
    console.error("Shop history API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

