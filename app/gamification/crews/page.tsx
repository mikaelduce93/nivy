// REDIRECT: /gamification/crews → /teen/circles (canonical engine layer).
// #68 — aligned with the quest stubs: permanentRedirect (308) + robots:noindex.
import { permanentRedirect } from "next/navigation"

export const metadata = { robots: { index: false, follow: false } }

export default function CrewsPage() {
  permanentRedirect("/teen/circles")
}
