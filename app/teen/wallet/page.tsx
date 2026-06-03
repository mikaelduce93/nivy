import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { WalletHubClient } from "./wallet-hub-client"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { getRewards, getCategories, getUserPurchases } from "@/gamification-system/features/shop/actions"
import { getAchievements } from "@/gamification-system/features/achievements/actions"
import { createClient } from "@/lib/supabase/server"

export default async function WalletHubPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  const supabase = await createClient()

  // Fetch wallet data + canonical shop data (reward_categories + get_shop_rewards)
  // + épargne (user_coins_spendable view + savings_goals) + historique achats.
  // Source unique des coins disponibles = vue user_coins_spendable (comme /teen/savings).
  const [
    dashboardData,
    rewardsResult,
    categoriesResult,
    { data: spendableRow },
    { data: goals },
    purchasesResult,
    achievementsResult,
  ] = await Promise.all([
    getTeenDashboardData(),
    getRewards({ onlyAvailable: true, onlyAffordable: false }),
    getCategories(),
    supabase
      .from("user_coins_spendable")
      .select("total, locked_in_goals, spendable")
      .eq("teen_id", userInfo.profileId)
      .maybeSingle(),
    supabase
      .from("savings_goals")
      .select("id, title, description, current_saved_coins, target_coins, status, parent_match_pct")
      .eq("teen_id", userInfo.profileId)
      .order("created_at", { ascending: false }),
    getUserPurchases(undefined, true),
    // Onglet Badges — tous les achievements + progression (RPC get_user_achievements).
    getAchievements({ teenId }).catch(() => ({ success: false as const, data: [] })),
  ])

  const balance = dashboardData?.coins?.balance ?? 0
  const spendable = spendableRow?.spendable ?? 0
  const total = spendableRow?.total ?? balance
  const locked = spendableRow?.locked_in_goals ?? 0

  // Serialize data
  const walletData = {
    xp: dashboardData?.xp || { total: 0, level: 1, progressPercent: 0 },
    streak: dashboardData?.currentStreak || 0,
    // W3.1 — real balance from user_coins.balance (sourced via getTeenDashboardData).
    // Per whitepaper §5: 1 DH = 100 coins (locked). XP and coins NEVER convert.
    coins: balance,
    spendableCoins: spendable,
    cashbackThisWeek: dashboardData?.coins?.cashbackThisWeek ?? 0,
    shopHighlights: dashboardData?.shopHighlights || {},
    // Canonical shop catalog (reward_categories + get_shop_rewards RPC)
    rewards: rewardsResult.data || [],
    categories: categoriesResult.data || [],
    // Onglet Épargne — vue source unique + objectifs.
    savings: { spendable, total, locked, goals: goals || [] },
    // Onglet Historique — achats canoniques (user_purchases via RPC).
    purchases: purchasesResult.data || [],
    // Onglet Badges — achievements + progression du teen.
    achievements: (achievementsResult as { data?: unknown[] }).data || [],
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
      <div className="h-12 bg-card rounded-2xl w-full max-w-md" />
      <div className="h-48 bg-card rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-card rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
