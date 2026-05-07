import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { WalletHubClient } from "./wallet-hub-client"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { getRewards, getCategories } from "@/gamification-system/features/shop/actions"
import { XP_TO_DH_RATE, convertXPToDH } from "@/lib/payments/xp-converter"

export default async function WalletHubPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  // Fetch wallet data + canonical shop data (reward_categories + get_shop_rewards)
  const [dashboardData, rewardsResult, categoriesResult] = await Promise.all([
    getTeenDashboardData(),
    getRewards({ onlyAvailable: true, onlyAffordable: false }),
    getCategories(),
  ])

  const totalXp = dashboardData?.xp?.total || 0

  // Serialize data
  const walletData = {
    xp: dashboardData?.xp || { total: 0, level: 1, progressPercent: 0 },
    streak: dashboardData?.currentStreak || 0,
    // W3.1 — real balance from user_coins.balance (sourced via getTeenDashboardData).
    // Per whitepaper §5: 1 DH = 100 coins (locked). XP and coins NEVER convert.
    coins: dashboardData?.coins?.balance ?? 0,
    cashbackThisWeek: dashboardData?.coins?.cashbackThisWeek ?? 0,
    shopHighlights: dashboardData?.shopHighlights || {},
    // Canonical shop catalog (reward_categories + get_shop_rewards RPC)
    rewards: rewardsResult.data || [],
    categories: categoriesResult.data || [],
    // Currency model — sourced from lib/payments/xp-converter.ts
    currency: {
      xpToDhRate: XP_TO_DH_RATE,
      xpValueDH: convertXPToDH(totalXp),
    },
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
