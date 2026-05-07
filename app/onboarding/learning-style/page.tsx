import { redirect } from "next/navigation"

import { getUserRole } from "@/lib/auth/get-user-role"
import { LearningStyleQuiz } from "@/components/onboarding/learning-style-quiz"

export const dynamic = "force-dynamic"

/**
 * Wave 1.3 — Onboarding Step "Learning Style"
 * 4-question quiz; server scoring updates teens.learning_style + archetype.
 */
export default async function OnboardingLearningStylePage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }
  if (userInfo.role !== "teen") {
    if (userInfo.role === "parent") redirect("/parent")
    if (userInfo.role === "partner") redirect("/partner")
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-4 sm:p-6 lg:p-10">
      <LearningStyleQuiz nextHref="/onboarding/complete" />
    </main>
  )
}
