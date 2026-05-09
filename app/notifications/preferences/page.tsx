// Wave 5A — canon §5 rule 3 (routing.locked.md): /notifications/* is forbidden.
// Per-role preferences live under each role tree (e.g. /parent/settings,
// /teen/profile?tab=settings). Funnel through the role router.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function NotificationsPreferencesRedirect(): never {
  permanentRedirect("/auth/redirect")
}
