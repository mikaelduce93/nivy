// #68 — single-hop redirect straight to the canonical achievements surface.
// Previously bounced through the legacy /gamification/collections stub.
import { permanentRedirect } from "next/navigation"

export const metadata = { robots: { index: false, follow: false } }

export default function AchievementsPage() {
  permanentRedirect("/teen/profile?tab=achievements")
}
