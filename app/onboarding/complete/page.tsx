import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { OnboardingCompleteClient } from "@/components/onboarding/onboarding-complete-client"

export const dynamic = "force-dynamic"

/**
 * Wave 1.3 — Onboarding completion screen.
 * Marks profiles.is_onboarded = true (teen role) and routes to /teen.
 */
export default async function OnboardingCompletePage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  // Wave 6B — non-teen roles still need is_onboarded=true flipped before
  // we bounce them to their dashboard, otherwise the middleware onboarding
  // gate sends them straight back to /onboarding/{role}. Previously the
  // flip happened only for teens.
  const supabase = await createClient()
  if (userInfo.role !== "teen") {
    await supabase
      .from("profiles")
      .update({
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userInfo.profileId)

    if (userInfo.role === "parent") redirect("/parent")
    if (userInfo.role === "partner") redirect("/partner")
    redirect("/")
  }

  // Teen path — same is_onboarded flip + render the celebration screen
  // before redirecting. Idempotent.
  await supabase
    .from("profiles")
    .update({
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userInfo.profileId)

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-pink/5 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
      <OnboardingCompleteClient redirectTo="/teen" />
    </main>
  )
}
