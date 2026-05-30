"use client"

import { useState, useMemo } from "react"
import { Calendar, MapPin, Clock, Users, ArrowRight, PartyPopper, Trophy, Palette, Cpu, Sparkles, Search, Filter, X, Crown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { NeonButton } from "@/components/ui/neon-button"
import { VIPDiscountBadge } from "./vip-pricing-badge"

const categoryIcons = {
  soiree: PartyPopper,
  sport: Trophy,
  "art-culture": Palette,
  technologie: Cpu,
  autres: Sparkles,
}

const categoryLabels = {
  soiree: "Soirées",
  sport: "Sport",
  "art-culture": "Art & Culture",
  technologie: "Technologie",
  autres: "Autres",
}

const categoryNeon: Record<string, "vitality" | "creativity" | "intellect" | "party" | "prestige" | "none"> = {
  soiree: "party",
  sport: "vitality",
  "art-culture": "creativity",
  technologie: "intellect",
  autres: "prestige",
}

const categoryTextColors: Record<string, string> = {
  vitality: "text-lime",
  creativity: "text-coral",
  intellect: "text-teal",
  party: "text-pink",
  prestige: "text-gold",
  none: "text-mute",
}

interface Event {
  id: string
  slug: string
  title: string
  description?: string
  featured_image?: string
  event_date: string
  event_start?: string
  city: string
  category: string
  base_price?: number | string
  max_capacity: number
  available_spots?: number
  age_min: number
  age_max: number
  is_featured?: boolean
}

interface EventsListClientProps {
  initialEvents: Event[]
}

function EventCard({ event }: { event: Event }) {
  const Icon = categoryIcons[event.category as keyof typeof categoryIcons] || PartyPopper
  const neonType = categoryNeon[event.category as keyof typeof categoryNeon] || "none"
  const textColor = categoryTextColors[neonType] || "text-mute"

  return (
    <GlassCard 
      variant="hover" 
      neon={neonType}
      className="group relative overflow-hidden h-full flex flex-col"
    >
      <div className="relative h-64 w-full shrink-0">
        <Image
          src={event.featured_image || "/placeholder.svg?height=256&width=400&query=teens party event"}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Date Badge */}
        <div className="absolute top-4 left-4 flex flex-col items-center bg-ink/60  border border-ink rounded-xl overflow-hidden shadow-xl">
          <div className={`px-4 py-1 text-xs font-bold uppercase w-full text-center ${textColor} bg-paper-2`}>
            {new Date(event.event_date).toLocaleDateString("fr-FR", { month: "short" })}
          </div>
          <div className="px-4 py-1 text-2xl font-black text-ink">
            {new Date(event.event_date).getDate()}
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-4 left-4">
          <div className={`glass px-3 py-1.5 rounded-full flex items-center gap-1.5  border-ink ${textColor}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">{categoryLabels[event.category as keyof typeof categoryLabels]}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {event.is_featured && (
            <div className="bg-gold/90 text-ink font-bold text-[10px] px-3 py-1 rounded-full flex items-center gap-1 shadow-lg  uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Vedette
            </div>
          )}
          {event.available_spots === 0 && (
            <div className="bg-destructive/90 text-ink font-bold text-[10px] px-3 py-1 rounded-full shadow-lg  uppercase tracking-wide">
              Complet
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-black mb-2 text-ink group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-card transition-all leading-tight">
          {event.title}
        </h3>

        <div className="space-y-3 mb-6 flex-1 mt-2">
          <div className="flex items-center gap-2 text-ink-2 text-sm">
            <MapPin className={`w-4 h-4 ${textColor}`} />
            <span>{event.city}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-2 text-sm">
            <Clock className={`w-4 h-4 ${textColor}`} />
            <span>{event.event_start || "20:00"}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-2 text-sm">
            <Users className={`w-4 h-4 ${textColor}`} />
            <span>{event.age_min}-{event.age_max} ans</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-ink">
          <div>
            <p className="text-mute text-[10px] uppercase tracking-widest font-bold">À partir de</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-black ${textColor}`}>
                {event.base_price ? `${event.base_price} DH` : "Gratuit"}
              </p>
              {event.base_price && Number(event.base_price) > 0 && (
                <VIPDiscountBadge />
              )}
            </div>
          </div>
          <div className="text-right">
            {event.available_spots !== undefined && event.available_spots > 0 && (
              <p className="text-[10px] text-mute font-bold mb-1">
                {event.available_spots} places
              </p>
            )}
            <Link href={`/agenda/${event.slug}`}>
              <NeonButton 
                variant={neonType === 'none' ? 'default' : neonType as any} 
                size="sm" 
                className="rounded-full px-6"
                disabled={event.available_spots === 0}
              >
                {event.available_spots === 0 ? "Complet" : "Réserver"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </NeonButton>
            </Link>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

export function EventsListClient({ initialEvents }: EventsListClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState<string>("all")
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all")
  const [selectedTab, setSelectedTab] = useState("tous")
  const [showFilters, setShowFilters] = useState(false)

  const cities = useMemo(() =>
    Array.from(new Set(initialEvents.map((e) => e.city).filter(Boolean))),
    [initialEvents]
  )

  const filteredEvents = useMemo(() => {
    let filtered = initialEvents

    // Filter by category
    if (selectedTab !== "tous") {
      filtered = filtered.filter((e) => e.category === selectedTab)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by city
    if (selectedCity !== "all") {
      filtered = filtered.filter((e) => e.city === selectedCity)
    }

    // Filter by price range
    if (selectedPriceRange !== "all") {
      if (selectedPriceRange === "free") {
        filtered = filtered.filter((e) => !e.base_price || e.base_price === "Gratuit")
      } else if (selectedPriceRange === "0-200") {
        filtered = filtered.filter((e) => e.base_price && Number.parseInt(String(e.base_price)) <= 200)
      } else if (selectedPriceRange === "200-500") {
        filtered = filtered.filter(
          (e) => e.base_price && Number.parseInt(String(e.base_price)) > 200 && Number.parseInt(String(e.base_price)) <= 500,
        )
      } else if (selectedPriceRange === "500+") {
        filtered = filtered.filter((e) => e.base_price && Number.parseInt(String(e.base_price)) > 500)
      }
    }

    return filtered
  }, [initialEvents, selectedTab, searchQuery, selectedCity, selectedPriceRange])

  return (
    <>
      {/* Search and Filters Bar */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink/20 to-pink/20 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
              <Input
                type="text"
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-card border-ink text-ink placeholder:text-mute rounded-xl focus:ring-2 focus:ring-pink/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <NeonButton 
            variant="outline" 
            size="lg" 
            onClick={() => setShowFilters(!showFilters)} 
            className={`gap-2 h-14 px-8 border-ink ${showFilters ? 'bg-paper-2 text-ink' : 'text-mute hover:text-ink hover:bg-paper-2'}`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {(selectedCity !== "all" || selectedPriceRange !== "all") && (
              <span className="w-2 h-2 rounded-full bg-pink " />
            )}
          </NeonButton>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <GlassCard className="mt-4 p-6 animate-fade-in-up border-ink bg-card">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-mute uppercase tracking-widest mb-3 block">Ville</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="bg-ink/40 border-ink h-12 text-paper">
                    <SelectValue placeholder="Toutes les villes" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-ink text-ink">
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-mute uppercase tracking-widest mb-3 block">Prix</label>
                <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                  <SelectTrigger className="bg-ink/40 border-ink h-12 text-paper">
                    <SelectValue placeholder="Tous les prix" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-ink text-ink">
                    <SelectItem value="all">Tous les prix</SelectItem>
                    <SelectItem value="free">Gratuit</SelectItem>
                    <SelectItem value="0-200">0 - 200 DH</SelectItem>
                    <SelectItem value="200-500">200 - 500 DH</SelectItem>
                    <SelectItem value="500+">500+ DH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(selectedCity !== "all" || selectedPriceRange !== "all") && (
              <div className="mt-6 flex justify-end pt-4 border-t border-ink">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCity("all")
                    setSelectedPriceRange("all")
                  }}
                  className="text-mute hover:text-ink hover:bg-paper-2"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="flex flex-wrap justify-center w-full bg-transparent h-auto gap-3 mb-12 p-0">
          <TabsTrigger
            value="tous"
            className="data-[state=active]:bg-white data-[state=active]:text-ink text-mute border border-ink rounded-full px-6 h-10 transition-all hover:text-ink hover:bg-paper-2 data-[state=active]:border-transparent"
          >
            Tous
          </TabsTrigger>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons]
            const count = initialEvents.filter((e) => e.category === key).length
            const neonType = categoryNeon[key]
            
            let activeClass = ""
            if (neonType === 'vitality') activeClass = "data-[state=active]:bg-lime data-[state=active]:text-ink data-[state=active]:border-lime/50"
            else if (neonType === 'creativity') activeClass = "data-[state=active]:bg-coral data-[state=active]:text-ink data-[state=active]:border-coral/50"
            else if (neonType === 'intellect') activeClass = "data-[state=active]:bg-teal data-[state=active]:text-ink data-[state=active]:border-teal/50"
            else if (neonType === 'party') activeClass = "data-[state=active]:bg-pink data-[state=active]:text-ink data-[state=active]:border-pink/50"
            else if (neonType === 'prestige') activeClass = "data-[state=active]:bg-gold data-[state=active]:text-ink data-[state=active]:border-gold/50"
            else activeClass = "data-[state=active]:bg-muted data-[state=active]:text-ink"

            return (
              <TabsTrigger
                key={key}
                value={key}
                className={`text-mute border border-ink rounded-full px-5 h-10 transition-all hover:text-ink hover:bg-paper-2 gap-2 ${activeClass}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
                <span className="text-[10px] opacity-60 bg-ink/20 px-1.5 rounded-full">{count}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {filteredEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-mute" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-ink">Aucun événement trouvé</h3>
            <p className="text-mute mb-6 max-w-md mx-auto">
              {searchQuery
                ? "Aucun résultat pour votre recherche. Essayez d'autres mots-clés."
                : "Revenez bientôt pour découvrir nos prochains événements"}
            </p>
            {(searchQuery || selectedCity !== "all" || selectedPriceRange !== "all") && (
              <Button
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCity("all")
                  setSelectedPriceRange("all")
                }}
                className="bg-white text-ink hover:bg-paper-2 rounded-full px-8"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}
      </Tabs>

      {/* Results Summary */}
      {filteredEvents.length > 0 && (
        <div className="text-center mt-12 text-sm text-mute font-medium">
          {filteredEvents.length} événement{filteredEvents.length > 1 ? "s" : ""} trouvé
          {filteredEvents.length > 1 ? "s" : ""}
        </div>
      )}
    </>
  )
}
