import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const formData = await request.formData()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    const enrollmentId = formData.get("enrollmentId") as string

    // #drift — la table `club_enrollments` n'existe pas dans le schéma live (aucune
    // migration ne la crée). La requête d'update échouait toujours au runtime
    // (« relation does not exist ») → on échoue explicitement, comportement identique.
    console.error("[v0] Resume enrollment: club_enrollments absent du schéma live", { enrollmentId })
    return NextResponse.redirect(new URL("/mes-clubs?error=resume_failed", request.url))
  } catch (error) {
    console.error("[v0] Resume enrollment error:", error)
    return NextResponse.redirect(new URL("/mes-clubs?error=resume_failed", request.url))
  }
}, { rateLimit: 'api' })
