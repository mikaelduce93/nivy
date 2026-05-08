/**
 * /api/admin/run-migration — RING-FENCED.
 *
 * Canon: docs/canon/admin-moderation.locked.md §12.D3 SQL runner ring-fence.
 *
 * Same gate as /api/admin/execute-sql: super_admin + env flag, 404 otherwise.
 * Today this route only returns instructions (it cannot execute migrations
 * client-side — Supabase Studio + service role is the supported path), but
 * keep the access ring-fenced so it cannot leak migration filenames or
 * directory structure to non-super_admin probes.
 */
import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import { getAdminInfo, logAdminAction } from "@/lib/auth/admin-permissions"

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

function isSqlConsoleEnabled(): boolean {
  return (
    process.env.ENABLE_ADMIN_SQL_CONSOLE === "true" ||
    process.env.ENABLE_ADMIN_SQL_EXECUTION === "true"
  )
}

export async function POST(request: NextRequest) {
  const admin = await getAdminInfo()
  const envEnabled = isSqlConsoleEnabled()
  const isSuperAdmin = admin?.subRole === "super_admin"

  if (admin) {
    await logAdminAction({
      actor_id: admin.profileId,
      actor_role: admin.subRole,
      action: "sql_run_migration",
      resource_type: "system",
      resource_id: "run-migration",
      description: `Migration runner attempt (super_admin=${isSuperAdmin}, env_enabled=${envEnabled})`,
      metadata: {
        subRole: admin.subRole,
        env_enabled: envEnabled,
        allowed: isSuperAdmin && envEnabled,
      },
    })
  }

  if (!admin || !isSuperAdmin || !envEnabled) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  try {
    const { migrationId } = await request.json()

    if (!migrationId || !MIGRATIONS_MAP[migrationId]) {
      return NextResponse.json({ success: false, error: "Migration ID invalide" }, { status: 400 })
    }

    const fileName = MIGRATIONS_MAP[migrationId]
    const filePath = path.join(process.cwd(), "gamification-system", "database", "migrations", fileName)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: `Fichier non trouvé: ${fileName}` }, { status: 404 })
    }

    const sql = fs.readFileSync(filePath, "utf-8")

    return NextResponse.json({
      success: false,
      error:
        "L'exécution automatique nécessite le Service Role Key. Utilise le SQL Editor de Supabase.",
      instructions: {
        step1: "Va sur https://supabase.com/dashboard",
        step2: "Ouvre ton projet",
        step3: "Va dans SQL Editor",
        step4: `Copie le contenu de: ${fileName}`,
        step5: "Clique sur Run",
      },
      sqlPreview: sql.substring(0, 500) + "...",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
