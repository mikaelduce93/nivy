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

    const notificationId = formData.get("notificationId") as string

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id)

    if (error) throw error

    return NextResponse.redirect(new URL("/notifications", request.url))
  } catch (error) {
    console.error("[v0] Mark notification read error:", error)
    return NextResponse.redirect(new URL("/notifications?error=mark_failed", request.url))
  }
}, { rateLimit: 'api' })
