import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * /auth/redirect — canonical post-login switch.
 *
 * Source of truth: docs/canon/auth-onboarding.locked.md §3 (LOCKED truth
 * table). Implemented as a server component so we never flash a client-side
 * intermediate state.
 *
 * Identity invariant per §6: profiles.role drives top-level routing.
 *
 * For status reads on per-role attribute tables (mentors, nivy_drivers,
 * partners, ambassadors), we use `.maybeSingle()` and treat a NULL row as
 * the conservative "not yet onboarded" state — pointing the user at the
 * appropriate onboarding stub. This keeps the redirect deterministic even
 * when the underlying status row hasn't been provisioned yet.
 */
export default async function AuthRedirectPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_onboarded")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    // No profile row → showcase / role-pick (canon §3 row "no row").
    redirect("/onboarding")
  }

  const role = profile.role as string | null
  const isOnboarded = Boolean(profile.is_onboarded)

  switch (role) {
    case "parent":
      redirect(isOnboarded ? "/parent" : "/onboarding/parent")
      break

    case "teen":
      redirect(isOnboarded ? "/teen" : "/onboarding/teen")
      break

    case "partner": {
      const { data: partnerRow } = await supabase
        .from("partners")
        .select("status")
        .eq("email", user.email ?? "")
        .maybeSingle()
      const partnerStatus = partnerRow?.status as string | undefined
      redirect(
        partnerStatus === "active"
          ? "/partner"
          : "/partner/onboarding/awaiting-approval"
      )
      break
    }

    case "mentor": {
      const { data: mentorRow } = await supabase
        .from("mentors")
        .select("kyc_status")
        .eq("user_id", user.id)
        .maybeSingle()
      const kyc = mentorRow?.kyc_status as string | undefined
      redirect(
        kyc === "approved" || kyc === "verified"
          ? "/mentor/dashboard"
          : "/mentor/onboarding/kyc"
      )
      break
    }

    case "driver": {
      const { data: driverRow } = await supabase
        .from("nivy_drivers")
        .select("kyc_status")
        .eq("user_id", user.id)
        .maybeSingle()
      const kyc = driverRow?.kyc_status as string | undefined
      redirect(
        kyc === "approved" || kyc === "verified"
          ? "/driver/dashboard"
          : "/driver/onboarding/kyc"
      )
      break
    }

    case "ambassador": {
      const { data: ambassadorRow } = await supabase
        .from("ambassadors")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle()
      const status = ambassadorRow?.status as string | undefined
      redirect(
        status === "active"
          ? "/ambassador"
          : "/ambassador/onboarding/awaiting-approval"
      )
      break
    }

    case "admin":
      redirect("/admin")
      break

    default:
      redirect("/auth/error?reason=unknown_role")
  }
}
