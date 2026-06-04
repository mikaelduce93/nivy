import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * /join?ref=<ambassador_code> — referral capture entry point (issue #33).
 *
 * Validates the code against an ACTIVE ambassador, drops a short-lived
 * httpOnly `nivy_ref` cookie, then sends the visitor to sign-up. The
 * attribution row is written later, at /auth/callback, once we know the new
 * user's id. An unknown/missing code never blocks the flow — it just doesn't
 * set the cookie.
 *
 * Uses the service-role client because the visitor is anonymous and
 * `ambassadors` RLS is self-read-only.
 */
export const REFERRAL_COOKIE = "nivy_ref"
const REFERRAL_TTL_DAYS = 30

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref")?.trim()
  const res = NextResponse.redirect(new URL("/auth/sign-up", request.url))

  if (ref) {
    try {
      const admin = createServiceRoleClient()
      const { data: ambassador } = await admin
        .from("ambassadors")
        .select("id")
        .eq("code", ref)
        .eq("status", "active")
        .maybeSingle()

      if (ambassador) {
        res.cookies.set(REFERRAL_COOKIE, ref, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: REFERRAL_TTL_DAYS * 24 * 60 * 60,
        })
      }
    } catch (err) {
      // Never block sign-up on an attribution hiccup.
      console.error("[join] referral code validation failed (non-fatal):", err)
    }
  }

  return res
}
