import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as fs from "fs"
import * as path from "path"

const MIGRATIONS_MAP: Record<string, string> = {
  "001": "001_achievements_system.sql",
  "002": "002_leaderboard_system.sql",
  "003": "003_missions_system.sql",
  "004": "004_rewards_shop.sql",
  "005": "005_fortune_wheel.sql",
  "006": "006_friend_challenges.sql",
  "007": "007_crews_system.sql",
  "008": "008_special_challenges.sql",
  "009": "009_event_challenges.sql",
  "010": "010_seasonal_challenges.sql",
  "011": "011_mini_games.sql",
  "012": "012_user_stats_dashboard.sql",
  "013": "013_annual_wrapped.sql",
  "014": "014_profile_customization.sql",
  "015": "015_collections.sql",
  "016": "016_gamified_notifications.sql",
  "017": "017_vip_system.sql",
  "018": "018_activity_feed.sql",
  "019": "019_social_sharing.sql",
}

export async function POST(request: NextRequest) {
  try {
    const { migrationId } = await request.json()

    if (!migrationId || !MIGRATIONS_MAP[migrationId]) {
      return NextResponse.json(
        { success: false, error: "Migration ID invalide" },
        { status: 400 }
      )
    }

    const fileName = MIGRATIONS_MAP[migrationId]
    const filePath = path.join(
      process.cwd(),
      "gamification-system",
      "database",
      "migrations",
      fileName
    )

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: `Fichier non trouvé: ${fileName}` },
        { status: 404 }
      )
    }

    // Lire le fichier SQL
    const sql = fs.readFileSync(filePath, "utf-8")

    // Créer le client Supabase
    const supabase = await createClient()

    // Note: L'exécution de SQL brut nécessite soit:
    // 1. Une fonction RPC personnalisée dans Supabase
    // 2. L'utilisation du service role key (pas l'anon key)
    // 3. L'exécution manuelle via le dashboard

    // Pour l'instant, on retourne les instructions
    return NextResponse.json({
      success: false,
      error: "L'exécution automatique nécessite le Service Role Key. Utilise le SQL Editor de Supabase.",
      instructions: {
        step1: "Va sur https://supabase.com/dashboard",
        step2: "Ouvre ton projet",
        step3: "Va dans SQL Editor",
        step4: `Copie le contenu de: ${fileName}`,
        step5: "Clique sur Run",
      },
      sqlPreview: sql.substring(0, 500) + "...",
    })
  } catch (error: any) {
    console.error("Migration error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
