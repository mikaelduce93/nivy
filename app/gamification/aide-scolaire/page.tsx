// REDIRECT: /gamification/aide-scolaire now redirects to /teen/aide-scolaire (canonical teen-layout static page;
// both versions were static mocks — teen version chosen as it lives within the authenticated teen shell).
// #184 — aligned with the wave: permanentRedirect (308) + robots:noindex.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = { robots: { index: false, follow: false } }

export default function GamificationAideScolairePage() {
  permanentRedirect("/teen/aide-scolaire")
}
