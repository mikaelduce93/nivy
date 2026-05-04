"use client"

import { useState, useMemo } from "react"
import { MapPin, Clock, Users, Calendar, ArrowRight, Trophy, Music, Palette, Code, Dumbbell, Theater, Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from 'next/image'
import { GlassCard } from "@/components/ui/glass-card"
import { NeonButton } from "@/components/ui/neon-button"

const categoryIcons: Record<string, any> = {
  sport: Dumbbell,
  art: Palette,
  tech: Code,
  music: Music,
  dance: Trophy,
  theatre: Theater,
  other: Calendar,
}

const categoryLabels: Record<string, string> = {
  sport: "Sport",
  art: "Art",
  tech: "Tech",
  music: "Musique",
  dance: "Danse",
  theatre: "Théâtre",
  other: "Autre",
}

// Map categories to Neon pillars
const categoryNeon: Record<string, "vitality" | "creativity" | "intellect" | "party" | "prestige" | "none"> = {
  sport: "vitality",
  art: "creativity",
  music: "creativity",
  dance: "creativity",
  theatre: "creativity",
  tech: "intellect",
  other: "prestige",
}

const categoryTextColors: Record<string, string> = {
  vitality: "text-green-400",
  creativity: "text-orange-400",
  intellect: "text-cyan-400",
  party: "text-purple-400",
  prestige: "text-yellow-400",
  none: "text-zinc-400",
}

interface Club {
  id: string
  slug: string
  name: string
  description?: string
  image_url?: string
  category: string
  schedule?: string
  price_per_session?: number
  city?: { name: string }
  age_min?: number
  age_max?: number
}

interface ClubsListClientProps {
  initialClubs: Club[]
}

function ClubCard({ club }: { club: Club }) {
  const Icon = categoryIcons[club.category] || Calendar
  const neonType = categoryNeon[club.category] || "none"
  const textColor = categoryTextColors[neonType] || "text-zinc-400"
  const cityName = club.city?.name || "Casablanca"

  return (
    <GlassCard 
      variant="hover" 
      neon={neonType}
      className="group relative overflow-hidden h-full flex flex-col"
    >
      <div className="relative h-48 w-full shrink-0">
        {club.image_url ? (
          <Image
            src={club.image_url}
            alt={club.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Icon className={`w-16 h-16 ${textColor} opacity-50`} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute top-4 left-4">
          <div className={`glass px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md border-white/10 ${textColor}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">{categoryLabels[club.category] || "Autre"}</span>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-black mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all">
          {club.name}
        </h3>

        {club.description && (
          <p className="text-zinc-400 text-sm mb-4 line-clamp-2 leading-relaxed">
            {club.description}
          </p>
        )}

        <div className="space-y-3 mb-6 flex-1">
          <div className="flex items-center gap-2 text-zinc-300 text-sm">
            <MapPin className={`w-4 h-4 ${textColor}`} />
            <span>{cityName}</span>
          </div>
          {club.schedule && (
            <div className="flex items-center gap-2 text-zinc-300 text-sm">
              <Clock className={`w-4 h-4 ${textColor}`} />
              <span>{club.schedule}</span>
            </div>
          )}
          {(club.age_min || club.age_max) && (
            <div className="flex items-center gap-2 text-zinc-300 text-sm">
              <Users className={`w-4 h-4 ${textColor}`} />
              <span>{club.age_min || 13}-{club.age_max || 17} ans</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          {club.price_per_session ? (
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">À partir de</p>
              <p className={`text-xl font-black ${textColor}`}>
                {club.price_per_session} DH
              </p>
            </div>
          ) : (
            <span />
          )}
          <Link href={`/clubs/${club.slug}`}>
            <NeonButton variant={neonType === 'none' ? 'default' : neonType as any} size="sm" className="rounded-full px-6">
              Découvrir
              <ArrowRight className="w-4 h-4 ml-2" />
            </NeonButton>
          </Link>
        </div>
      </div>
    </GlassCard>
  )
}

export function ClubsListClient({ initialClubs }: ClubsListClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState<string>("all")

  const categories = useMemo(() =>
    Array.from(new Set(initialClubs.map((c) => c.category).filter(Boolean))) as string[],
    [initialClubs]
  )

  const cities = useMemo(() =>
    Array.from(new Set(initialClubs.map((c) => c.city?.name).filter(Boolean))) as string[],
    [initialClubs]
  )

  const filteredClubs = useMemo(() => {
    let filtered = initialClubs

    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => c.category === selectedCategory)
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter((c) => c.city?.name === selectedCity)
    }

    return filtered
  }, [initialClubs, selectedCategory, searchQuery, selectedCity])

  return (
    <>
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Rechercher un club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-6 transition-all ${selectedCategory === 'all' ? 'bg-white text-black hover:bg-white/90' : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          Tous
        </Button>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat] || Calendar
          const neonType = categoryNeon[cat] || "none"
          const isActive = selectedCategory === cat
          
          let activeClass = ""
          if (isActive) {
            if (neonType === 'vitality') activeClass = "bg-emerald-600 text-white border-transparent"
            else if (neonType === 'creativity') activeClass = "bg-orange-600 text-white border-transparent"
            else if (neonType === 'intellect') activeClass = "bg-cyan-600 text-white border-transparent"
            else if (neonType === 'party') activeClass = "bg-purple-600 text-white border-transparent"
            else if (neonType === 'prestige') activeClass = "bg-yellow-600 text-white border-transparent"
            else activeClass = "bg-zinc-600 text-white border-transparent"
          } else {
            activeClass = "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 bg-transparent"
          }

          return (
            <Button
              key={cat}
              variant="outline"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full gap-2 px-5 transition-all border ${activeClass}`}
            >
              <Icon className="w-4 h-4" />
              {categoryLabels[cat] || cat}
            </Button>
          )
        })}
      </div>

      {/* City Filter */}
      {cities.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <span className="text-zinc-500 text-sm self-center mr-2 uppercase tracking-widest font-bold text-[10px]">Ville</span>
          <Button
            variant={selectedCity === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedCity("all")}
            className={`rounded-lg text-xs ${selectedCity === "all" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}
          >
            TOUTES
          </Button>
          {cities.map((city) => (
            <Button
              key={city}
              variant={selectedCity === city ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCity(city)}
              className={`rounded-lg text-xs ${selectedCity === city ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}
            >
              {city.toUpperCase()}
            </Button>
          ))}
        </div>
      )}

      {/* Results */}
      {filteredClubs.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredClubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-white">Aucun club trouvé</h3>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Nous n'avons pas trouvé de club correspondant à vos critères. Essayez une autre catégorie ou ville.
          </p>
          <Button 
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory("all")
              setSelectedCity("all")
            }}
            className="bg-white text-black hover:bg-white/90 rounded-full px-8"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {/* Results count */}
      {filteredClubs.length > 0 && (
        <div className="text-center mt-12 text-sm text-zinc-500">
          {filteredClubs.length} club{filteredClubs.length > 1 ? "s" : ""} trouvé{filteredClubs.length > 1 ? "s" : ""}
        </div>
      )}
    </>
  )
}
