"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Brain, 
  Dumbbell, 
  Palette, 
  Users, 
  Zap, 
  ArrowRight, 
  Clock, 
  Play,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { type UnifiedQuest } from "@/lib/server/unified-quest-engine"
import { useState } from "react"

interface QuestCardProps {
  quest: UnifiedQuest
  onStart?: (questId: string) => Promise<void>
}

const PILLAR_CONFIG = {
  intellect: {
    icon: Brain,
    color: "var(--info-soft)",
    bg: "bg-info-soft/10",
    label: "INTELLECT",
    border: "border-info-soft/20"
  },
  vitality: {
    icon: Dumbbell,
    color: "var(--gen-z-lime)",
    bg: "bg-gen-z-lime/10",
    label: "VITALITY",
    border: "border-gen-z-lime/20"
  },
  creativity: {
    icon: Palette,
    color: "var(--brand-soft)",
    bg: "bg-brand-soft/10",
    label: "CREATIVITY",
    border: "border-brand-soft/20"
  },
  social: {
    icon: Users,
    color: "var(--accent-soft)",
    bg: "bg-accent-soft/10",
    label: "SOCIAL",
    border: "border-accent-soft/20"
  }
}

export function QuestCard({ quest, onStart }: QuestCardProps) {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const config = PILLAR_CONFIG[quest.pillar]
  const Icon = config.icon

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isStarting) return
    
    setIsStarting(true)
    try {
      if (onStart) {
        await onStart(quest.id)
      }
      // Navigate to quest detail page
      router.push(`/teen/quests/${quest.id}`)
    } catch (error) {
      console.error('Failed to start quest:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handleCardClick = () => {
    router.push(`/teen/quests/${quest.id}`)
  }

  const isCompleted = quest.status === 'completed'
  const isInProgress = quest.status === 'in_progress'

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative group overflow-hidden rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-xl border p-1 transition-all duration-500",
        config.border
      )}
    >
      {/* Background Glow */}
      <div 
        className="absolute -inset-20 opacity-0 group-hover:opacity-20 blur-[100px] transition-opacity duration-1000 pointer-events-none" 
        style={{ backgroundColor: config.color }}
      />

      <div className="relative z-10 h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-zinc-950/40 rounded-[1.8rem] sm:rounded-[2rem] md:rounded-[2.3rem]">
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className={cn("px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black tracking-[0.15em] sm:tracking-[0.2em] border", config.bg, config.border)} style={{ color: config.color }}>
              {config.label}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-gen-z-yellow fill-current" />
              <span className="font-black text-white text-xs sm:text-sm md:text-base">+{quest.xp_reward} XP</span>
            </div>
          </div>

          {/* Title & Icon */}
          <div className="flex gap-3 sm:gap-4 md:gap-6">
            <div className={cn("w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-2xl", config.bg)}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" style={{ color: config.color }} />
            </div>
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <h3 className="text-base sm:text-lg md:text-2xl font-black text-white tracking-tight leading-tight sm:leading-none group-hover:text-brand-soft transition-colors line-clamp-2">
                {quest.title}
              </h3>
              <p className="text-zinc-500 text-xs sm:text-sm font-medium line-clamp-2">
                {quest.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 sm:mt-6 md:mt-8 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 sm:gap-4">
            {isCompleted ? (
              <div className="flex items-center gap-1.5 sm:gap-2 text-success-soft font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">COMPLETED</span><span className="sm:hidden">DONE</span>
              </div>
            ) : isInProgress ? (
              <div className="flex items-center gap-1.5 sm:gap-2 text-brand-soft font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                <Play className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">IN PROGRESS</span><span className="sm:hidden">ACTIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> AVAILABLE
              </div>
            )}
          </div>

          <Button 
            onClick={handleStart}
            disabled={isCompleted || isStarting}
            className={cn(
              "rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-6 h-9 sm:h-10 md:h-12 font-black text-xs sm:text-sm transition-all group/btn",
              isCompleted 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : isInProgress
                  ? "bg-brand-soft text-black hover:scale-105"
                  : "bg-white text-black hover:scale-105"
            )}
          >
            {isStarting ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            ) : isCompleted ? (
              "DONE"
            ) : isInProgress ? (
              <>
                <span className="hidden sm:inline">CONTINUE</span>
                <span className="sm:hidden">GO</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </>
            ) : (
              <>
                START
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
