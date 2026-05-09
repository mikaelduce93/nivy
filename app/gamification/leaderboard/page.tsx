// Wave 2B — canon §2 (routing.locked.md): /gamification/leaderboard → /teen/leaderboard.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function GamificationLeaderboardRedirect(): never {
  permanentRedirect("/teen/leaderboard")
}
