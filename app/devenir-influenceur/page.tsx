// Wave 3B.1 — canon F3: influencer track folds into ambassador (referral
// programme). Sponsored-content creators have their own canonical track at
// /devenir-createur. Permanent redirect.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function DevenirInfluenceurRedirect(): never {
  permanentRedirect("/devenir-ambassadeur")
}
