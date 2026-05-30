"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, MapPin, Clock, Users, Search, ArrowRight, Download, Grid, List, SlidersHorizontal, X, TrendingUp, Sparkles, Flame } from 'lucide-react'
import Link from "next/link"
import Image from 'next/image'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerCard } from "@/components/ui/sticker-card"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { CheckRound } from "@/components/ui/check-round"
import { Niv, NivEmpty } from "@/components/brand"
import { Marquee } from "@/components/kit/marquee"
import { cn } from "@/lib/utils"

interface Event {
  id: string
  title: string
  description?: string
  event_date: string
  city: string
  venue?: string
  type: string
  theme?: string
  age_min: number
  age_max: number
  price: number
  capacity: number
  current_attendees: number
  has_aefe_discount: boolean
  image_url?: string
  created_at: string
}

interface EventsClientProps {
  initialEvents: Event[]
  initialCities: string[]
  initialThemes: string[]
}

export function EventsClient({ initialEvents, initialCities, initialThemes }: EventsClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedAge, setSelectedAge] = useState("all")
  const [showAEFEOnly, setShowAEFEOnly] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [sortBy, setSortBy] = useState("date")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const eventsPerPage = viewMode === "grid" ? 9 : 6

  const filteredEvents = useMemo(() => {
    let filtered = [...initialEvents]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
      )
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter((event) => event.city === selectedCity)
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((event) => event.type === selectedType)
    }

    if (selectedAge !== "all") {
      const age = parseInt(selectedAge)
      filtered = filtered.filter((event) => age >= event.age_min && age <= event.age_max)
    }

    if (selectedTheme !== "all") {
      filtered = filtered.filter((event) => event.theme === selectedTheme)
    }

    if (showAEFEOnly) {
      filtered = filtered.filter((event) => event.has_aefe_discount)
    }

    filtered = filtered.filter((event) => event.price >= priceRange[0] && event.price <= priceRange[1])

    // Sort
    if (sortBy === "date") {
      filtered.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    } else if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price)
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price)
    } else if (sortBy === "popularity") {
      filtered.sort((a, b) => (b.current_attendees || 0) - (a.current_attendees || 0))
    } else if (sortBy === "spots") {
      filtered.sort((a, b) => {
        const spotsA = a.capacity - (a.current_attendees || 0)
        const spotsB = b.capacity - (b.current_attendees || 0)
        return spotsB - spotsA
      })
    }

    return filtered
  }, [initialEvents, searchQuery, selectedCity, selectedType, selectedAge, selectedTheme, showAEFEOnly, priceRange, sortBy])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCity, selectedType, selectedAge, selectedTheme, showAEFEOnly, priceRange, sortBy])

  function addToCalendar(event: Event) {
    const startDate = new Date(event.event_date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const endDate = new Date(new Date(event.event_date).getTime() + 6 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(event.venue || "")}`

    window.open(calendarUrl, "_blank")
  }

  function clearFilters() {
    setSearchQuery("")
    setSelectedCity("all")
    setSelectedType("all")
    setSelectedAge("all")
    setShowAEFEOnly(false)
    setSelectedTheme("all")
    setPriceRange([0, 500])
  }

  const activeFiltersCount = [
    selectedCity !== "all",
    selectedType !== "all",
    selectedAge !== "all",
    selectedTheme !== "all",
    showAEFEOnly,
    priceRange[0] > 0 || priceRange[1] < 500,
  ].filter(Boolean).length

  const indexOfLastEvent = currentPage * eventsPerPage
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent)
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage)

  const viewPill = (active: boolean) =>
    cn(
      "rounded-none",
      active ? "bg-ink text-paper" : "bg-white text-mute hover:text-ink",
    )

  return (
    <>
      {/* Header */}
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <Niv mood="hype" size={104} float />
        <p className="eyebrow tracking-[0.16em]">Agenda · {filteredEvents.length} événements</p>
        <h1 className="font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
          Prochaines <em className="font-semibold italic text-pink">soirées</em>
        </h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Découvre tous nos événements à venir et réserve ta place pour des soirées inoubliables.
        </p>
      </div>

      {initialCities.length > 0 && (
        <div className="mb-10">
          <Marquee items={initialCities} />
        </div>
      )}

      {/* Search and Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-mute" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Rechercher un événement…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 border-2 border-ink pl-11 focus-visible:ring-0"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showFilters ? "pink" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border-2 border-ink bg-pink font-mono text-[10px] font-bold text-ink">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          <div className="w-40">
            <SelectSticker value={sortBy} onValueChange={setSortBy}>
              <SelectStickerItem value="date">Date ↑</SelectStickerItem>
              <SelectStickerItem value="price-asc">Prix ↑</SelectStickerItem>
              <SelectStickerItem value="price-desc">Prix ↓</SelectStickerItem>
              <SelectStickerItem value="popularity">Popularité</SelectStickerItem>
              <SelectStickerItem value="spots">Places restantes</SelectStickerItem>
            </SelectSticker>
          </div>

          <div className="flex overflow-hidden rounded-xl border-2 border-ink">
            <Button variant="ghost" size="icon" onClick={() => setViewMode("grid")} className={viewPill(viewMode === "grid")} aria-label="Vue grille">
              <Grid className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewPill(viewMode === "list")} aria-label="Vue liste">
              <List className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <StickerCard className="mb-6 gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 size-4" aria-hidden="true" />
                Réinitialiser
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SelectSticker label="Ville" value={selectedCity} onValueChange={setSelectedCity}>
              <SelectStickerItem value="all">Toutes les villes</SelectStickerItem>
              {initialCities.map((city) => (
                <SelectStickerItem key={city} value={city}>{city}</SelectStickerItem>
              ))}
            </SelectSticker>

            <SelectSticker label="Type" value={selectedType} onValueChange={setSelectedType}>
              <SelectStickerItem value="all">Tous les types</SelectStickerItem>
              <SelectStickerItem value="regular">Soirée régulière</SelectStickerItem>
              <SelectStickerItem value="themed">Soirée à thème</SelectStickerItem>
              <SelectStickerItem value="special">Événement spécial</SelectStickerItem>
              <SelectStickerItem value="vip">Soirée VIP</SelectStickerItem>
            </SelectSticker>

            <SelectSticker label="Thème" value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectStickerItem value="all">Tous les thèmes</SelectStickerItem>
              {initialThemes.map((theme) => (
                <SelectStickerItem key={theme} value={theme}>{theme}</SelectStickerItem>
              ))}
            </SelectSticker>

            <SelectSticker label="Mon âge" value={selectedAge} onValueChange={setSelectedAge}>
              <SelectStickerItem value="all">Tous les âges</SelectStickerItem>
              {[11, 12, 13, 14, 15, 16, 17].map((age) => (
                <SelectStickerItem key={age} value={String(age)}>{age} ans</SelectStickerItem>
              ))}
            </SelectSticker>
          </div>

          <div className="border-t-2 border-dashed border-line pt-4">
            <CheckRound
              checked={showAEFEOnly}
              onCheckedChange={(checked) => setShowAEFEOnly(checked === true)}
              label={<span className="flex items-center gap-2">Uniquement profil AEFE <span className="rounded-full border-2 border-ink bg-teal px-2 py-0.5 font-mono text-[10px] font-bold text-ink">-20%</span></span>}
            />
          </div>
        </StickerCard>
      )}

      {/* Active Filters Pills */}
      {activeFiltersCount > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {selectedCity !== "all" && <FilterPill label={`Ville : ${selectedCity}`} onClear={() => setSelectedCity("all")} />}
          {selectedType !== "all" && <FilterPill label={`Type : ${selectedType}`} onClear={() => setSelectedType("all")} />}
          {selectedTheme !== "all" && <FilterPill label={`Thème : ${selectedTheme}`} onClear={() => setSelectedTheme("all")} />}
          {selectedAge !== "all" && <FilterPill label={`Âge : ${selectedAge} ans`} onClear={() => setSelectedAge("all")} />}
          {showAEFEOnly && <FilterPill label="Profil AEFE" onClear={() => setShowAEFEOnly(false)} />}
        </div>
      )}

      {/* Events Display */}
      {currentEvents.length > 0 ? (
        <>
          {viewMode === "grid" && (
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {currentEvents.map((event) => (
                <EventCardGrid key={event.id} event={event} onAddToCalendar={addToCalendar} />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="mb-8 space-y-4">
              {currentEvents.map((event) => (
                <EventCardList key={event.id} event={event} onAddToCalendar={addToCalendar} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Précédent
              </Button>

              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button key={pageNum} variant={currentPage === pageNum ? "pink" : "outline"} onClick={() => setCurrentPage(pageNum)} className="w-10">
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Suivant
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-md">
          <NivEmpty
            mood="calm"
            title="Aucun événement trouvé"
            description="Essaie de modifier tes filtres pour voir plus d'événements."
            action={<Button variant="pink" onClick={clearFilters}>Réinitialiser les filtres</Button>}
          />
        </div>
      )}
    </>
  )
}

function FilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-paper-2 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink">
      {label}
      <button type="button" onClick={onClear} aria-label="Retirer le filtre">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}

// Grid Card Component
function EventCardGrid({ event, onAddToCalendar }: { event: Event; onAddToCalendar: (e: Event) => void }) {
  const eventDate = new Date(event.event_date)
  const spotsLeft = event.capacity - event.current_attendees
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0
  const isFull = spotsLeft <= 0
  const isPopular = event.current_attendees > event.capacity * 0.7
  const isNew = new Date().getTime() - new Date(event.created_at).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <StickerCard variant="hover" className="overflow-hidden p-0">
      <div className="relative h-48 border-b-2 border-ink">
        <Image
          src={event.image_url || "/placeholder.svg?height=192&width=400&query=soiree nivy"}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {isNew && <CardBadge className="bg-lime"><Sparkles className="size-3" aria-hidden="true" />Nouveau</CardBadge>}
          {isPopular && <CardBadge className="bg-pink"><TrendingUp className="size-3" aria-hidden="true" />Populaire</CardBadge>}
          {event.has_aefe_discount && <CardBadge className="bg-teal">AEFE -20%</CardBadge>}
          {isAlmostFull && <CardBadge className="bg-coral"><Flame className="size-3" aria-hidden="true" />Presque complet</CardBadge>}
          {isFull && <CardBadge className="bg-destructive text-paper">Complet</CardBadge>}
        </div>

        <div className="absolute right-3 top-3 overflow-hidden rounded-lg border-2 border-ink bg-pink text-center font-display text-ink">
          <div className="px-3 py-1 text-2xl font-extrabold">{eventDate.getDate()}</div>
          <div className="border-t-2 border-ink px-3 py-0.5 font-mono text-[10px] font-bold uppercase">
            {eventDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="mb-3 line-clamp-2 font-display text-xl font-bold text-ink">{event.title}</h3>

        <div className="mb-4 space-y-2">
          <CardMeta icon={Clock}>{eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</CardMeta>
          <CardMeta icon={MapPin}>{event.city}</CardMeta>
          <CardMeta icon={Users}>{event.age_min}-{event.age_max} ans • {spotsLeft} places</CardMeta>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">À partir de</p>
            <p className="font-display text-2xl font-extrabold text-ink">{event.price} DH</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onAddToCalendar(event)} className="text-xs">
            <Download className="mr-1 size-4" aria-hidden="true" />
            Calendrier
          </Button>
        </div>

        <Button asChild variant="pink" className="w-full" disabled={isFull}>
          <Link href={`/agenda/${event.id}`}>
            {isFull ? "Complet" : "Voir les détails"}
            {!isFull && <ArrowRight className="ml-2 size-4" aria-hidden="true" />}
          </Link>
        </Button>
      </div>
    </StickerCard>
  )
}

// List Card Component
function EventCardList({ event, onAddToCalendar }: { event: Event; onAddToCalendar: (e: Event) => void }) {
  const eventDate = new Date(event.event_date)
  const spotsLeft = event.capacity - event.current_attendees
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0
  const isFull = spotsLeft <= 0
  const isPopular = event.current_attendees > event.capacity * 0.7
  const isNew = new Date().getTime() - new Date(event.created_at).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <StickerCard variant="hover" className="overflow-hidden p-0">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-48 w-full shrink-0 border-b-2 border-ink sm:h-auto sm:w-64 sm:border-b-0 sm:border-r-2">
          <Image
            src={event.image_url || "/placeholder.svg?height=200&width=256&query=soiree nivy"}
            alt={event.title}
            fill
            sizes="256px"
            className="object-cover"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {isNew && <CardBadge className="bg-lime"><Sparkles className="size-3" aria-hidden="true" />Nouveau</CardBadge>}
            {isPopular && <CardBadge className="bg-pink"><TrendingUp className="size-3" aria-hidden="true" />Populaire</CardBadge>}
            {event.has_aefe_discount && <CardBadge className="bg-teal">AEFE -20%</CardBadge>}
            {isAlmostFull && <CardBadge className="bg-coral"><Flame className="size-3" aria-hidden="true" />Presque complet</CardBadge>}
            {isFull && <CardBadge className="bg-destructive text-paper">Complet</CardBadge>}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-6">
          <div>
            <h3 className="mb-2 font-display text-2xl font-bold text-ink">{event.title}</h3>
            <p className="mb-4 line-clamp-2 text-sm text-mute">{event.description}</p>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <CardMeta icon={Calendar}>{eventDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</CardMeta>
              <CardMeta icon={Clock}>{eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</CardMeta>
              <CardMeta icon={MapPin}>{event.city}</CardMeta>
              <CardMeta icon={Users}>{event.age_min}-{event.age_max} ans • {spotsLeft} places</CardMeta>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">À partir de</p>
              <p className="font-display text-3xl font-extrabold text-ink">{event.price} DH</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onAddToCalendar(event)}>
                <Download className="mr-1 size-4" aria-hidden="true" />
                Ajouter
              </Button>
              <Button asChild variant="pink" disabled={isFull}>
                <Link href={`/agenda/${event.id}`}>
                  {isFull ? "Complet" : "Réserver"}
                  {!isFull && <ArrowRight className="ml-2 size-4" aria-hidden="true" />}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StickerCard>
  )
}

function CardBadge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("flex w-fit items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink", className)}>
      {children}
    </span>
  )
}

function CardMeta({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-2">
      <Icon className="size-4 text-pink" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
