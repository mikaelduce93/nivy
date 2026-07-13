import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // Drift schéma: la table `club_enrollments` a été droppée (canon clubs =
    // sport_clubs / teen_club_memberships, sans notion d'enrollment côté parent).
    // Aucune cible canonique n'expose (enrollment_id, parent_id, status) : le flux
    // d'annulation d'inscription n'est plus adossé à une table live. On préserve le
    // comportement runtime observé (échec PGRST205 → redirection vers l'écran d'erreur).
    return NextResponse.redirect(new URL("/mes-clubs?error=cancel_failed", request.url))
  } catch (error) {
    console.error("[v0] Cancel enrollment error:", error)
    return NextResponse.redirect(new URL("/mes-clubs?error=cancel_failed", request.url))
  }
}, { rateLimit: 'api' })
