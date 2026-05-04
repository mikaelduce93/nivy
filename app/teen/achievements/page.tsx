"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Lock, Check, Star, Zap, Target, Crown, Flame, Users, Calendar, BookOpen, Dumbbell, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

// Static achievement data
const ACHIEVEMENTS = [
  // Unlocked
  { id: "first-login", name: "Bienvenue!", description: "Première connexion", icon: "🎉", unlocked: true, rarity: "common", xp: 50, unlockedAt: "2024-01-15" },
  { id: "first-quest", name: "Aventurier", description: "Compléter ta première quête", icon: "⚔️", unlocked: true, rarity: "common", xp: 100, unlockedAt: "2024-01-16" },
  { id: "streak-3", name: "En Feu", description: "3 jours de streak", icon: "🔥", unlocked: true, rarity: "rare", xp: 150, unlockedAt: "2024-01-18" },
  { id: "first-friend", name: "Social", description: "Ajouter ton premier ami", icon: "🤝", unlocked: true, rarity: "common", xp: 75, unlockedAt: "2024-01-17" },
  { id: "brain-master", name: "Cerveau", description: "Réussir 5 quiz", icon: "🧠", unlocked: true, rarity: "rare", xp: 200, unlockedAt: "2024-01-20" },
  // Locked
  { id: "streak-7", name: "Flamme Éternelle", description: "7 jours de streak", icon: "🔥", unlocked: false, rarity: "epic", xp: 300, progress: 42 },
  { id: "streak-30", name: "Légende", description: "30 jours de streak", icon: "👑", unlocked: false, rarity: "legendary", xp: 1000, progress: 10 },
  { id: "event-5", name: "Party Animal", description: "Participer à 5 events", icon: "🎉", unlocked: false, rarity: "epic", xp: 400, progress: 60 },
  { id: "social-10", name: "Social Butterfly", description: "10 amis ajoutés", icon: "🦋", unlocked: false, rarity: "rare", xp: 250, progress: 30 },
  { id: "crew-leader", name: "Leader", description: "Créer une crew", icon: "🛡️", unlocked: false, rarity: "epic", xp: 350, progress: 0 },
  { id: "quiz-master", name: "Quiz Master", description: "100% sur 10 quiz", icon: "🎓", unlocked: false, rarity: "legendary", xp: 750, progress: 20 },
  { id: "fit-warrior", name: "Warrior", description: "50 défis physiques", icon: "💪", unlocked: false, rarity: "legendary", xp: 800, progress: 12 },
]

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Trophy },
  { id: "social", label: "Social", icon: Users },
  { id: "quests", label: "Quêtes", icon: Target },
  { id: "streak", label: "Streak", icon: Flame },
  { id: "events", label: "Events", icon: Calendar },
]

const rarityConfig = {
  common: { label: "Common", color: "from-zinc-500 to-zinc-600", border: "border-zinc-500/30", bg: "bg-zinc-500/10" },
  rare: { label: "Rare", color: "from-blue-500 to-cyan-500", border: "border-blue-500/30", bg: "bg-blue-500/10" },
  epic: { label: "Épique", color: "from-purple-500 to-pink-500", border: "border-purple-500/30", bg: "bg-purple-500/10" },
  legendary: { label: "Légendaire", color: "from-yellow-500 to-amber-500", border: "border-yellow-500/30", bg: "bg-yellow-500/10" },
}

export default function AchievementsPage() {
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all")
  const [category, setCategory] = useState("all")

  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length
  const totalCount = ACHIEVEMENTS.length
  const totalXpEarned = ACHIEVEMENTS.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0)

  const filteredAchievements = ACHIEVEMENTS.filter(a => {
    if (filter === "unlocked" && !a.unlocked) return false
    if (filter === "locked" && a.unlocked) return false
    return true
  })

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Achievements</h1>
                <p className="text-zinc-500 text-sm font-medium">Tes trophées et badges</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Check className="w-4 h-4 text-gen-z-mint" />
              <span className="font-black text-xl">{unlockedCount}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Débloqués</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-zinc-500" />
              <span className="font-black text-xl">{totalCount - unlockedCount}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Verrouillés</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gen-z-lavender" />
              <span className="font-black text-xl">{totalXpEarned.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">XP Gagnés</p>
          </div>
        </div>

        {/* Progress */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Progression</h3>
            <span className="text-sm text-yellow-500 font-bold">{Math.round((unlockedCount / totalCount) * 100)}%</span>
          </div>
          <Progress value={(unlockedCount / totalCount) * 100} className="h-3" />
          <p className="text-sm text-zinc-500 mt-2">{unlockedCount} sur {totalCount} achievements débloqués</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {[
            { id: "all", label: "Tous" },
            { id: "unlocked", label: "Débloqués" },
            { id: "locked", label: "Verrouillés" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                filter === f.id
                  ? "bg-white text-black"
                  : "bg-zinc-900/50 text-zinc-400 hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((achievement, idx) => {
          const rarity = rarityConfig[achievement.rarity as keyof typeof rarityConfig]
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className={cn(
                "relative p-6 rounded-3xl border transition-all cursor-pointer",
                achievement.unlocked
                  ? `${rarity.bg} ${rarity.border}`
                  : "bg-zinc-900/50 border-white/5"
              )}
            >
              {/* Lock overlay */}
              {!achievement.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl backdrop-blur-sm z-10">
                  <Lock className="w-8 h-8 text-zinc-500" />
                </div>
              )}

              {/* Rarity badge */}
              <div className={cn(
                "absolute top-4 right-4 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                achievement.unlocked ? rarity.bg : "bg-zinc-800",
                achievement.unlocked ? "text-white" : "text-zinc-500"
              )}>
                {rarity.label}
              </div>

              {/* Icon */}
              <div className="text-5xl mb-4">{achievement.icon}</div>

              {/* Content */}
              <h4 className="font-black text-lg text-white mb-1">{achievement.name}</h4>
              <p className="text-sm text-zinc-400 mb-4">{achievement.description}</p>

              {/* XP Reward */}
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gen-z-lavender" />
                <span className="font-bold text-gen-z-lavender">+{achievement.xp} XP</span>
              </div>

              {/* Progress for locked */}
              {!achievement.unlocked && achievement.progress !== undefined && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">Progression</span>
                    <span className="text-xs text-zinc-400 font-bold">{achievement.progress}%</span>
                  </div>
                  <Progress value={achievement.progress} className="h-2" />
                </div>
              )}

              {/* Unlocked date */}
              {achievement.unlocked && achievement.unlockedAt && (
                <p className="text-xs text-zinc-500 mt-4">
                  Débloqué le {new Date(achievement.unlockedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
