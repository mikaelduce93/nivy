import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { OnboardingCompleteClient } from "@/components/onboarding/onboarding-complete-client"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

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

  // Récap de valeur RÉEL (jamais de données mockées en hero — cf. #186).
  let starterXp: number | null = null
  let starterCoins: number | null = null
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", userInfo.profileId)
      .maybeSingle()
    if (prof && typeof prof.total_xp === "number") starterXp = prof.total_xp
  } catch {
    /* best-effort — le récap est décoratif, pas bloquant */
  }
  try {
    const { data: wallet } = await supabase
      .from("user_coins")
      .select("balance")
      .eq("teen_id", userInfo.profileId)
      .maybeSingle()
    if (wallet && typeof wallet.balance === "number") starterCoins = wallet.balance
  } catch {
    /* best-effort */
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-4 sm:p-6 lg:p-10">
      <MeshBackground />
      <div className="relative z-10 w-full max-w-lg">
        <OnboardingCompleteClient redirectTo="/teen" xp={starterXp} coins={starterCoins} />
      </div>
    </main>
  )
}
