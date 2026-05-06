import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import {
  getDailyQuizForTeen,
  getQuizCategoriesForTeen,
  getRecentQuizAttempts,
  getTeenQuizStats,
} from "@/lib/quiz/server"
import { QuizHubClient } from "./quiz-hub-client"

export const dynamic = "force-dynamic"

export default async function QuizPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData.id

  const [{ categories, quizzesBySubject }, recentAttempts, dailyQuiz, stats] =
    await Promise.all([
      getQuizCategoriesForTeen(teenId),
      getRecentQuizAttempts(teenId, 6),
      getDailyQuizForTeen(teenId),
      getTeenQuizStats(teenId),
    ])

  const serialized = {
    categories,
    quizzesBySubject,
    recentAttempts: JSON.parse(JSON.stringify(recentAttempts)),
    dailyQuiz,
    stats,
  }

  return (
    <Suspense fallback={<QuizHubSkeleton />}>
      <QuizHubClient
        categories={serialized.categories}
        quizzesBySubject={serialized.quizzesBySubject}
        recentAttempts={serialized.recentAttempts}
        dailyQuiz={serialized.dailyQuiz}
        stats={serialized.stats}
      />
    </Suspense>
  )
}

function QuizHubSkeleton() {
  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6 animate-pulse">
      <div className="h-12 bg-zinc-800/50 rounded-2xl w-72" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-800/30 rounded-2xl" />
        ))}
      </div>
      <div className="h-40 bg-zinc-800/30 rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 bg-zinc-800/30 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
