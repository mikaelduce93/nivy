// REDIRECT: /gamification/defis-physiques now redirects to /teen/defis-physiques (server-wired Supabase page).
import { redirect } from "next/navigation"

export default function GamificationDefisPhysiquesPage() {
  redirect("/teen/defis-physiques")
}
