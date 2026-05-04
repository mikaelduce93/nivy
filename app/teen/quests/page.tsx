import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { QuestsHubClient } from "./quests-hub-client"
import { getUnifiedQuests } from "@/lib/server/unified-quest-engine"
import { getDailyChallenges, getTeenXP } from "@/features/gamification/actions"

export default async function QuestsHubPage() {
  const userInfo = await getUserRole()
  
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  // Fetch all quest data in parallel
  const [quests, dailyChallenges, xpData] = await Promise.all([
    getUnifiedQuests(),
    getDailyChallenges(teenId).catch(() => []),
    getTeenXP(teenId).catch(() => null)
  ])

  // Serialize data for client
  const serializedQuests = JSON.parse(JSON.stringify(quests || []))
  const serializedChallenges = JSON.parse(JSON.stringify(dailyChallenges || []))
  const serializedXp = JSON.parse(JSON.stringify(xpData || { total_xp: 0, level: 1 }))

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<QuestsHubSkeleton />}>
        <QuestsHubClient 
          quests={serializedQuests}
          dailyChallenges={serializedChallenges}
          xpData={serializedXp}
          teenId={teenId}
        />
      </Suspense>
    </div>
  )
}

function QuestsHubSkeleton() {
  return (
    <div className="space-y-8 pt-8 animate-pulse">
      <div className="h-12 bg-zinc-800/50 rounded-2xl w-full max-w-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-zinc-800/30 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
