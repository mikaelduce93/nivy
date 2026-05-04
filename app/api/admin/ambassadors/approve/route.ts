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

    // Check admin role
    const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

    if (!adminRole || (adminRole.role !== "super_admin" && adminRole.role !== "admin")) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    const ambassadorId = formData.get("ambassadorId") as string

    const { error } = await supabase
      .from("ambassadors")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", ambassadorId)

    if (error) throw error

    return NextResponse.redirect(new URL("/admin/ambassadeurs?approved=true", request.url))
  } catch (error) {
    console.error("[v0] Approve ambassador error:", error)
    return NextResponse.redirect(new URL("/admin/ambassadeurs?error=approve_failed", request.url))
  }
}, { rateLimit: 'api' })
