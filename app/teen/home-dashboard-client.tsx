"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { 
  Cake, Users, Swords, ShoppingBag, Map, Sparkles, Zap, ArrowRight, 
  Calendar, Clock, Trophy, Flame, ChevronRight
} from "lucide-react"
import { TeenIDCard } from "@/components/teen/teen-id-card"
import { Button } from "@/components/ui/button"
import { Niv } from "@/components/brand/niv"
import { cn } from "@/lib/utils"
import type { UnifiedQuest } from "@/lib/server/unified-quest-engine"

interface HomeDashboardClientProps {
  data: {
    teen: any
    xp: { total: number; level: number; progressPercent: number }
    streak: number
    quests: UnifiedQuest[]
    upcomingEvents: any[]
    dailyMissions: any[]
  }
}

// Quick Actions configuration - links to new hubs
const QUICK_ACTIONS = [
  { href: "/anniversaires/organiser", icon: Cake, label: "B-Day", color: "bg-pink" },
  { href: "/teen/quests", icon: Swords, label: "Quests", color: "bg-teal text-paper" },
  { href: "/teen/social", icon: Users, label: "Social", color: "bg-coral" },
  { href: "/teen/wallet", icon: ShoppingBag, label: "Shop", color: "bg-gold" },
  { href: "/teen/social?tab=map", icon: Map, label: "Radar", color: "bg-lime" },
]

export function HomeDashboardClient({ data }: HomeDashboardClientProps) {
  const { teen, xp, streak, quests, upcomingEvents, dailyMissions } = data

  return (
    <div className="space-y-12 pt-8 pb-8">
      {/* 1. HERO - Compact Welcome */}
      <section className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row gap-8 items-center lg:items-start"
        >
          {/* Welcome Text */}
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
              Hey, <span className="text-pink italic">{teen.full_name?.split(" ")[0] || "Friend"}</span>
            </h1>
            <p className="text-ink-2 text-lg max-w-md mx-auto lg:mx-0">
              Ready to level up today? You have {quests.length} quests waiting.
            </p>

            {/* Quick Stats Row */}
            <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-ink bg-info-soft">
                <Zap className="w-4 h-4 text-teal" />
                <span className="font-bold text-ink">Lvl {xp.level}</span>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-ink bg-pink/12">
                  <Flame className="w-4 h-4 text-pink" />
                  <span className="font-bold text-ink">{streak} days</span>
                </div>
              )}
            </div>
          </div>

          {/* ID Card */}
          <div className="shrink-0">
            <TeenIDCard 
              user={{
                fullName: teen.full_name || "Teen",
                pseudo: teen.pseudo || "coolteen",
                avatarUrl: teen.avatar_url,
                level: xp.level,
                role: "teen"
              }}
              xpData={{
                total: xp.total,
                progressPercent: xp.progressPercent,
              }}
            />
          </div>
        </motion.div>
      </section>

      {/* 2. QUICK ACTIONS - Horizontal Scroll */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="eyebrow text-sm">Quick Actions</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={action.href}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex flex-col items-center gap-3 p-5 rounded-2xl min-w-[100px]",
                    "border-2 border-ink cursor-pointer text-ink",
                    action.color
                  )}
                >
                  <action.icon className="w-8 h-8" />
                  <span className="text-xs font-bold uppercase tracking-wider">{action.label}</span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. TODAY'S QUESTS - Featured 2 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="eyebrow text-sm">Today's Quests</h2>
          <Link href="/teen/quests" className="flex items-center gap-1 text-sm text-brand-soft font-bold hover:underline">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quests.slice(0, 2).map((quest, idx) => (
            <QuestPreviewCard key={quest.id} quest={quest} index={idx} />
          ))}
          
          {quests.length === 0 && (
            <div className="col-span-2 p-8 rounded-2xl bg-card border-2 border-ink shadow-stkr-md text-center flex flex-col items-center">
              <Niv size={88} mood="calm" />
              <p className="text-mute mt-3">No quests available. Check back later!</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. UPCOMING EVENTS */}
      {upcomingEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="eyebrow text-sm">Upcoming Events</h2>
            <Link href="/agenda" className="flex items-center gap-1 text-sm text-success-soft font-bold hover:underline">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {upcomingEvents.slice(0, 3).map((event, idx) => (
              <EventCard key={event.id} event={event} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* 5. EXPLORE MORE CTA */}
      <section className="pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-8 border-2 border-ink bg-card shadow-stkr-md"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-ink">Explore More</h3>
              <p className="text-mute mt-1">Discover quests, shop rewards, and connect with friends</p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/teen/wallet">
                  <Trophy className="w-4 h-4 mr-2" />
                  Rewards
                </Link>
              </Button>
              <Button asChild variant="pink">
                <Link href="/teen/quests">
                  Start Quest
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

function QuestPreviewCard({ quest, index }: { quest: UnifiedQuest; index: number }) {
  const pillarColors = {
    intellect: "bg-brand-soft",
    vitality: "bg-accent-soft",
    creativity: "bg-success-soft",
    social: "bg-info-soft",
  }

  const pillarIcons = {
    intellect: Sparkles,
    vitality: Flame,
    creativity: Cake,
    social: Users,
  }

  const Icon = pillarIcons[quest.pillar as keyof typeof pillarIcons] || Sparkles
  const colors = pillarColors[quest.pillar as keyof typeof pillarColors] || pillarColors.intellect

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/teen/quests?tab=${quest.pillar === "intellect" ? "brain" : quest.pillar === "vitality" ? "body" : "creative"}`}>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className={cn(
            "p-6 rounded-2xl border-2 border-ink shadow-stkr-md transition-all cursor-pointer",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr",
            colors
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl border border-ink bg-ink/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-ink" />
              </div>
              <div>
                <h4 className="font-bold text-ink">{quest.title}</h4>
                <p className="text-sm text-mute mt-1 line-clamp-1">{quest.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-ink bg-card">
              <Zap className="w-3 h-3 text-gold" />
              <span className="font-bold text-sm text-ink">{quest.xp_reward}</span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

function EventCard({ event, index }: { event: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/agenda/${event.id}`}>
        <motion.div
          whileHover={{ scale: 1.01, x: 4 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-card border-2 border-ink transition-all cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
        >
          <div className="w-14 h-14 rounded-2xl border border-ink bg-info-soft flex items-center justify-center">
            <Calendar className="w-6 h-6 text-teal" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-ink">{event.title}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-mute">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
              {event.city && <span>{event.city}</span>}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-mute" />
        </motion.div>
      </Link>
    </motion.div>
  )
}
