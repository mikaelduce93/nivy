// Wave 6E — /admin/clubs is GONE.
//
// The list, create, and delete pages here all queried the deprecated
// `public.clubs` table (PGRST205 in prod). Migrating the admin tree
// to the canonical `sport_clubs` schema would be a new admin feature
// (sport_clubs has different columns: no slug/description/schedule/
// price_per_session/age_*, and no enrollments/sessions tables wired).
//
// Per founder rule "no broad refactor, no new feature beyond fixing
// the visible bug", we redirect to /admin until a real sport_clubs
// admin spec is ratified. The admin sidebar link is removed in the
// same commit (components/layouts/admin-sidebar.tsx).
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AdminClubsRedirect(): never {
  permanentRedirect("/admin")
}
