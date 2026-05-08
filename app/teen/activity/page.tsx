"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Zap, Trophy, Calendar, BookOpen, Dumbbell, Users, MessageCircle, Gift, TrendingUp, Clock, Award, Target, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"

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

// Map API type -> background color class (visual catalogue, not data)
const BG_MAP: Record<string, string> = {
  xp: "bg-brand-soft/20",
  quest: "bg-success-soft/20",
  badge: "bg-yellow-500/20",
  achievement: "bg-yellow-500/20",
  social: "bg-accent-soft/20",
  event: "bg-success-soft/20",
  level: "bg-success-soft/20",
  streak: "bg-orange-500/20",
  challenge: "bg-orange-500/20",
  reward: "bg-pink-500/20",
  general: "bg-zinc-700/30",
}

const FILTERS = [
  { id: "all", label: "Tout", icon: Activity },
  { id: "xp", label: "XP", icon: Zap },
  { id: "achievement", label: "Achievements", icon: Trophy },
  { id: "social", label: "Social", icon: Users },
  { id: "event", label: "Events", icon: Calendar },
]

export default function ActivityPage() {
  const [filter, setFilter] = useState("all")
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/teen/activities?limit=50")
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((data) => {
        if (cancelled) return
        setActivities(Array.isArray(data?.activities) ? data.activities : [])
      })
      .catch(() => {
        if (!cancelled) setActivities([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredActivities = filter === "all"
    ? activities
    : activities.filter((a) => a.type === filter)

  // TODO(data): wire when /api/teen/activities/stats endpoint exposes today/week XP server-side.
  const todayXP = 0
  const weekXP = 0
  const activitiesCount = activities.length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success-soft to-emerald-500 flex items-center justify-center">
                <Activity className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Activité</h1>
                <p className="text-zinc-500 text-sm font-medium">Ton historique d'actions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-brand-soft/10 to-info-soft/5 border border-brand-soft/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-brand-soft" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Aujourd'hui</span>
            </div>
            <p className="text-2xl font-black text-brand-soft">+{todayXP} XP</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-success-soft/10 to-emerald-500/5 border border-success-soft/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-success-soft" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Cette semaine</span>
            </div>
            <p className="text-2xl font-black text-success-soft">+{weekXP} XP</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Actions</span>
            </div>
            <p className="text-2xl font-black text-white">{activitiesCount}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {FILTERS.map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                  filter === f.id
                    ? "bg-white text-black"
                    : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {f.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Activity Feed */}
      <div className="space-y-4">
        {loading && activities.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-zinc-900/40 animate-pulse" />
            ))}
          </div>
        )}
        {filteredActivities.map((activity, idx) => {
          const Icon = ICON_MAP[activity.icon] || Activity
          const bgColor = BG_MAP[activity.type] || "bg-zinc-700/30"

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColor)}>
                <Icon className={cn("w-6 h-6", activity.color || "text-zinc-300")} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{activity.text}</h4>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-zinc-500">{activity.time}</span>
              </div>
            </motion.div>
          )
        })}

        {!loading && filteredActivities.length === 0 && (
          <EmptyState
            icon={Activity}
            title="Aucune activité"
            description="Rien à afficher pour ce filtre. Lance-toi dans une quête pour faire grimper le compteur !"
            action={{ label: "Voir les quêtes", href: "/teen/quests" }}
          />
        )}
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <Button variant="outline" className="rounded-xl">
          Voir plus d'activités
        </Button>
      </div>
    </div>
  )
}
