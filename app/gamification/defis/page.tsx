// TICKET-024 (Wave 3 FD6) — legacy redirect cleanup.
//
// Wave E.2 had this route 308-redirect to /teen/quests as a stop-gap while
// the friend-challenge UI was being merged into the canonical quests
// surface. With Wave-2 FD2 (TICKET-020) shipping the real
// /teen/quests/friend-defis tab, the redirect target is now updated to
// that more specific surface so legacy bookmarks land on the correct UI.
//
// The previous companion file challenges-client.tsx (legacy friend-defi
// client kept on disk "for reference") has been deleted as part of this
// ticket — the canonical friend-defi client now lives at
// app/teen/quests/friend-defis/friend-defis-client.tsx.
import { permanentRedirect } from "next/navigation"

export default function DefisLegacyPage() {
  permanentRedirect("/teen/quests/friend-defis")
}

export const metadata = {
  title: "Défis",
  robots: { index: false, follow: false },
}
