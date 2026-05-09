// Wave 6E — /clubs/[slug] is GONE. Redirects to /clubs.
//
// The legacy detail page queried the deprecated `public.clubs` table
// (PGRST205 in prod) and rendered enrollment + sessions panels backed
// by `club_enrollments` / `club_sessions` tables that don't exist in
// the canonical `sport_clubs` schema. Wave 6A list page already
// stopped linking here (no slug on sport_clubs rows); this stub
// covers the case where a user lands via bookmark, sitemap, or
// external link.
//
// A real per-club detail surface = a new feature, out of Wave 6E
// scope. When/if the founder ratifies a club detail spec on top of
// sport_clubs, replace this stub.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function ClubDetailRedirect(): never {
  permanentRedirect("/clubs")
}

// Provide a static empty params so Next.js prerenders the redirect for
// the no-arg case at build time. Real visitors hit the dynamic case.
export function generateStaticParams() {
  return []
}
