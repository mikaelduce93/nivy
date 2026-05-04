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

    const authorizationId = formData.get("authorizationId") as string

    const { error } = await supabase
      .from("child_authorizations")
      .update({ status: "revoked" })
      .eq("id", authorizationId)
      .eq("parent_id", user.id)

    if (error) throw error

    return NextResponse.redirect(new URL("/autorisations?revoked=true", request.url))
  } catch (error) {
    console.error("[v0] Revoke authorization error:", error)
    return NextResponse.redirect(new URL("/autorisations?error=revoke_failed", request.url))
  }
}, { rateLimit: 'api' })
