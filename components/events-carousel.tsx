"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from "next/link"
import Image from "next/image"

export function EventsCarousel() {
  const [events, setEvents] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const supabase = createClient()
    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(6)

    if (data && data.length > 0) {
      setEvents(data)
    }
    setLoading(false)
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, events.length - 2))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, events.length - 2)) % Math.max(1, events.length - 2))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Nouveaux événements bientôt</h3>
        <p className="text-muted-foreground">Revenez prochainement pour découvrir nos prochaines soirées</p>
      </Card>
    )
  }

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out gap-6"
          style={{ transform: `translateX(-${currentIndex * (100 / 3 + 2)}%)` }}
        >
          {events.map((event) => {
            const eventDate = new Date(event.event_date)
            const spotsLeft = event.capacity - event.current_attendees
            const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0

            return (
              <Card key={event.id} className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] overflow-hidden group hover:border-primary/50 transition-all">
                <div className="relative h-48">
                  <Image
                    src={event.image_url || "/placeholder.svg?height=200&width=400&query=teens party event"}
                    alt={event.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {event.has_aefe_discount && (
                      <Badge className="bg-blue-500 text-white text-xs">AEFE -20%</Badge>
                    )}
                    {isAlmostFull && (
                      <Badge className="bg-orange-500 text-white text-xs">Bientôt complet</Badge>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{eventDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{event.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{spotsLeft} places restantes</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">À partir de</p>
                      <p className="text-xl font-black text-primary">{event.price} DH</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/agenda/${event.id}`}>
                        Voir
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {events.length > 3 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  )
}
