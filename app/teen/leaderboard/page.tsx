// REDIRECT: /teen/leaderboard now redirects to /gamification/leaderboard (wired Supabase leaderboard).
import { redirect } from "next/navigation"

export default function LeaderboardPage() {
  redirect("/gamification/leaderboard")
}
