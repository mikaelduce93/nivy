import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { EventsClient } from "@/components/agenda"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export const metadata = {
  title: "Agenda des Événements | Nivy",
  description: "Découvre les prochains événements lifestyle (soirées, sport, créa, études) pour les 13–17 ans au Maroc et réserve ta place.",
}

async function getEvents() {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })

  if (error) {
    console.error("Error fetching events:", error)
    return { events: [], cities: [], themes: [] }
  }

  const uniqueCities = Array.from(new Set(events?.map((e) => e.city).filter(Boolean))) as string[]
  const uniqueThemes = Array.from(new Set(events?.map((e) => e.theme).filter(Boolean))) as string[]

  return {
    events: events || [],
    cities: uniqueCities,
    themes: uniqueThemes,
  }
}

function EventsSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="text-center mb-12">
        <Skeleton className="h-8 w-48 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-12 w-80 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>

      {/* Search Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Skeleton className="flex-1 h-12" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Events Grid Skeleton */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

async function EventsContent() {
  const { events, cities, themes } = await getEvents()

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <EventsClient
        initialEvents={events}
        initialCities={cities}
        initialThemes={themes}
      />
    </div>
  )
}

export default function AgendaPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <Suspense fallback={<EventsSkeleton />}>
        <EventsContent />
      </Suspense>
    </div>
  )
}
