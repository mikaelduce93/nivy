import { createClient } from "@/lib/supabase/server"
import { EventsListClient } from "@/components/features/events"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Événements | Teens Party Morocco",
  description: "Découvre tous nos événements : soirées, sports, culture, technologie et bien plus encore pour les ados de 13-17 ans au Maroc.",
}

export const revalidate = 60 // Revalidate every 60 seconds

async function getEvents() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date")

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data || []
}

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent">
            Agenda des Événements
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Découvre tous nos événements : soirées, sports, culture, technologie et bien plus encore
          </p>
        </div>

        <EventsListClient initialEvents={events} />
      </div>
    </div>
  )
}
