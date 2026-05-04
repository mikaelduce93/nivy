"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Activity, Zap, Trophy, Calendar, BookOpen, Dumbbell, Users, MessageCircle, Gift, TrendingUp, Clock, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Static activity data
const ACTIVITIES = [
  { id: 1, type: "xp", title: "Quiz Math complété", description: "+150 XP", icon: BookOpen, color: "text-gen-z-lavender", bgColor: "bg-gen-z-lavender/20", time: "Il y a 2h" },
  { id: 2, type: "achievement", title: "Achievement débloqué", description: "Cerveau - 5 quiz réussis", icon: Trophy, color: "text-yellow-500", bgColor: "bg-yellow-500/20", time: "Il y a 3h" },
  { id: 3, type: "social", title: "Nouvelle amitié", description: "Tu es maintenant ami avec Salma", icon: Users, color: "text-gen-z-coral", bgColor: "bg-gen-z-coral/20", time: "Il y a 5h" },
  { id: 4, type: "event", title: "Inscription event", description: "Gaming Night @ Casa", icon: Calendar, color: "text-gen-z-mint", bgColor: "bg-gen-z-mint/20", time: "Hier" },
  { id: 5, type: "challenge", title: "Défi physique complété", description: "30 squats - +75 XP", icon: Dumbbell, color: "text-orange-500", bgColor: "bg-orange-500/20", time: "Hier" },
  { id: 6, type: "xp", title: "Streak bonus", description: "+50 XP pour 5 jours consécutifs", icon: Zap, color: "text-gen-z-lavender", bgColor: "bg-gen-z-lavender/20", time: "Hier" },
  { id: 7, type: "reward", title: "Récompense réclamée", description: "Skin Avatar Premium", icon: Gift, color: "text-pink-500", bgColor: "bg-pink-500/20", time: "Il y a 2 jours" },
  { id: 8, type: "social", title: "Message reçu", description: "Omar t'a envoyé un message", icon: MessageCircle, color: "text-gen-z-coral", bgColor: "bg-gen-z-coral/20", time: "Il y a 2 jours" },
  { id: 9, type: "xp", title: "Mission complétée", description: "Explorer 3 passions - +200 XP", icon: TrendingUp, color: "text-gen-z-lavender", bgColor: "bg-gen-z-lavender/20", time: "Il y a 3 jours" },
  { id: 10, type: "achievement", title: "Achievement débloqué", description: "En Feu - 3 jours de streak", icon: Trophy, color: "text-yellow-500", bgColor: "bg-yellow-500/20", time: "Il y a 3 jours" },
]

const FILTERS = [
  { id: "all", label: "Tout", icon: Activity },
  { id: "xp", label: "XP", icon: Zap },
  { id: "achievement", label: "Achievements", icon: Trophy },
  { id: "social", label: "Social", icon: Users },
  { id: "event", label: "Events", icon: Calendar },
]

export default function ActivityPage() {
  const [filter, setFilter] = useState("all")

  const filteredActivities = filter === "all" 
    ? ACTIVITIES 
    : ACTIVITIES.filter(a => a.type === filter)

  // Stats
  const todayXP = 375
  const weekXP = 1250
  const activitiesCount = ACTIVITIES.length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-mint to-emerald-500 flex items-center justify-center">
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
            className="p-4 rounded-2xl bg-gradient-to-br from-gen-z-lavender/10 to-gen-z-sky/5 border border-gen-z-lavender/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-gen-z-lavender" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Aujourd'hui</span>
            </div>
            <p className="text-2xl font-black text-gen-z-lavender">+{todayXP} XP</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-gen-z-mint/10 to-emerald-500/5 border border-gen-z-mint/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-gen-z-mint" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Cette semaine</span>
            </div>
            <p className="text-2xl font-black text-gen-z-mint">+{weekXP} XP</p>
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
        {filteredActivities.map((activity, idx) => {
          const Icon = activity.icon
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", activity.bgColor)}>
                <Icon className={cn("w-6 h-6", activity.color)} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{activity.title}</h4>
                <p className="text-sm text-zinc-400 truncate">{activity.description}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-zinc-500">{activity.time}</span>
              </div>
            </motion.div>
          )
        })}

        {filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune activité</h3>
            <p className="text-zinc-500">Rien à afficher pour ce filtre</p>
          </div>
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
