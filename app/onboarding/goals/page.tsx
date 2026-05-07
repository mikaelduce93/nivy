import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { GoalsForm } from "@/components/onboarding/goals-form"

export const dynamic = "force-dynamic"

/**
 * Wave 1.3 — Onboarding Step "Goals"
 * Teen-only: 3 free-text inputs writing into teen_goals (priority 1..3).
 */
export default async function OnboardingGoalsPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }
  if (userInfo.role !== "teen") {
    if (userInfo.role === "parent") redirect("/parent")
    if (userInfo.role === "partner") redirect("/partner")
    redirect("/")
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("teen_goals")
    .select("goal_text, priority")
    .eq("teen_id", userInfo.profileId)
    .eq("is_active", true)
    .in("priority", [1, 2, 3])
    .order("priority", { ascending: true })

  const initial: string[] = ["", "", ""]
  for (const row of existing ?? []) {
    const idx = (row.priority as number) - 1
    if (idx >= 0 && idx < 3 && typeof row.goal_text === "string") {
      initial[idx] = row.goal_text
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-4 sm:p-6 lg:p-10">
      <GoalsForm initial={initial} nextHref="/onboarding/learning-style" />
    </main>
  )
}
