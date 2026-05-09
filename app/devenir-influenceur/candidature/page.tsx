// Wave 3B.1 — canon F3: redirect legacy candidature → ambassadeur candidature.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function DevenirInfluenceurCandidatureRedirect(): never {
  permanentRedirect("/devenir-ambassadeur/candidature")
}
