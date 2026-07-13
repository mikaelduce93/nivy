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

    // La table `club_enrollments` n'existe pas en base (feature jamais migrée) :
    // la requête d'update échouait systématiquement au runtime. On préserve le
    // comportement observé (redirection vers la page d'erreur) sans référencer
    // de table fantôme.
    throw new Error("club_enrollments table does not exist")
  } catch (error) {
    console.error("[v0] Pause enrollment error:", error)
    return NextResponse.redirect(new URL("/mes-clubs?error=pause_failed", request.url))
  }
}, { rateLimit: 'api' })
