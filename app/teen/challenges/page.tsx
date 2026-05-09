// Wave 2B — canon §2 (routing.locked.md): /teen/challenges → /teen/quests?tab=body
// Body-pillar quests already filter pillar='vitality' || type='challenge', so the
// challenges hub funnels into the unified quests hub instead of duplicating the surface.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export default function TeenChallengesRedirect(): never {
  permanentRedirect("/teen/quests?tab=body")
}
