import { createClient } from "@/lib/supabase/server"
import { ClubsListClient } from "@/components/features/clubs"
import { Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Clubs | Nivy",
  description: "Découvre tous nos clubs pour ados au Maroc : sport, art, tech, musique, danse. Gagne du XP en participant.",
}

export const revalidate = 60 // Revalidate every 60 seconds

// Wave 6A — switched from deprecated `public.clubs` (Postgres PGRST205 in
// the wild) to the canonical `public.sport_clubs` table from migration
// 022_pillars_system.sql. The two schemas don't overlap exactly —
// sport_clubs is sport-flavored only and lacks the legacy fields slug,
// description, schedule, price_per_session, age_min, age_max,
// enrolled_count, capacity. We surface what's truthful and leave the
// rest unset rather than synthesise placeholders.
//
// The detail page `/clubs/[slug]` still queries the legacy `clubs` table
// and is structurally not wired to sport_clubs (depends on enrollments +
// sessions tables). Detail re-wiring is OUT of Wave 6A scope per
// founder rule "no broad refactor, no new features beyond fixing the
// visible bug". Until that lands, the cards here intentionally omit the
// "Découvrir" CTA so users don't land on a silent 404.
async function getClubs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sport_clubs")
    .select("id, name, sport_type, city, address, logo_url, is_partner")
    .eq("is_active", true)
    .order("name")

  if (error) {
    console.error("Error fetching sport_clubs:", error)
    return []
  }

  return (data ?? []).map((row) => {
    // sport_clubs.sport_type is granular ('football','basketball','dance',…);
    // the list UI only knows category buckets. Map dance → dance, everything
    // else → sport. Don't invent art/music/tech buckets here — they belong to
    // table(s) we don't yet ship.
    const category = row.sport_type === "dance" ? "dance" : "sport"
    return {
      id: row.id as string,
      // Intentionally no slug → list card hides the broken-detail-page CTA.
      slug: undefined,
      name: row.name as string,
      image_url: (row.logo_url as string | null) ?? undefined,
      category,
      city: row.city ? { name: row.city as string } : undefined,
    }
  })
}

export default async function ClubsPage() {
  const clubs = await getClubs()

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper pb-16 pt-24">
      <MeshBackground />
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center gap-5 text-center">
          <Niv mood="hype" size={104} float />
          <p className="eyebrow tracking-[0.16em]">Clubs · Nivy</p>
          <h1 className="font-display text-5xl font-extrabold tracking-tight md:text-6xl">
            Nos <em className="font-semibold italic text-pink">clubs</em>
          </h1>
          <p className="max-w-2xl text-xl text-ink-2">
            Rejoins un club et développe tes talents avec d'autres passionnés.
          </p>
        </div>

        <ClubsListClient initialClubs={clubs} />
      </div>
    </div>
  )
}
