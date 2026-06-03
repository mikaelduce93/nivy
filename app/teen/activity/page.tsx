"use client"

import { useEffect, useState } from "react"
import { Activity, Zap, Trophy, Calendar, BookOpen, Dumbbell, Users, MessageCircle, Gift, TrendingUp, Clock, Award, Target, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, StatHero, NivEmpty } from "@/components/brand"

type ApiActivity = {
  id: string
  type: string
  text: string
  icon: string
  color: string
  time: string
  metadata?: Record<string, unknown>
}

// Map API icon strings -> Lucide components used by this page
const ICON_MAP: Record<string, any> = {
  Activity, Zap, Trophy, Calendar, BookOpen, Dumbbell, Users, MessageCircle, Gift, TrendingUp, Clock, Award, Target, Flame,
}

// Map API type -> accent token (charte paper : XP gold, streak/reward rose,
// niveau teal, quest/event lime, social teal). Catalogue visuel, pas de donnée.
const BG_MAP: Record<string, string> = {
  xp: "bg-gold/15 text-gold",
  quest: "bg-lime/15 text-ink",
  badge: "bg-gold/15 text-gold",
  achievement: "bg-gold/15 text-gold",
  social: "bg-teal/15 text-teal",
  event: "bg-lime/15 text-ink",
  level: "bg-teal/15 text-teal",
  streak: "bg-pink/15 text-pink",
  challenge: "bg-pink/15 text-pink",
  reward: "bg-pink/15 text-pink",
  general: "bg-ink/5 text-ink",
}

const FILTERS = [
  { id: "all", label: "Tout", icon: Activity },
  { id: "xp", label: "XP", icon: Zap },
  { id: "achievement", label: "Trophées", icon: Trophy },
  { id: "social", label: "Social", icon: Users },
  { id: "event", label: "Events", icon: Calendar },
]

const PAGE_SIZE = 50

export default function ActivityPage() {
  const [filter, setFilter] = useState("all")
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/teen/activities?limit=${PAGE_SIZE}`)
      .then((r) => (r.ok ? r.json() : { activities: [], hasMore: false }))
      .then((data) => {
        if (cancelled) return
        setActivities(Array.isArray(data?.activities) ? data.activities : [])
        setHasMore(Boolean(data?.hasMore))
      })
      .catch(() => {
        if (!cancelled) {
          setActivities([])
          setHasMore(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const r = await fetch(`/api/teen/activities?limit=${PAGE_SIZE}&offset=${activities.length}`)
      const data = r.ok ? await r.json() : { activities: [], hasMore: false }
      const next = Array.isArray(data?.activities) ? data.activities : []
      setActivities((prev) => [...prev, ...next])
      setHasMore(Boolean(data?.hasMore))
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  const filteredActivities = filter === "all"
    ? activities
    : activities.filter((a) => a.type === filter)

  const activitiesCount = activities.length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header éditorial + Niv */}
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <Niv mood="hype" size={72} />
          <div>
            <span className="eyebrow tracking-[0.16em] text-pink">Ton historique</span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
              Ton <em className="font-semibold italic text-pink">activité</em>
            </h1>
            <p className="text-sm text-mute">Ton historique d&apos;actions.</p>
          </div>
        </div>

        {/* Compteur d'actions — surface sombre ponctuelle (donnée réelle) */}
        <StatHero
          eyebrow="Actions enregistrées"
          value={activitiesCount}
          tone="teal"
          size="md"
          icon={<Clock className="size-6" aria-hidden="true" />}
        />

        {/* Filters */}
        <StickerTabs
          ariaLabel="Filtrer l'activité"
          value={filter}
          onValueChange={setFilter}
          tabs={FILTERS.map((f) => {
            const Icon = f.icon
            return { value: f.id, label: f.label, icon: <Icon /> }
          })}
        />
      </header>

      {/* Activity Feed */}
      <div className="space-y-4">
        {loading && activities.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl border-2 border-ink bg-white animate-pulse" />
            ))}
          </div>
        )}
        {filteredActivities.map((activity) => {
          const Icon = ICON_MAP[activity.icon] || Activity
          const bgColor = BG_MAP[activity.type] || "bg-ink/5 text-ink"

          return (
            <StickerCard key={activity.id} variant="hover" className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl border-2 border-ink flex items-center justify-center shrink-0", bgColor)}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-ink truncate">{activity.text}</h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs text-mute">{activity.time}</span>
                </div>
              </div>
            </StickerCard>
          )
        })}

        {!loading && filteredActivities.length === 0 && (
          <NivEmpty
            mood="calm"
            title="Aucune activité"
            description="Rien à afficher pour ce filtre. Lance-toi dans une quête pour faire grimper le compteur !"
            action={
              <Button asChild variant="pink">
                <a href="/teen/quests">Voir les quêtes</a>
              </Button>
            }
          />
        )}
      </div>

      {/* Load More */}
      {hasMore && filter === "all" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Chargement…" : "Voir plus d'activités"}
          </Button>
        </div>
      )}
    </div>
  )
}
