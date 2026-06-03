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

    // Wave 6B — capture user_id before flipping status so we can also
    // mark profiles.is_onboarded=true. Without that the approved
    // ambassador stays gated by middleware on /ambassador/onboarding/
    // awaiting-approval forever.
    // #34 — `ambassadors` keys on `user_id` (FK auth.users); there is no
    // `profile_id` column. Per Wave 1A invariant profiles.id == auth.users.id,
    // so user_id is also the correct profiles.id to flip.
    const { data: ambassador, error: lookupErr } = await supabase
      .from("ambassadors")
      .select("user_id")
      .eq("id", ambassadorId)
      .maybeSingle()
    if (lookupErr) throw lookupErr
    if (!ambassador) {
      return NextResponse.redirect(new URL("/admin/ambassadeurs?error=not_found", request.url))
    }

    const { error } = await supabase
      .from("ambassadors")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", ambassadorId)

    if (error) throw error

    // Wave 6B — flip is_onboarded so the role-router lets them in.
    if (ambassador.user_id) {
      await supabase
        .from("profiles")
        .update({ is_onboarded: true })
        .eq("id", ambassador.user_id)
    }

    return NextResponse.redirect(new URL("/admin/ambassadeurs?approved=true", request.url))
  } catch (error) {
    console.error("[v0] Approve ambassador error:", error)
    return NextResponse.redirect(new URL("/admin/ambassadeurs?error=approve_failed", request.url))
  }
}, { rateLimit: 'api' })
