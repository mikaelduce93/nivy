import { Suspense } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { LazyTeenDashboardContent } from "./lazy-components"
import { AvatarCoach } from "@/components/teen/avatar-coach"
import { TwinCurrencyGauge } from "@/components/teen/twin-currency-gauge"
import { SkeletonCard } from "@/components/ui/skeletons/presets"
import { createClient } from "@/lib/supabase/server"

export default async function TeenDashboardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const { teenData } = userInfo
  const teenId = teenData?.id || ''

  // #205 — l'accueil est un lanceur d'action. On ne fetch QUE ce qui alimente
  // les 2 blocs above-the-fold : la jauge double-devise (XP/coins/level/streak)
  // et le coach (AvatarCoach fait ses propres lectures). Les fetchs jetés
  // (getAchievementStats/getUserRank/getRecentlyUnlocked « reserved for future
  // use ») ont été retirés.
  const dashboardData = await getTeenDashboardData().catch(() => null)

  const xpData = dashboardData?.xp || {
    total: 0,
    level: teenData?.level || 1,
    xpToNextLevel: 100,
    xpInLevel: 0,
    xpForNextLevel: 1000,
    progressPercent: 0,
  }

  // Twin-currency gauge inputs (whitepaper §5). Coins = user_coins.balance ;
  // spendable = balance − sum(active savings_goals.current_saved_coins).
  const coinsBalance = dashboardData?.coins?.balance ?? teenData?.coins ?? 0
  let spendableCoins: number | undefined = undefined
  try {
    const supabase = await createClient()
    const { data: lockedRows } = await supabase
      .from("savings_goals")
      .select("current_saved_coins")
      .eq("teen_id", teenId)
      .eq("status", "active")
    const locked = (lockedRows || []).reduce(
      (acc: number, row: { current_saved_coins?: number | null }) =>
        acc + (row.current_saved_coins || 0),
      0
    )
    spendableCoins = Math.max(0, coinsBalance - locked)
  } catch {
    spendableCoins = undefined
  }

  return (
    <>
      {/*
        ABOVE-THE-FOLD — 2 blocs only (#205) :
        - Bloc 2 « Prochaine action » : AvatarCoach (greeting + 1 CTA réel,
          quiz/quête du jour). C'est le seul CTA primaire de l'accueil.
        - Bloc 1 « Devise » : TwinCurrencyGauge = SOURCE UNIQUE de XP, niveau,
          coins, streak (plus de répétition via OrbitingTokens / StatHero).
        XP et coins sont 2 devises distinctes, jamais reliées par une flèche.
      */}
      <div className="relative z-20 px-3 sm:px-4 md:px-8 max-w-[1200px] mx-auto pt-4 sm:pt-6 md:pt-8 space-y-4 sm:space-y-6">
        <AvatarCoach fallbackName={userInfo.fullName} />
        <TwinCurrencyGauge
          xp={xpData.total}
          level={xpData.level}
          xpToNextLevel={xpData.xpToNextLevel ?? (xpData as { xpForNextLevel?: number }).xpForNextLevel}
          xpInLevel={xpData.xpInLevel}
          coins={coinsBalance}
          spendableCoins={spendableCoins}
          variant="full"
        />
      </div>
      {/*
        Below-the-fold (streamé) : Bloc 3 (accès rapide = 4 piliers) + Bloc 4
        (complète ton profil, conditionnel). Chunk client séparé.
      */}
      <Suspense fallback={<SkeletonCard noImage lines={6} className="mt-6 max-w-[1200px] mx-auto" />}>
        <LazyTeenDashboardContent teenId={teenId} />
      </Suspense>
    </>
  )
}
