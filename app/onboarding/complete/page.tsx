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

  // Non-teen roles bypass the personalization completion entirely.
  if (userInfo.role !== "teen") {
    if (userInfo.role === "parent") redirect("/parent")
    if (userInfo.role === "partner") redirect("/partner")
    redirect("/")
  }

  // Mark onboarding complete server-side (idempotent).
  const supabase = await createClient()
  await supabase
    .from("profiles")
    .update({
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userInfo.profileId)

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
      <OnboardingCompleteClient redirectTo="/teen" />
    </main>
  )
}
