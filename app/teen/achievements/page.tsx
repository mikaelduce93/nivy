// REDIRECT: /teen/achievements now redirects to /gamification/collections (wired collections/achievements).
import { redirect } from "next/navigation"

export default function AchievementsPage() {
  redirect("/gamification/collections")
}
