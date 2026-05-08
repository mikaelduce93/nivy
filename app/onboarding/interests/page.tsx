import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { InterestPicker, type InterestTaxonomyRow } from "@/components/onboarding/interest-picker"

export const dynamic = "force-dynamic"

/**
 * Wave 1.3 — Onboarding Step "Interests"
 * Server component: gates by role (teen only) and fetches interest_taxonomy.
 * Parents/partners are bounced to their dashboard (no chip selector for them).
 */
export default async function OnboardingInterestsPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }
  if (userInfo.role !== "teen") {
    // Per onboarding-flows.md, this step is teen-only.
    if (userInfo.role === "parent") redirect("/parent")
    if (userInfo.role === "partner") redirect("/partner")
    redirect("/")
  }

  const supabase = await createClient()

  // Polish-F: wrap with try/catch — taxonomy is critical for the picker to
  // render anything; failure should produce an empty selector with a banner
  // rather than crash onboarding.
  let rows: InterestTaxonomyRow[] = []
  let initialSelected: string[] = []
  try {
    const [{ data: taxonomy, error: taxErr }, { data: existing, error: existErr }] =
      await Promise.all([
        supabase
          .from("interest_taxonomy")
          .select("tag, category, display_fr, display_en, icon")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("tag", { ascending: true }),
        supabase
          .from("teen_interests")
          .select("tag")
          .eq("teen_id", userInfo.profileId),
      ])
    if (taxErr) console.error("[onboarding/interests] taxonomy error:", taxErr)
    if (existErr) console.error("[onboarding/interests] existing error:", existErr)
    rows = (taxonomy ?? []) as InterestTaxonomyRow[]
    initialSelected = (existing ?? []).map((r) => r.tag as string)
  } catch (err) {
    console.error("[onboarding/interests] queries threw:", err)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-4 sm:p-6 lg:p-10">
      <InterestPicker
        taxonomy={rows}
        initialSelected={initialSelected}
        nextHref="/onboarding/goals"
      />
    </main>
  )
}
