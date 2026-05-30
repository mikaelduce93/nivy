"use client"

import { useState, useMemo } from "react"
import { MapPin, Clock, Users, Calendar, ArrowRight, Trophy, Music, Palette, Code, Dumbbell, Theater, Search, Sparkles } from 'lucide-react'
import Link from "next/link"
import Image from 'next/image'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { cn } from "@/lib/utils"

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

// Couleur d'accent par catégorie (tokens charte uniquement).
const categoryColor: Record<string, string> = {
  sport: "text-lime",
  art: "text-coral",
  music: "text-coral",
  dance: "text-coral",
  theatre: "text-coral",
  tech: "text-teal",
  other: "text-gold",
}

interface Club {
  id: string
  slug?: string
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
  const textColor = categoryColor[club.category] || "text-mute"
  const cityName = club.city?.name || "Casablanca"

  return (
    <StickerCard variant="hover" className="group h-full overflow-hidden p-0">
      <div className="relative h-48 w-full shrink-0 border-b-2 border-ink">
        {club.image_url ? (
          <Image
            src={club.image_url}
            alt={club.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-paper-2">
            <Icon className={cn("size-16 opacity-50", textColor)} aria-hidden="true" />
          </div>
        )}

        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1.5">
          <Icon className={cn("size-3.5", textColor)} aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
            {categoryLabels[club.category] || "Autre"}
          </span>
        </div>

        {/* Badge token XP (gagné en participant) */}
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border-2 border-ink bg-gold px-2.5 py-1">
          <Sparkles className="size-3 text-ink" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">XP</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-2 font-display text-2xl font-extrabold text-ink">{club.name}</h3>

        {club.description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-mute">{club.description}</p>
        )}

        <div className="mb-6 flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <MapPin className={cn("size-4", textColor)} aria-hidden="true" />
            <span>{cityName}</span>
          </div>
          {club.schedule && (
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Clock className={cn("size-4", textColor)} aria-hidden="true" />
              <span>{club.schedule}</span>
            </div>
          )}
          {(club.age_min || club.age_max) && (
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Users className={cn("size-4", textColor)} aria-hidden="true" />
              <span>{club.age_min || 13}-{club.age_max || 17} ans</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t-2 border-dashed border-line pt-4">
          {club.price_per_session ? (
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mute">À partir de</p>
              <p className="font-display text-xl font-extrabold text-ink">{club.price_per_session} DH</p>
            </div>
          ) : (
            <span />
          )}
          {club.slug ? (
            <Button asChild variant="pink" size="sm">
              <Link href={`/clubs/${club.slug}`}>
                Découvrir
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              Détail bientôt dispo
            </span>
          )}
        </div>
      </div>
    </StickerCard>
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

  const pill = (active: boolean) =>
    cn(
      "rounded-full px-5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-all",
      active
        ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
        : "border-2 border-ink bg-white text-mute hover:text-ink",
    )

  return (
    <>
      {/* Search Bar */}
      <div className="mx-auto mb-10 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mute" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Rechercher un club…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 border-2 border-ink pl-12 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={() => setSelectedCategory("all")} className={pill(selectedCategory === "all")}>
          Tous
        </Button>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat] || Calendar
          return (
            <Button key={cat} variant="ghost" onClick={() => setSelectedCategory(cat)} className={pill(selectedCategory === cat)}>
              <Icon className="mr-1.5 size-4" aria-hidden="true" />
              {categoryLabels[cat] || cat}
            </Button>
          )
        })}
      </div>

      {/* City Filter */}
      {cities.length > 1 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          <span className="mr-2 self-center font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mute">Ville</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCity("all")} className={pill(selectedCity === "all")}>
            Toutes
          </Button>
          {cities.map((city) => (
            <Button key={city} variant="ghost" size="sm" onClick={() => setSelectedCity(city)} className={pill(selectedCity === city)}>
              {city}
            </Button>
          ))}
        </div>
      )}

      {/* Results */}
      {filteredClubs.length > 0 ? (
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-md">
          <NivEmpty
            mood="calm"
            title="Aucun club trouvé"
            description="Rien ne correspond à tes critères. Essaie une autre catégorie ou ville."
            action={
              <Button
                variant="pink"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("all")
                  setSelectedCity("all")
                }}
              >
                Réinitialiser les filtres
              </Button>
            }
          />
        </div>
      )}

      {/* Results count */}
      {filteredClubs.length > 0 && (
        <div className="mt-10 text-center font-mono text-sm text-mute">
          {filteredClubs.length} club{filteredClubs.length > 1 ? "s" : ""} trouvé{filteredClubs.length > 1 ? "s" : ""}
        </div>
      )}
    </>
  )
}
