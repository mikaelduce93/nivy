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

    const { reward_id } = body

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

    // La boutique ambassadeur (fonction `redeem_ambassador_reward`, tables
    // `ambassador_rewards`/`ambassador_redemptions`) n'existe pas dans le schéma
    // live : ce back-end n'a jamais été déployé. On évite un appel RPC voué à
    // échouer et on signale la fonctionnalité comme indisponible.
    return NextResponse.json(
      {
        success: false,
        error: "La boutique ambassadeur n'est pas encore disponible",
      },
      { status: 503 }
    )
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
export async function GET(_request: Request) {
  try {
    const supabase = await createClient()

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

    // Les tables `ambassador_redemptions`/`ambassador_rewards` n'existent pas
    // dans le schéma live : l'historique d'échanges ne peut pas être servi.
    return NextResponse.json(
      {
        success: false,
        error: "La boutique ambassadeur n'est pas encore disponible",
      },
      { status: 503 }
    )
  } catch (error: any) {
    console.error("Shop history API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

