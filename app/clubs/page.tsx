import { createClient } from "@/lib/supabase/server"
import { ClubsListClient } from "@/components/features/clubs"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Clubs | Teens Party Morocco",
  description: "Découvre tous nos clubs pour ados : sport, art, tech, musique, danse et plus encore au Maroc.",
}

export const revalidate = 60 // Revalidate every 60 seconds

async function getClubs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clubs")
    .select(`
      *,
      city:cities(name)
    `)
    .eq('is_active', true)
    .order("name")

  if (error) {
    console.error("Error fetching clubs:", error)
    return []
  }

  return data || []
}

export default async function ClubsPage() {
  const clubs = await getClubs()

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent">
            Nos Clubs
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Rejoins un club et développe tes talents avec d'autres passionnés
          </p>
        </div>

        <ClubsListClient initialClubs={clubs} />
      </div>
    </div>
  )
}
