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

    const { error } = await supabase
      .from("club_enrollments")
      .update({ status: "active" })
      .eq("id", enrollmentId)
      .eq("parent_id", user.id)

    if (error) throw error

    return NextResponse.redirect(new URL(`/mes-clubs/${enrollmentId}?action=resumed`, request.url))
  } catch (error) {
    console.error("[v0] Resume enrollment error:", error)
    return NextResponse.redirect(new URL("/mes-clubs?error=resume_failed", request.url))
  }
}, { rateLimit: 'api' })
