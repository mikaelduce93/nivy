// Wave 2B — canon §2 (routing.locked.md): /gamification hub is sunset.
// Canonical hub is /teen. The previous merged-feature dashboard duplicated
// surfaces already provided under /teen/quests, /teen/wallet, /teen/circles, etc.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function GamificationHubRedirect(): never {
  permanentRedirect("/teen")
}
