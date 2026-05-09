// Wave 6E — admin club deletion form is GONE.
// See /admin/clubs/page.tsx for the migration rationale.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AdminClubsSupprimerRedirect(): never {
  permanentRedirect("/admin")
}
