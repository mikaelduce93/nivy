"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Dumbbell, Palette, Zap, Swords, Sparkles, ArrowRight, Trophy, Flame, Target, Clock, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { HubTabs, useHubTab, type HubTab } from "@/components/teen/hub-tabs"
import { DefiCard, type DefiCardProps } from "@/components/teen/defi-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UnifiedQuest } from "@/lib/server/unified-quest-engine"

// Map UnifiedQuest.status → DefiCard.status. UnifiedQuest has no "expired"
// or "locked" terminal states, so we only ever produce active/completed.
function mapQuestStatus(s: UnifiedQuest["status"]): DefiCardProps["status"] {
  if (s === "completed") return "completed"
  return "active"
}

// Pick a DefiCard.type cadence from the current hub tab. Daily tab maps
// directly; the other pillar tabs default to "weekly" since UnifiedQuest
// itself does not carry a daily/weekly/monthly/seasonal cadence field.
function pickDefiType(tab: string): DefiCardProps["type"] {
  return tab === "daily" ? "daily" : "weekly"
}
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { EmptyState as SharedEmptyState } from "@/components/ui/states/empty-state"
import { TwinCurrencyGauge } from "@/components/teen/twin-currency-gauge"

interface QuestsHubClientProps {
  quests: UnifiedQuest[]
  dailyChallenges: any[]
  xpData: { total_xp: number; level: number }
  coinsBalance?: number
  teenId: string
}

const QUEST_TABS: HubTab[] = [
  { id: "daily", label: "Daily", icon: Zap },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "body", label: "Body", icon: Dumbbell },
  { id: "creative", label: "Creative", icon: Palette },
  // TICKET-020 — friend-défis tab. Selecting this tab navigates to the
  // dedicated /teen/quests/friend-defis route (see effect below). The tab
  // sits beside the four pillar tabs so it stays discoverable while the
  // detailed list / accept-decline UI lives on its own page.
  { id: "friends", label: "Défis amis", icon: Users },
]

const PILLAR_CONFIG = {
  daily: {
    title: "Daily Quests",
    subtitle: "Complete these for bonus XP",
    gradient: "from-gen-z-yellow via-accent-soft to-brand-soft",
    bgGlow: "bg-gen-z-yellow/20",
  },
  brain: {
    title: "Brain Challenges",
    subtitle: "Quizzes, puzzles & academic quests",
    gradient: "from-brand-soft via-info-soft to-success-soft",
    bgGlow: "bg-brand-soft/20",
  },
  body: {
    title: "Body Challenges",
    subtitle: "Physical activities & sports",
    gradient: "from-accent-soft via-orange-500 to-red-500",
    bgGlow: "bg-accent-soft/20",
  },
  creative: {
    title: "Creative Quests",
    subtitle: "Art, music, passion projects",
    gradient: "from-success-soft via-info-soft to-brand-soft",
    bgGlow: "bg-success-soft/20",
  },
}

export function QuestsHubClient({ quests, dailyChallenges, xpData, coinsBalance = 0, teenId }: QuestsHubClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get("tab") || "daily"

  // TICKET-020 — when the "friends" tab becomes active on this hub,
  // redirect to the dedicated friend-défis page. We keep the tab visible
  // here (it stays selected on the friend-défis page since HubTabs reads
  // the same `?tab=friends` query string) so users can still toggle back.
  useEffect(() => {
    if (currentTab === "friends") {
      router.push("/teen/quests/friend-defis?tab=friends")
    }
  }, [currentTab, router])

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
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-soft/10 border border-brand-soft/20">
              <Zap className="w-4 h-4 text-brand-soft" />
              <span className="font-bold text-sm">{totalXpAvailable} XP</span>
            </div>
          </div>
        </div>

        {/*
          Twin-currency gauge (compact) — keeps both currencies visible while
          the teen browses quests so XP/coin distinction stays cognitively clear
          (whitepaper §5).
        */}
        <TwinCurrencyGauge
          xp={xpData.total_xp || 0}
          level={xpData.level || 1}
          coins={coinsBalance}
          variant="compact"
        />

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
                  <DefiCard
                    type={pickDefiType(currentTab)}
                    title={quest.title}
                    description={quest.description}
                    xpReward={quest.xp_reward}
                    status={mapQuestStatus(quest.status)}
                    href={`/teen/quests/${quest.id}`}
                    ctaHref={`/teen/quests/${quest.id}`}
                    ctaLabel={quest.status === "completed" ? "DONE" : quest.status === "in_progress" ? "CONTINUE" : "START"}
                    imageUrl={quest.image_url}
                    // TICKET-024 — morph anchor for View Transitions API.
                    // Pairs with the hero on /teen/quests/[id].
                    morphId={`vt-quest-${quest.id}`}
                  />
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
    lavender: "from-brand-soft/20 to-brand-soft/5 border-brand-soft/30 hover:border-brand-soft/50",
    coral: "from-accent-soft/20 to-accent-soft/5 border-accent-soft/30 hover:border-accent-soft/50",
    mint: "from-success-soft/20 to-success-soft/5 border-success-soft/30 hover:border-success-soft/50",
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
