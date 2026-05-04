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

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)

    if (error) throw error

    return NextResponse.redirect(new URL("/notifications", request.url))
  } catch (error) {
    console.error("[v0] Mark all read error:", error)
    return NextResponse.redirect(new URL("/notifications?error=mark_all_failed", request.url))
  }
}, { rateLimit: 'api' })
