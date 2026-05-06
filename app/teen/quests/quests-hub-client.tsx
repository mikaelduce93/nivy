"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Dumbbell, Palette, Zap, Swords, Sparkles, ArrowRight, Trophy, Flame, Target, Clock } from "lucide-react"
import { HubTabs, useHubTab, type HubTab } from "@/components/teen/hub-tabs"
import { QuestCard } from "@/components/teen/dashboard/quest-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UnifiedQuest } from "@/lib/server/unified-quest-engine"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { EmptyState as SharedEmptyState } from "@/components/ui/states/empty-state"

interface QuestsHubClientProps {
  quests: UnifiedQuest[]
  dailyChallenges: any[]
  xpData: { total_xp: number; level: number }
  teenId: string
}

const QUEST_TABS: HubTab[] = [
  { id: "daily", label: "Daily", icon: Zap },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "body", label: "Body", icon: Dumbbell },
  { id: "creative", label: "Creative", icon: Palette },
]

const PILLAR_CONFIG = {
  daily: {
    title: "Daily Quests",
    subtitle: "Complete these for bonus XP",
    gradient: "from-gen-z-yellow via-gen-z-coral to-gen-z-lavender",
    bgGlow: "bg-gen-z-yellow/20",
  },
  brain: {
    title: "Brain Challenges",
    subtitle: "Quizzes, puzzles & academic quests",
    gradient: "from-gen-z-lavender via-gen-z-sky to-gen-z-mint",
    bgGlow: "bg-gen-z-lavender/20",
  },
  body: {
    title: "Body Challenges",
    subtitle: "Physical activities & sports",
    gradient: "from-gen-z-coral via-orange-500 to-red-500",
    bgGlow: "bg-gen-z-coral/20",
  },
  creative: {
    title: "Creative Quests",
    subtitle: "Art, music, passion projects",
    gradient: "from-gen-z-mint via-gen-z-sky to-gen-z-lavender",
    bgGlow: "bg-gen-z-mint/20",
  },
}

export function QuestsHubClient({ quests, dailyChallenges, xpData, teenId }: QuestsHubClientProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "daily"

  // Filter quests by pillar/type
  const filteredQuests = useMemo(() => {
    switch (currentTab) {
      case "daily":
        // Return daily challenges or first few quests
        return dailyChallenges.length > 0
          ? dailyChallenges.map((c: any): UnifiedQuest => ({
              id: c.id,
              type: "challenge" as const,
              title: c.challenge?.title || "Daily Challenge",
              description: c.challenge?.description || "",
              xp_reward: c.challenge?.xp_reward || 50,
              pillar: "vitality" as const,
              status: c.status,
            }))
          : quests.slice(0, 6)
      case "brain":
        return quests.filter(q => q.pillar === "intellect" || q.type === "quiz")
      case "body":
        return quests.filter(q => q.pillar === "vitality" || q.type === "challenge")
      case "creative":
        return quests.filter(q => q.pillar === "creativity" || q.type === "passion")
      default:
        return quests
    }
  }, [currentTab, quests, dailyChallenges])

  const config = PILLAR_CONFIG[currentTab as keyof typeof PILLAR_CONFIG] || PILLAR_CONFIG.daily

  // Stats for current pillar
  const completedCount = filteredQuests.filter(q => q.status === "completed").length
  const totalXpAvailable = filteredQuests.reduce((sum, q) => sum + (q.xp_reward || 0), 0)

  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br", config.gradient
              )}>
                <Swords className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Quests</h1>
                <p className="text-zinc-500 text-sm font-medium">Level up your life</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-sm">{completedCount} Done</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gen-z-lavender/10 border border-gen-z-lavender/20">
              <Zap className="w-4 h-4 text-gen-z-lavender" />
              <span className="font-bold text-sm">{totalXpAvailable} XP</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <HubTabs tabs={QUEST_TABS} defaultTab="daily" />
      </header>

      {/* Pillar Header */}
      <motion.div
        key={currentTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 border border-white/10"
      >
        {/* Background Glow */}
        <div className={cn("absolute inset-0 opacity-30", config.bgGlow)} />
        <div className={cn("absolute inset-0 bg-gradient-to-r opacity-10", config.gradient)} />
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{config.title}</h2>
            <p className="text-zinc-400 mt-1">{config.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-3xl font-black">{filteredQuests.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Available</p>
            </div>
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br", config.gradient
            )}>
              <Target className="w-8 h-8 text-black" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quest Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {filteredQuests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredQuests.map((quest, idx) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <QuestCard quest={quest} />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState tab={currentTab} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/5">
        <QuickActionCard
          icon={Brain}
          title="Generate AI Quiz"
          description="Create a personalized quiz based on your interests"
          href="/teen/quests?tab=brain"
          color="lavender"
        />
        <QuickActionCard
          icon={Trophy}
          title="Challenge a Friend"
          description="Start a competitive quest with your crew"
          href="/teen/social?tab=crew"
          color="coral"
        />
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: string }) {
  // Per-tab messaging on top of the shared `quests` preset.
  const messages: Record<string, { title: string; desc: string }> = {
    daily: {
      title: "Aucune quête quotidienne",
      desc: "Reviens demain pour de nouvelles quêtes ! Le compteur reset à minuit.",
    },
    brain: {
      title: "Aucun challenge cerveau",
      desc: "L'IA prépare de nouveaux quiz pour toi…",
    },
    body: {
      title: "Aucun challenge physique",
      desc: "De nouveaux défis sportifs arrivent bientôt.",
    },
    creative: {
      title: "Aucune quête créative",
      desc: "Exprime-toi via tes projets passion !",
    },
  }

  const msg = messages[tab] || messages.daily

  return (
    <SharedEmptyState
      preset="quests"
      size="default"
      title={msg.title}
      description={msg.desc}
    />
  )
}

function QuickActionCard({ 
  icon: Icon, 
  title, 
  description, 
  href, 
  color 
}: { 
  icon: any
  title: string
  description: string
  href: string
  color: "lavender" | "coral" | "mint" | "yellow"
}) {
  const colorClasses = {
    lavender: "from-gen-z-lavender/20 to-gen-z-lavender/5 border-gen-z-lavender/30 hover:border-gen-z-lavender/50",
    coral: "from-gen-z-coral/20 to-gen-z-coral/5 border-gen-z-coral/30 hover:border-gen-z-coral/50",
    mint: "from-gen-z-mint/20 to-gen-z-mint/5 border-gen-z-mint/30 hover:border-gen-z-mint/50",
    yellow: "from-gen-z-yellow/20 to-gen-z-yellow/5 border-gen-z-yellow/30 hover:border-gen-z-yellow/50",
  }

  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 border transition-all cursor-pointer",
          "bg-gradient-to-br",
          colorClasses[color]
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-white">{title}</h4>
              <p className="text-sm text-zinc-400">{description}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-500" />
        </div>
      </motion.div>
    </Link>
  )
}
