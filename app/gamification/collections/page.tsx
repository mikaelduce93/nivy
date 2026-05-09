// Wave 2B — canon §6.5 (routing.locked.md): /gamification/collections → /teen/profile?tab=achievements.
// Achievement display lives on the teen profile; this dedicated zone is sunset.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function GamificationCollectionsRedirect(): never {
  permanentRedirect("/teen/profile?tab=achievements")
}
