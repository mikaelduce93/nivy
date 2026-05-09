// Wave 5A — canon §2 (routing.locked.md): /autorisations is sunset.
// Canonical surface for parental approvals is /parent/approvals.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AutorisationsRedirect(): never {
  permanentRedirect("/parent/approvals")
}
