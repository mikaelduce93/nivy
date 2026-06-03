// REDIRECT: /gamification/defis-physiques now redirects to /teen/defis-physiques (server-wired Supabase page).
// #184 — aligned with the wave: permanentRedirect (308) + robots:noindex.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = { robots: { index: false, follow: false } }

export default function GamificationDefisPhysiquesPage() {
  permanentRedirect("/teen/defis-physiques")
}
