/**
 * POST /api/parent/teens/invite — V11 #299 (sens parent→ado, émission).
 *
 * Le parent génère un code de liaison à 6 chiffres (canon M18 : TTL 24h,
 * single-use) RÉELLEMENT persisté dans `linking_codes` (la table existait mais
 * n'était alimentée par aucune route ; le `TEEN<hex>` cosmétique de
 * parent/teens/create est supprimé en parallèle). Renvoie aussi un lien
 * partageable que l'ado peut ouvrir/scanner (consommation : #300).
 */
import { NextResponse } from "next/server"
import { randomInt } from "node:crypto"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getAppUrl } from "@/lib/config/app-config"
import { validateCsrfRequest } from "@/lib/security/csrf"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TTL_MS = 24 * 60 * 60 * 1000 // 24h (canon M18)

function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export async function POST(request: Request) {
  try {
    if (!(await validateCsrfRequest(request))) {
      return NextResponse.json({ success: false, error: "Jeton CSRF invalide" }, { status: 403 })
    }
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const sr = createServiceRoleClient()
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

    // Insert with collision-retry on the TEXT PK (1M space, single-use 24h).
    let code: string | null = null
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = sixDigitCode()
      const { error } = await sr.from("linking_codes").insert({
        code: candidate,
        parent_id: userInfo.profileId,
        expires_at: expiresAt,
      })
      if (!error) {
        code = candidate
        break
      }
      if (error.code !== "23505") {
        console.error("[parent/teens/invite] insert failed:", error.message)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la génération du code" },
          { status: 500 }
        )
      }
      // 23505 → code collision, retry with a fresh candidate.
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Impossible de générer un code unique, réessaie." },
        { status: 503 }
      )
    }

    const shareUrl = `${getAppUrl()}/teen/rejoindre?code=${code}`

    return NextResponse.json({
      success: true,
      data: { code, shareUrl, expiresAt },
    })
  } catch (error) {
    console.error("[parent/teens/invite] Error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
