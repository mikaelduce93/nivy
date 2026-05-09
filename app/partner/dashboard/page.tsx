// Wave 3B.3 — canon D6: /partner/dashboard duplicates /partner.
// Single canonical hub is /partner. Permanent redirect removes the duplicate.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function PartnerDashboardRedirect(): never {
  permanentRedirect("/partner")
}
