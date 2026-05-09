// Wave 2B — canon §2 (routing.locked.md): /gamification/parcours is 410-gone.
// Static mock with no consumers. The unified quest hub at /teen/quests is the
// canonical "progression" surface; pathways belong in /teen/pathways.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function GamificationParcoursRedirect(): never {
  permanentRedirect("/teen/quests")
}
