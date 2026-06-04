import { NextRequest, NextResponse } from "next/server"

/**
 * GET /auth/validate-teen/start?token=<validation_token>[&mode=login]
 *
 * Entry point a parent reaches by tapping the teen-shared QR/WhatsApp link
 * when NOT yet authenticated. It drops a short-lived httpOnly cookie carrying
 * the pending-teen validation token, then sends the parent to sign-up (new
 * parent, role=parent) or login (existing parent). The token travels in the
 * cookie — never in the sign-up/login query string — to avoid escaping and
 * open-redirect issues. The canonical post-auth switch (/auth/redirect) reads
 * the cookie and routes the parent back to /auth/validate-teen?token=… once
 * they are authenticated AND onboarded (KYC + signed authorization).
 *
 * Modeled on app/join/route.ts (referral cookie). /auth/* is exempt from the
 * onboarding gate (proxy.ts) and GET is CSRF-exempt.
 */
export const PENDING_TEEN_COOKIE = "nivy_pending_teen"
const TOKEN_TTL_DAYS = 7 // mirrors pending_teen_registrations.token_expires_at

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim()
  const mode = request.nextUrl.searchParams.get("mode")
  const dest = mode === "login" ? "/auth/login" : "/auth/sign-up?intent=validate-teen"
  const res = NextResponse.redirect(new URL(dest, request.url))

  // Only set the cookie for a plausible hex token (validate-teen GET re-verifies).
  if (token && /^[a-f0-9]{16,128}$/i.test(token)) {
    res.cookies.set(PENDING_TEEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60,
    })
  }
  return res
}
