import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/ambassador/shop/rewards
 * Récupérer le catalogue de récompenses disponibles
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const active_only = searchParams.get("active_only") !== "false"

    // Construire la requête
    let query = supabase
      .from("ambassador_rewards")
      .select("*")
      .order("points_cost", { ascending: true })

    // Filtrer par catégorie si fournie
    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    // Filtrer les récompenses actives
    if (active_only) {
      query = query.eq("is_active", true)
    }

    const { data: rewards, error } = await query

    if (error) {
      console.error("Rewards fetch error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rewards || [],
    })
  } catch (error: any) {
    console.error("Rewards API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

