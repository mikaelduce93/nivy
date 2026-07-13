import { NextResponse } from "next/server"

/**
 * GET /api/ambassador/shop/rewards
 * Récupérer le catalogue de récompenses disponibles
 */
export async function GET(_request: Request) {
  try {
    // La table `ambassador_rewards` n'existe pas dans le schéma live : ce
    // catalogue n'a jamais été déployé (cf. `../redeem/route.ts`). On évite une
    // requête vouée à échouer et on signale la fonctionnalité comme indisponible.
    return NextResponse.json(
      {
        success: false,
        error: "La boutique ambassadeur n'est pas encore disponible",
      },
      { status: 503 }
    )
  } catch (error: any) {
    console.error("Rewards API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

