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
  vitality: "text-green-400",
  creativity: "text-orange-400",
  intellect: "text-cyan-400",
  party: "text-purple-400",
  prestige: "text-yellow-400",
  none: "text-zinc-400",
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
  const textColor = categoryTextColors[neonType] || "text-zinc-400"

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
        <div className="absolute top-4 left-4 flex flex-col items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl">
          <div className={`px-4 py-1 text-xs font-bold uppercase w-full text-center ${textColor} bg-white/5`}>
            {new Date(event.event_date).toLocaleDateString("fr-FR", { month: "short" })}
          </div>
          <div className="px-4 py-1 text-2xl font-black text-white">
            {new Date(event.event_date).getDate()}
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-4 left-4">
          <div className={`glass px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md border-white/10 ${textColor}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">{categoryLabels[event.category as keyof typeof categoryLabels]}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {event.is_featured && (
            <div className="bg-yellow-500/90 text-black font-bold text-[10px] px-3 py-1 rounded-full flex items-center gap-1 shadow-lg backdrop-blur-sm uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Vedette
            </div>
          )}
          {event.available_spots === 0 && (
            <div className="bg-red-500/90 text-white font-bold text-[10px] px-3 py-1 rounded-full shadow-lg backdrop-blur-sm uppercase tracking-wide">
              Complet
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-black mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all leading-tight">
          {event.title}
        </h3>

        <div className="space-y-3 mb-6 flex-1 mt-2">
          <div className="flex items-center gap-2 text-zinc-300 text-sm">
            <MapPin className={`w-4 h-4 ${textColor}`} />
            <span>{event.city}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300 text-sm">
            <Clock className={`w-4 h-4 ${textColor}`} />
            <span>{event.event_start || "20:00"}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300 text-sm">
            <Users className={`w-4 h-4 ${textColor}`} />
            <span>{event.age_min}-{event.age_max} ans</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">À partir de</p>
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
              <p className="text-[10px] text-zinc-500 font-bold mb-1">
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
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
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
            className={`gap-2 h-14 px-8 border-white/10 ${showFilters ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {(selectedCity !== "all" || selectedPriceRange !== "all") && (
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
            )}
          </NeonButton>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <GlassCard className="mt-4 p-6 animate-fade-in-up border-white/10 bg-zinc-900/60">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Ville</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-12 text-white">
                    <SelectValue placeholder="Toutes les villes" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
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
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Prix</label>
                <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-12 text-white">
                    <SelectValue placeholder="Tous les prix" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
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
              <div className="mt-6 flex justify-end pt-4 border-t border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCity("all")
                    setSelectedPriceRange("all")
                  }}
                  className="text-zinc-400 hover:text-white hover:bg-white/5"
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
            className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 border border-white/10 rounded-full px-6 h-10 transition-all hover:text-white hover:bg-white/5 data-[state=active]:border-transparent"
          >
            Tous
          </TabsTrigger>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons]
            const count = initialEvents.filter((e) => e.category === key).length
            const neonType = categoryNeon[key]
            
            let activeClass = ""
            if (neonType === 'vitality') activeClass = "data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-500/50"
            else if (neonType === 'creativity') activeClass = "data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:border-orange-500/50"
            else if (neonType === 'intellect') activeClass = "data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:border-cyan-500/50"
            else if (neonType === 'party') activeClass = "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-500/50"
            else if (neonType === 'prestige') activeClass = "data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:border-yellow-500/50"
            else activeClass = "data-[state=active]:bg-zinc-600 data-[state=active]:text-white"

            return (
              <TabsTrigger
                key={key}
                value={key}
                className={`text-zinc-400 border border-white/10 rounded-full px-5 h-10 transition-all hover:text-white hover:bg-white/5 gap-2 ${activeClass}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
                <span className="text-[10px] opacity-60 bg-black/20 px-1.5 rounded-full">{count}</span>
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
            <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Aucun événement trouvé</h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto">
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
                className="bg-white text-black hover:bg-white/90 rounded-full px-8"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}
      </Tabs>

      {/* Results Summary */}
      {filteredEvents.length > 0 && (
        <div className="text-center mt-12 text-sm text-zinc-500 font-medium">
          {filteredEvents.length} événement{filteredEvents.length > 1 ? "s" : ""} trouvé
          {filteredEvents.length > 1 ? "s" : ""}
        </div>
      )}
    </>
  )
}
