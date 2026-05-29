import { getUserCrew } from "@/gamification-system/features/crews/actions/get-crews"
import { searchCrews, getCrewLeaderboard } from "@/gamification-system/features/crews/actions/activity"
import { createClient } from "@/lib/supabase/server"
import { CirclesPageClient } from "./circles-client"
import { CirclesMessagingSection } from "./circles-messaging-section"

export default async function CirclesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Real data from gamification crews backend
  const [userCrewResult, discoverResult, leaderboardResult] = await Promise.all([
    getUserCrew().catch(() => ({ data: null, error: "load-error" })),
    searchCrews("", 10).catch(() => ({ data: [], error: "load-error" })),
    getCrewLeaderboard("all_time", 50).catch(() => ({ data: [], error: "load-error" })),
  ])

  // Serialize for client component
  const myCrew = userCrewResult.data ? JSON.parse(JSON.stringify(userCrewResult.data)) : null
  const discoverCrews = JSON.parse(JSON.stringify(discoverResult.data || []))
  const leaderboard = JSON.parse(JSON.stringify(leaderboardResult.data || []))

  return (
    <>
      <CirclesPageClient
        myCrew={myCrew}
        discoverCrews={discoverCrews}
        leaderboard={leaderboard}
      />
      {/* #60 — circle-messaging entry point (distinct circle_* backend). */}
      {user?.id && <CirclesMessagingSection teenId={user.id} />}
    </>
  )
}
