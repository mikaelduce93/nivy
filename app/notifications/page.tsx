// Wave 5A — canon §5 rule 3 (routing.locked.md): /notifications is forbidden.
// Notifications must be role-namespaced: /parent/notifications, /teen/activity,
// /partner/notifications etc. We funnel through the canonical role router so
// each user lands on the right surface.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function NotificationsRedirect(): never {
  permanentRedirect("/auth/redirect")
}
