import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { REFERRAL_COOKIE } from "@/app/join/route"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/auth/redirect"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // #33 — persist referral attribution if the visitor arrived via
      // /join?ref= (nivy_ref cookie). Done here because this is the first
      // point where the referred user's id is known.
      const userId = data.user?.id
      if (userId) {
        await persistReferralAttribution(userId)
      }
      const res = NextResponse.redirect(`${origin}${next}`)
      res.cookies.set(REFERRAL_COOKIE, "", { path: "/", maxAge: 0 })
      return res
    }
  }

  // Erreur - rediriger vers login avec message d'erreur
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}

/**
 * Write a one-time referral_attribution row from the nivy_ref cookie.
 * Idempotent (unique on referred_user_id → first ambassador wins), refuses
 * self-referral, and never throws into the auth flow.
 */
async function persistReferralAttribution(userId: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    const refCode = cookieStore.get(REFERRAL_COOKIE)?.value?.trim()
    if (!refCode) return

    const admin = createServiceRoleClient()
    const { data: ambassador } = await admin
      .from("ambassadors")
      .select("id, user_id")
      .eq("code", refCode)
      .eq("status", "active")
      .maybeSingle()

    if (!ambassador) return
    if (ambassador.user_id === userId) return // no self-referral

    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    await admin.from("referral_attribution").upsert(
      {
        ambassador_id: ambassador.id,
        referred_user_id: userId,
        attributed_at: now.toISOString(),
        expires_at: expires.toISOString(),
      },
      { onConflict: "referred_user_id", ignoreDuplicates: true }
    )
  } catch (err) {
    console.error("[auth/callback] referral attribution failed (non-fatal):", err)
  }
}
