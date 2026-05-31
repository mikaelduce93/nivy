// Wave 6E — admin club edit form is GONE.
// See /admin/clubs/page.tsx for the migration rationale. This was the last
// surviving V1.5 placeholder (2 champs, bouton sans handler, club jamais
// fetché). Par cohérence avec ses routes sœurs dépréciées, on redirige.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AdminClubModifierRedirect(): never {
  permanentRedirect("/admin")
}
