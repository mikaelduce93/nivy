"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, DarkSurface, NivEmpty } from "@/components/brand"

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

  const sectionTitle =
    filter === "all"
      ? "Prochains events"
      : filter === "confirmed"
        ? "Events confirmés"
        : filter === "pending"
          ? "Inscriptions en attente"
          : "Recommandations"

  return (
    <div className="space-y-8 pt-6">
      {/* Hero éditorial */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow tracking-[0.16em] text-pink">Ton crew sort</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Tes prochains <em className="font-semibold italic text-pink">events</em>
          </h1>
          <p className="mt-1 text-sm text-mute">Tes sorties avec inscription et places dispo.</p>
        </div>
        <Niv mood="hype" size={72} className="shrink-0" />
      </header>

      {/* Compteur en surface sombre + filtres sticker */}
      <DarkSurface tone="pink" shadow className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow tracking-[0.16em] text-paper/60">Events à venir</p>
            <p className="mt-2 font-display text-6xl font-extrabold leading-none tabular-nums text-pink">
              {initialEvents.length}
            </p>
          </div>
          <StickerTabs
            ariaLabel="Filtrer les events"
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
            tabs={[
              { value: "all", label: "Tous" },
              { value: "confirmed", label: "Confirmés", badge: confirmedCount || undefined },
              { value: "pending", label: "En attente", badge: pendingCount || undefined },
              { value: "featured", label: "Recommandés", badge: featuredCount || undefined },
            ]}
          />
        </div>
      </DarkSurface>

      {/* Liste des events */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight">{sectionTitle}</h2>

        {filteredEvents.length > 0 ? (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const date = new Date(event.date)
              const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase()
              const dayNumber = date.getDate()
              const statusTone =
                event.rsvpStatus === "confirmed"
                  ? "bg-lime text-on-bright"
                  : event.rsvpStatus === "pending"
                    ? "bg-gold text-ink"
                    : event.rsvpStatus === "cancelled"
                      ? "bg-coral text-ink"
                      : "bg-teal text-paper"

              return (
                <StickerCard key={event.id} variant="hover" className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="grid min-w-[54px] place-items-center rounded-xl border-2 border-ink bg-teal px-2 py-1 text-paper">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">{dayLabel}</span>
                      <span className="font-display text-xl font-extrabold tabular-nums">{dayNumber}</span>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <p className="font-display font-extrabold tracking-tight text-ink">{event.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-mute">
                        {event.time ? `${event.time} • ` : ""}
                        {event.venue || "Lieu à confirmer"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
                        {event.category && (
                          <span className="rounded-full border-2 border-ink px-2 py-0.5">{event.category}</span>
                        )}
                        {event.distanceLabel && <span>{event.distanceLabel}</span>}
                        {event.remaining !== null && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            {event.remaining} places
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] ${statusTone}`}
                    >
                      {event.rsvpLabel}
                    </span>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        ) : (
          <NivEmpty
            mood="proud"
            title="Rien de prévu pour l'instant"
            description="Ton crew explore quoi ? Va voir l'agenda public pour dénicher ta prochaine sortie."
            action={
              <Button asChild variant="pink">
                <Link href="/agenda">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Explorer l'agenda
                </Link>
              </Button>
            }
          />
        )}
      </section>

      {/* CTA secondaire discret vers l'agenda public */}
      <div className="flex justify-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/agenda">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Agenda public
          </Link>
        </Button>
      </div>
    </div>
  )
}
