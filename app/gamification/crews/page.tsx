// REDIRECT: /gamification/crews now redirects to /teen/circles (server-wired via gamification-system/features/crews;
// both were wired but /teen/circles uses the canonical engine layer, not raw Supabase queries).
import { redirect } from "next/navigation"

export default function CrewsPage() {
  redirect("/teen/circles")
}
