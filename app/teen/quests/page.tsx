import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { QuestsHubClient } from "./quests-hub-client"
import { getUnifiedQuests } from "@/lib/server/unified-quest-engine"
import { getDailyChallenges, getTeenXP } from "@/features/gamification/actions"
import { createClient } from "@/lib/supabase/server"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"

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
  const supabase = await createClient()
  const coinsPromise = (async () => {
    try {
      const { data } = await supabase
        .from("user_coins")
        .select("balance")
        .eq("teen_id", teenId)
        .limit(1)
        .maybeSingle()
      return data
    } catch {
      return null
    }
  })()
  const [quests, dailyChallenges, xpData, coinsRow] = await Promise.all([
    getUnifiedQuests(),
    getDailyChallenges(teenId).catch(() => []),
    getTeenXP(teenId).catch(() => null),
    coinsPromise,
  ])

  // Serialize data for client
  const serializedQuests = JSON.parse(JSON.stringify(quests || []))
  const serializedChallenges = JSON.parse(JSON.stringify(dailyChallenges || []))
  const serializedXp = JSON.parse(JSON.stringify(xpData || { total_xp: 0, level: 1 }))
  const coinsBalance = (coinsRow as { balance?: number } | null)?.balance ?? 0

  return (
    <PullToRefresh>
      <div className="min-h-screen pb-32">
        <Suspense fallback={<QuestsHubSkeleton />}>
          <QuestsHubClient
            quests={serializedQuests}
            dailyChallenges={serializedChallenges}
            xpData={serializedXp}
            coinsBalance={coinsBalance}
            teenId={teenId}
          />
        </Suspense>
      </div>
    </PullToRefresh>
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
