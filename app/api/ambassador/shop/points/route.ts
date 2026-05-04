import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/ambassador/shop/points
 * Récupérer le solde de points d'un ambassadeur
 */
export async function GET(request: Request) {
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

    // Récupérer les points
    const { data: points, error: pointsError } = await supabase
      .from("ambassador_points")
      .select("total_points, lifetime_points")
      .eq("ambassador_id", ambassador.id)
      .single()

    if (pointsError) {
      // Si aucun enregistrement, retourner 0
      if (pointsError.code === "PGRST116") {
        return NextResponse.json({
          success: true,
          data: {
            total_points: 0,
            lifetime_points: 0,
          },
        })
      }

      return NextResponse.json(
        { success: false, error: "Erreur lors de la récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        total_points: points?.total_points || 0,
        lifetime_points: points?.lifetime_points || 0,
      },
    })
  } catch (error: any) {
    console.error("Points API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

