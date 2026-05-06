"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, MapPin, Users, Trophy, Cake, Loader2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  type: "event" | "club" | "article"
  title: string
  subtitle?: string
  href: string
  icon: typeof Calendar
  badge?: string
}

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const searchData = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const [eventsRes, clubsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, city, event_date")
          .ilike("title", `%${searchQuery}%`)
          .gte("event_date", new Date().toISOString())
          .limit(5),
        supabase
          .from("clubs")
          .select("id, name, category")
          .ilike("name", `%${searchQuery}%`)
          .eq("is_active", true)
          .limit(5),
      ])

      const searchResults: SearchResult[] = []

      type EventRow = { id: string; title: string; city: string; event_date: string }
      type ClubRow = { id: string; name: string; category: string }

      // Add events
      if (eventsRes.data) {
        ;(eventsRes.data as EventRow[]).forEach((event) => {
          searchResults.push({
            id: event.id,
            type: "event",
            title: event.title,
            subtitle: `${event.city} - ${new Date(event.event_date).toLocaleDateString("fr-FR")}`,
            href: `/agenda/${event.id}`,
            icon: Calendar,
            badge: "Event",
          })
        })
      }

      // Add clubs
      if (clubsRes.data) {
        ;(clubsRes.data as ClubRow[]).forEach((club) => {
          searchResults.push({
            id: club.id,
            type: "club",
            title: club.name,
            subtitle: club.category,
            href: `/clubs/${club.id}`,
            icon: Trophy,
            badge: "Club",
          })
        })
      }

      setResults(searchResults)
      setSelectedIndex(0)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchData(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchData])

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      router.push(results[selectedIndex].href)
      onOpenChange(false)
    }
  }

  const handleResultClick = (href: string) => {
    router.push(href)
    onOpenChange(false)
  }

  const quickLinks = [
    { label: "Prochains Events", href: "/agenda", icon: Calendar },
    { label: "Anniversaires", href: "/anniversaires", icon: Cake },
    { label: "Tous les Clubs", href: "/clubs", icon: Trophy },
    { label: "Carte VIP", href: "/carte-vip", icon: Users },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Recherche</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <Input
            placeholder="Rechercher events, clubs, articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 h-14 text-base"
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim() === "" ? (
            /* Quick Links when no query */
            <div className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Accès rapide
              </p>
              <div className="space-y-1">
                {quickLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleResultClick(link.href)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <link.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium">{link.label}</span>
                    <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            /* Search Results */
            <div className="p-2">
              {results.map((result, index) => {
                const Icon = result.icon
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result.href)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left",
                      selectedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    {result.badge && (
                      <Badge variant="secondary" className="shrink-0">
                        {result.badge}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          ) : query.trim() !== "" && !loading ? (
            /* No Results */
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Aucun résultat pour "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Essayez avec d'autres mots-clés
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> naviguer</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd> sélectionner</span>
            </div>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd> fermer</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
