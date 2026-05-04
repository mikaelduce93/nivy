"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap,
  Dumbbell,
  Palette,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Sparkles,
  ChevronRight,
  Info,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface PillarScores {
  school_score: number
  sport_score: number
  crea_score: number
  balance_multiplier: number
  last_balance_check: string | null
  average_score: number
}

export interface PillarConfig {
  id: "school" | "sport" | "crea"
  name: string
  nameAr?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  gradientFrom: string
  gradientTo: string
  bgColor: string
  description: string
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const PILLAR_CONFIGS: PillarConfig[] = [
  {
    id: "school",
    name: "Ecole",
    nameAr: "المدرسة",
    icon: GraduationCap,
    color: "text-blue-400",
    gradientFrom: "from-blue-500",
    gradientTo: "to-indigo-600",
    bgColor: "bg-blue-500/10",
    description: "Notes, Quiz, Tutoriels educatifs",
  },
  {
    id: "sport",
    name: "Sport",
    nameAr: "الرياضة",
    icon: Dumbbell,
    color: "text-green-400",
    gradientFrom: "from-green-500",
    gradientTo: "to-emerald-600",
    bgColor: "bg-green-500/10",
    description: "Presence clubs, Defis physiques, Records",
  },
  {
    id: "crea",
    name: "Creativite",
    nameAr: "الإبداع",
    icon: Palette,
    color: "text-purple-400",
    gradientFrom: "from-purple-500",
    gradientTo: "to-pink-600",
    bgColor: "bg-purple-500/10",
    description: "Tutoriels passion, Creations, Likes",
  },
]

export const BALANCE_TIERS = {
  none: { min: 0, xpBonus: 0, multiplier: 1.0, color: "text-zinc-400", label: "Non equilibre" },
  silver: { min: 50, xpBonus: 500, multiplier: 1.1, color: "text-zinc-300", label: "Equilibre" },
  gold: { min: 70, xpBonus: 1000, multiplier: 1.25, color: "text-yellow-400", label: "Bien equilibre" },
  legendary: { min: 85, xpBonus: 2000, multiplier: 1.5, color: "text-purple-400", label: "Parfaitement equilibre" },
}

/* ==========================================================================
   PILLAR SCORE CARD - Carte individuelle pour un pilier
   ========================================================================== */

interface PillarScoreCardProps {
  pillar: PillarConfig
  score: number
  previousScore?: number
  className?: string
  onClick?: () => void
  showDetails?: boolean
}

import { EnergyOrb } from "@/components/ui/energy-orb"

export function PillarScoreCard({
  pillar,
  score,
  previousScore,
  className,
  onClick,
  showDetails = false,
}: PillarScoreCardProps) {
// ... existing code ...
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-[2.5rem]",
        onClick && "cursor-pointer",
        className
      )}
      whileHover={onClick ? { scale: 1.02, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
    >
      <Card variant="glass" className="p-6 h-full border-white/5">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl",
                `bg-gradient-to-br ${pillar.gradientFrom} ${pillar.gradientTo}`
              )}
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <Icon className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h3 className="font-black text-xl text-white tracking-tight">{pillar.name}</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{pillar.id}</p>
            </div>
          </div>

          {/* Trend indicator */}
          {previousScore !== undefined && trend !== 0 && (
            <motion.div
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black tracking-tighter shadow-lg",
                trend > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{trend > 0 ? "+" : ""}{trend}</span>
            </motion.div>
          )}
        </div>

        {/* Score Energy Orb */}
        <div className="flex items-center justify-center mb-8">
          <EnergyOrb 
            value={score} 
            max={100} 
            size={160} 
            color={pillar.color.replace('text-', 'var(--') + ')'}
          >
            <div className="flex flex-col items-center">
              <motion.span
                className={cn("text-4xl font-black", pillar.color)}
                key={displayScore}
              >
                {displayScore}
              </motion.span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">SCORE</span>
            </div>
          </EnergyOrb>
        </div>

        {/* Score level label */}
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className={cn("text-xs font-black uppercase tracking-widest", scoreLevel.color)}>
              {scoreLevel.label}
            </span>
          </div>
          
          <p className="text-sm text-zinc-400 font-medium px-4 line-clamp-2">
            {pillar.description}
          </p>
        </div>

        {/* Details link */}
        {showDetails && onClick && (
          <motion.div
            className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 group"
            whileHover={{ color: "#fff" }}
          >
            <span>Analytics</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   PILLAR BALANCE WIDGET - Vue d'ensemble de l'equilibre
   ========================================================================== */

interface PillarBalanceWidgetProps {
  scores: PillarScores
  className?: string
}

export function PillarBalanceWidget({ scores, className }: PillarBalanceWidgetProps) {
  const minScore = Math.min(scores.school_score, scores.sport_score, scores.crea_score)

  // Determiner le tier
  const getCurrentTier = () => {
    if (minScore >= BALANCE_TIERS.legendary.min) return BALANCE_TIERS.legendary
    if (minScore >= BALANCE_TIERS.gold.min) return BALANCE_TIERS.gold
    if (minScore >= BALANCE_TIERS.silver.min) return BALANCE_TIERS.silver
    return BALANCE_TIERS.none
  }

  const currentTier = getCurrentTier()
  const nextTier = minScore < 50 ? BALANCE_TIERS.silver :
                   minScore < 70 ? BALANCE_TIERS.gold :
                   minScore < 85 ? BALANCE_TIERS.legendary : null

  return (
    <Card className={cn(
      "p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Equilibre des Piliers</h3>
          <p className="text-sm text-zinc-500">Maintiens tes 3 piliers equilibres pour des bonus XP !</p>
        </div>
        <motion.div
          className={cn(
            "px-3 py-1.5 rounded-full font-medium text-sm",
            currentTier === BALANCE_TIERS.legendary ? "bg-purple-500/20" :
            currentTier === BALANCE_TIERS.gold ? "bg-yellow-500/20" :
            currentTier === BALANCE_TIERS.silver ? "bg-zinc-500/20" :
            "bg-zinc-800"
          )}
          animate={currentTier !== BALANCE_TIERS.none ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className={currentTier.color}>{currentTier.label}</span>
        </motion.div>
      </div>

      {/* Pillar bars */}
      <div className="space-y-4 mb-6">
        {PILLAR_CONFIGS.map((pillar) => {
          const score = pillar.id === "school" ? scores.school_score :
                        pillar.id === "sport" ? scores.sport_score :
                        scores.crea_score
          const Icon = pillar.icon

          return (
            <div key={pillar.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    pillar.bgColor
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", pillar.color)} />
                  </div>
                  <span className="text-sm text-zinc-300">{pillar.name}</span>
                </div>
                <span className={cn("text-sm font-bold", pillar.color)}>{score}</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    `bg-gradient-to-r ${pillar.gradientFrom} ${pillar.gradientTo}`
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>

              {/* Threshold markers */}
              <div className="relative h-1">
                {[50, 70, 85].map((threshold) => (
                  <div
                    key={threshold}
                    className={cn(
                      "absolute top-0 w-0.5 h-1 -mt-3",
                      score >= threshold ? pillar.color.replace("text-", "bg-") : "bg-zinc-700"
                    )}
                    style={{ left: `${threshold}%` }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Current bonus */}
      {currentTier !== BALANCE_TIERS.none && (
        <motion.div
          className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Bonus actif</p>
              <p className="text-xs text-zinc-400">
                Multiplicateur XP: x{currentTier.multiplier.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("font-bold", currentTier.color)}>+{currentTier.xpBonus}</p>
              <p className="text-xs text-zinc-500">XP/mois</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Next tier info */}
      {nextTier && (
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-zinc-300">Prochain palier</span>
          </div>
          <p className="text-xs text-zinc-500">
            Atteins {nextTier.min}/100 sur tous les piliers pour debloquer le bonus{" "}
            <span className={nextTier.color}>{nextTier.label}</span> (+{nextTier.xpBonus} XP/mois)
          </p>
        </div>
      )}
    </Card>
  )
}

/* ==========================================================================
   PILLAR MINI WIDGET - Version compacte pour header/sidebar
   ========================================================================== */

interface PillarMiniWidgetProps {
  scores: PillarScores
  className?: string
}

export function PillarMiniWidget({ scores, className }: PillarMiniWidgetProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {PILLAR_CONFIGS.map((pillar) => {
        const score = pillar.id === "school" ? scores.school_score :
                      pillar.id === "sport" ? scores.sport_score :
                      scores.crea_score
        const Icon = pillar.icon

        return (
          <motion.div
            key={pillar.id}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg",
              pillar.bgColor
            )}
            whileHover={{ scale: 1.05 }}
            title={`${pillar.name}: ${score}/100`}
          >
            <Icon className={cn("w-3.5 h-3.5", pillar.color)} />
            <span className={cn("text-xs font-bold", pillar.color)}>{score}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   PILLAR DASHBOARD - Dashboard complet des piliers
   ========================================================================== */

interface PillarDashboardProps {
  scores: PillarScores
  onPillarClick?: (pillarId: "school" | "sport" | "crea") => void
  className?: string
}

export function PillarDashboard({
  scores,
  onPillarClick,
  className,
}: PillarDashboardProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Mes Piliers</h2>
          <p className="text-zinc-500">Equilibre Ecole, Sport et Creativite pour progresser</p>
        </div>
        <PillarMiniWidget scores={scores} />
      </div>

      {/* Balance Widget */}
      <PillarBalanceWidget scores={scores} />

      {/* Individual Pillar Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {PILLAR_CONFIGS.map((pillar, index) => {
          const score = pillar.id === "school" ? scores.school_score :
                        pillar.id === "sport" ? scores.sport_score :
                        scores.crea_score

          return (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PillarScoreCard
                pillar={pillar}
                score={score}
                onClick={onPillarClick ? () => onPillarClick(pillar.id) : undefined}
                showDetails={!!onPillarClick}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Average Score */}
      <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">Score moyen</p>
              <p className="text-xs text-zinc-500">Moyenne de tes 3 piliers</p>
            </div>
          </div>
          <motion.div
            className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {scores.average_score}
          </motion.div>
        </div>
      </Card>

      {/* Tips */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white mb-1">Conseil</p>
            <p className="text-xs text-zinc-400">
              {scores.school_score < 50 ?
                "Ameliore ton score Ecole en completant des quiz et tutoriels educatifs !" :
                scores.sport_score < 50 ?
                "Ameliore ton score Sport en participant aux defis physiques et en allant au club !" :
                scores.crea_score < 50 ?
                "Ameliore ton score Creativite en suivant des parcours passion et en partageant tes creations !" :
                "Continue ainsi ! Tu es sur la bonne voie pour un equilibre parfait !"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   PILLAR SKELETON
   ========================================================================== */

export function PillarDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-1/3" />
      <div className="h-64 bg-zinc-800 rounded-2xl" />
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
