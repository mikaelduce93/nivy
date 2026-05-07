// Wave E.2 — three-quest-surfaces consolidation.
// Canonical surface for quests (incl. friend challenges) is /teen/quests.
// Friend-challenge UI (challenges-client.tsx) is being merged into a tab on
// /teen/quests in V1.1; for now this route redirects and keeps the legacy
// component file on disk as a reference until the merge lands.
import { redirect, permanentRedirect } from "next/navigation"

export default function DefisLegacyPage() {
  permanentRedirect("/teen/quests")
  redirect("/teen/quests")
}

export const metadata = {
  title: "Défis",
  robots: { index: false, follow: false },
}
