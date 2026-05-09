// Wave 6E — admin club creation form is GONE.
// See sibling /admin/clubs/page.tsx for the migration rationale.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AdminClubsCreerRedirect(): never {
  permanentRedirect("/admin")
}
