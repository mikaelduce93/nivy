"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Users, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TeenEventsClient({ initialEvents }: { initialEvents: any[] }) {
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "featured">("all")

  const filteredEvents = initialEvents.filter(event => {
    if (filter === "confirmed") return event.rsvpStatus === "confirmed"
    if (filter === "pending") return event.rsvpStatus === "pending"
    if (filter === "featured") return event.isFeatured
    return true
  })

  const confirmedCount = initialEvents.filter((event) => event.rsvpStatus === "confirmed").length
  const pendingCount = initialEvents.filter((event) => event.rsvpStatus === "pending").length
  const featuredCount = initialEvents.filter((event) => event.isFeatured).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground">Tes prochains events avec RSVP et disponibilité.</p>
        </div>
        <div className="flex gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        {filter === "all" ? "Tous" : filter === "confirmed" ? "Confirmés" : filter === "pending" ? "En attente" : "Recommandés"}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilter("all")}>Tous</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("confirmed")}>Confirmés</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("pending")}>En attente</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("featured")}>Recommandés</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant="secondary" className="gap-2">
            <Link href="/agenda">
                <MapPin className="h-4 w-4" />
                Agenda public
            </Link>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`bg-card border-border cursor-pointer transition-all hover-lift ${filter === "all" ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter("all")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total à venir</p>
            <p className="text-2xl font-black text-primary">{initialEvents.length}</p>
          </CardContent>
        </Card>
        <Card className={`bg-card border-border cursor-pointer transition-all hover-lift ${filter === "confirmed" ? "ring-2 ring-success" : ""}`} onClick={() => setFilter("confirmed")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Confirmés</p>
            <p className="text-2xl font-black text-success">{confirmedCount}</p>
          </CardContent>
        </Card>
        <Card className={`bg-card border-border cursor-pointer transition-all hover-lift ${filter === "pending" ? "ring-2 ring-warning" : ""}`} onClick={() => setFilter("pending")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-2xl font-black text-warning">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className={`bg-card border-border cursor-pointer transition-all hover-lift ${filter === "featured" ? "ring-2 ring-info" : ""}`} onClick={() => setFilter("featured")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recommandés</p>
            <p className="text-2xl font-black text-info">
              {featuredCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            {filter === "all" ? "Prochains events" : filter === "confirmed" ? "Events confirmés" : filter === "pending" ? "Inscriptions en attente" : "Recommandations"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const date = new Date(event.date)
              const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase()
              const dayNumber = date.getDate()
              const statusClass =
                event.rsvpStatus === "confirmed"
                  ? "status-success"
                  : event.rsvpStatus === "pending"
                  ? "status-warning"
                  : event.rsvpStatus === "cancelled"
                  ? "status-destructive"
                  : "status-info"

              return (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-border bg-card"
                >
                  <div className="text-center min-w-[54px]">
                    <p className="text-xs text-muted-foreground">{dayLabel}</p>
                    <p className="text-xl font-black text-primary">{dayNumber}</p>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-semibold text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.time ? `${event.time} • ` : ""}
                      {event.venue || "Lieu à confirmer"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      {event.category && <span>{event.category}</span>}
                      {event.distanceLabel && <span>• {event.distanceLabel}</span>}
                      {event.remaining !== null && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.remaining} places
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusClass}`}>
                    {event.rsvpLabel}
                  </span>
                </div>
              )
            })
          ) : (
            <div className="text-sm text-muted-foreground">Aucun event trouvé pour ce filtre.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
