"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, Users, Search, ArrowRight, Download, Grid, List, SlidersHorizontal, X, TrendingUp, Sparkles, Flame } from 'lucide-react'
import Link from "next/link"
import Image from 'next/image'

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

  return (
    <>
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{filteredEvents.length} événements disponibles</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4">Prochaines Soirées</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Découvre tous nos événements à venir et réserve ta place pour des soirées inoubliables
        </p>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un événement par nom ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 text-base"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent cursor-pointer"
          >
            <option value="date">Date ↑</option>
            <option value="price-asc">Prix ↑</option>
            <option value="price-desc">Prix ↓</option>
            <option value="popularity">Popularité</option>
            <option value="spots">Places restantes</option>
          </select>

          <div className="flex border border-input rounded-md overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-none"
              aria-label="Vue grille"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-none"
              aria-label="Vue liste"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-6 mb-6 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Ville</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
              >
                <option value="all">Toutes les villes</option>
                {initialCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
              >
                <option value="all">Tous les types</option>
                <option value="regular">Soirée Régulière</option>
                <option value="themed">Soirée à Thème</option>
                <option value="special">Événement Spécial</option>
                <option value="vip">Soirée VIP</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Thème</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
              >
                <option value="all">Tous les thèmes</option>
                {initialThemes.map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mon âge</label>
              <select
                value={selectedAge}
                onChange={(e) => setSelectedAge(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
              >
                <option value="all">Tous les âges</option>
                {[11, 12, 13, 14, 15, 16, 17].map((age) => (
                  <option key={age} value={age}>{age} ans</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={showAEFEOnly}
                onChange={(e) => setShowAEFEOnly(e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <span className="text-sm font-medium">Uniquement profil AEFE</span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                -20%
              </Badge>
            </label>
          </div>
        </Card>
      )}

      {/* Active Filters Pills */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedCity !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Ville: {selectedCity}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCity("all")} />
            </Badge>
          )}
          {selectedType !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Type: {selectedType}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedType("all")} />
            </Badge>
          )}
          {selectedTheme !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Thème: {selectedTheme}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTheme("all")} />
            </Badge>
          )}
          {selectedAge !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Âge: {selectedAge} ans
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedAge("all")} />
            </Badge>
          )}
          {showAEFEOnly && (
            <Badge variant="secondary" className="gap-2 bg-blue-500/10 text-blue-500">
              Profil AEFE
              <X className="w-3 h-3 cursor-pointer" onClick={() => setShowAEFEOnly(false)} />
            </Badge>
          )}
        </div>
      )}

      {/* Events Display */}
      {currentEvents.length > 0 ? (
        <>
          {viewMode === "grid" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {currentEvents.map((event) => (
                <EventCardGrid key={event.id} event={event} onAddToCalendar={addToCalendar} />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-4 mb-8">
              {currentEvents.map((event) => (
                <EventCardList key={event.id} event={event} onAddToCalendar={addToCalendar} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
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
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Aucun événement trouvé</h3>
          <p className="text-muted-foreground mb-6">
            Essayez de modifier vos filtres pour voir plus d'événements
          </p>
          <Button onClick={clearFilters}>
            Réinitialiser les filtres
          </Button>
        </Card>
      )}
    </>
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
    <Card className="overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      <div className="relative h-48">
        <Image
          src={event.image_url || "/placeholder.svg?height=192&width=400&query=teens party event"}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 group-hover:from-black/70 transition-colors" />

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-green-500 text-white gap-1">
              <Sparkles className="w-3 h-3" />
              Nouveau
            </Badge>
          )}
          {isPopular && (
            <Badge className="bg-purple-500 text-white gap-1">
              <TrendingUp className="w-3 h-3" />
              Populaire
            </Badge>
          )}
          {event.has_aefe_discount && (
            <Badge className="bg-blue-500 text-white">AEFE -20%</Badge>
          )}
          {isAlmostFull && (
            <Badge className="bg-orange-500 text-white gap-1">
              <Flame className="w-3 h-3" />
              Presque complet
            </Badge>
          )}
          {isFull && (
            <Badge className="bg-red-500 text-white">COMPLET</Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 bg-primary text-white font-bold text-center rounded-lg overflow-hidden shadow-lg">
          <div className="px-3 py-1 text-2xl">{eventDate.getDate()}</div>
          <div className="px-3 py-0.5 text-xs bg-primary/80">
            {eventDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{event.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span>{event.age_min}-{event.age_max} ans • {spotsLeft} places</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">À partir de</p>
            <p className="text-2xl font-black text-primary">{event.price} DH</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddToCalendar(event)}
            className="text-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            Calendrier
          </Button>
        </div>

        <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" disabled={isFull}>
          <Link href={`/agenda/${event.id}`}>
            {isFull ? "Complet" : "Voir les détails"}
            {!isFull && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Link>
        </Button>
      </div>
    </Card>
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
    <Card className="overflow-hidden group hover:shadow-lg transition-all">
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-64 h-48 sm:h-auto flex-shrink-0">
          <Image
            src={event.image_url || "/placeholder.svg?height=200&width=256&query=teens party event"}
            alt={event.title}
            fill
            sizes="256px"
            className="object-cover"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {isNew && (
              <Badge className="bg-green-500 text-white gap-1 text-xs">
                <Sparkles className="w-3 h-3" />
                Nouveau
              </Badge>
            )}
            {isPopular && (
              <Badge className="bg-purple-500 text-white gap-1 text-xs">
                <TrendingUp className="w-3 h-3" />
                Populaire
              </Badge>
            )}
            {event.has_aefe_discount && (
              <Badge className="bg-blue-500 text-white text-xs">AEFE -20%</Badge>
            )}
            {isAlmostFull && (
              <Badge className="bg-orange-500 text-white gap-1 text-xs">
                <Flame className="w-3 h-3" />
                Presque complet
              </Badge>
            )}
            {isFull && (
              <Badge className="bg-red-500 text-white text-xs">COMPLET</Badge>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {event.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{eventDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span>{eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{event.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span>{event.age_min}-{event.age_max} ans • {spotsLeft} places</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">À partir de</p>
              <p className="text-3xl font-black text-primary">{event.price} DH</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToCalendar(event)}
              >
                <Download className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
              <Button asChild disabled={isFull}>
                <Link href={`/agenda/${event.id}`}>
                  {isFull ? "Complet" : "Réserver"}
                  {!isFull && <ArrowRight className="w-4 h-4 ml-2" />}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
