import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { WalletHubClient } from "./wallet-hub-client"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"

export default async function WalletHubPage() {
  const userInfo = await getUserRole()
  
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  // Fetch wallet data
  const dashboardData = await getTeenDashboardData()

  // Serialize data
  const walletData = {
    xp: dashboardData?.xp || { total: 0, level: 1, progressPercent: 0 },
    streak: dashboardData?.currentStreak || 0,
    coins: 0, // TODO: Fetch from user_coins table
    shopHighlights: dashboardData?.shopHighlights || {},
  }

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<WalletHubSkeleton />}>
        <WalletHubClient 
          teenId={teenId} 
          walletData={JSON.parse(JSON.stringify(walletData))}
        />
      </Suspense>
    </div>
  )
}

function WalletHubSkeleton() {
  return (
    <div className="space-y-8 pt-8 animate-pulse">
      <div className="h-12 bg-zinc-800/50 rounded-2xl w-full max-w-md" />
      <div className="h-48 bg-zinc-800/30 rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-zinc-800/30 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
