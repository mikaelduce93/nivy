// Wave E.2 — three-quest-surfaces consolidation.
// Canonical surface for missions/quests is /teen/quests; this route redirects
// permanently. The dynamic missions UI lives there alongside daily/weekly/
// monthly/seasonal cadences, chores, and personal quests.
//
// missions-client.tsx kept on disk for git history but no longer wired.
import { redirect, permanentRedirect } from "next/navigation"

export default function MissionsLegacyPage() {
  permanentRedirect("/teen/quests")
  // Belt-and-braces fallback if permanentRedirect ever throws non-308.
  redirect("/teen/quests")
}

export const metadata = {
  title: "Missions",
  robots: { index: false, follow: false },
}
