"use client"

/**
 * TEENS PARTY MOROCCO - Calendrier Page (Migrated to React Query)
 * ================================================================
 * 
 * Page de calendrier avec React Query pour le data fetching
 * Exemple de migration depuis Supabase direct vers React Query
 */

import { useState, useMemo } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useEvents } from "@/lib/queries"
import { QueryErrorFallback } from "@/components/ui/query-error-fallback"
import Link from "next/link"

interface Event {
  id: string
  title: string
  event_date: string
  event_time: string | null
  city: string | null
  venue_name: string | null
  slug?: string | null
  category: string | null
}

export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Utiliser React Query pour récupérer les événements
  const { data: allEvents, isLoading, error, refetch } = useEvents()

  // Filtrer les événements pour le mois actuel
  const events = useMemo(() => {
    if (!allEvents) return []
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    return allEvents
      .filter((event) => {
        const eventDate = new Date(event.event_date)
        return eventDate >= startOfMonth && eventDate <= endOfMonth
      })
      .map((event) => ({
        ...event,
        slug: 'slug' in event ? (event.slug ?? null) : null,
      }) as Event)
      .sort((a: Event, b: Event) => {
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      }) as Event[]
  }, [allEvents, currentDate])

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.event_date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Gestion des états de chargement et d'erreur
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
              <p className="text-zinc-400">Chargement du calendrier...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="max-w-2xl mx-auto">
            <QueryErrorFallback error={error} onRetry={() => refetch()} />
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="container mx-auto px-6 py-32">
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4">Calendrier</h1>
          <p className="text-zinc-400 text-lg">Tous nos événements en un coup d'œil</p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white">
                {currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={previousMonth}
                  variant="outline"
                  size="icon"
                  className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={nextMonth}
                  variant="outline"
                  size="icon"
                  className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => (
                <div key={day} className="text-center text-zinc-400 font-semibold text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
                const dayEvents = getEventsForDate(date)
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                const isToday = new Date().toDateString() === date.toDateString()

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square p-2 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-cyan-500 border-cyan-400 text-white"
                        : isToday
                          ? "bg-zinc-800 border-zinc-700 text-white"
                          : dayEvents.length > 0
                            ? "bg-zinc-900 border-zinc-700 text-white hover:border-cyan-500"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-lg font-bold">{i + 1}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {dayEvents.slice(0, 3).map((event, idx) => (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-cyan-400"}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="mt-8 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
              <h3 className="text-2xl font-bold text-white mb-6">
                Événements du{" "}
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/agenda/${event.slug || event.id}`}
                      className="flex items-start gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-cyan-500 transition-all group"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-8 h-8 text-white" />
                      </div>

                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
                          {event.title}
                        </h4>
                        <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                          {event.event_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {event.event_time}
                            </div>
                          )}
                          {event.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.city}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white border-0">
                        Voir
                      </Button>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">Aucun événement ce jour</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
