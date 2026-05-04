"use client"

/**
 * TEENS PARTY MOROCCO - Fortune Wheel Client Component
 * =====================================================
 * Composant client pour la roue de la fortune avec server actions
 */

import { useState, useCallback } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import {
  Zap,
  RotateCw,
  Flame,
  Crown,
  TrendingUp,
  Percent,
  Box,
  Gift,
  X,
  Clock,
  Sparkles,
} from "lucide-react"
import confetti from "canvas-confetti"
import { spinWheel, spinWheelBonus } from "@/gamification-system/features/wheel/actions"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface WheelSegment {
  id: string
  name: string
  color: string
  icon: string
  reward_type: string
  reward_value: Record<string, unknown>
  probability: number
  segment_index: number
}

interface CanSpin {
  can_spin_daily: boolean
  bonus_spins: number
  current_streak: number
  streak_multiplier: number
  next_spin_at: string | null
}

interface SpinResult {
  success: boolean
  error?: string
  segment_index?: number
  segment_name?: string
  segment_icon?: string
  reward_type?: string
  reward_value?: Record<string, unknown>
  xp_earned?: number
  coins_earned?: number
  current_streak?: number
  streak_multiplier?: number
}

interface FortuneWheelClientProps {
  segments: WheelSegment[]
  canSpin: CanSpin
  jackpotAmount: number
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  "trending-up": TrendingUp,
  percent: Percent,
  "rotate-cw": RotateCw,
  box: Box,
  crown: Crown,
  gift: Gift,
  x: X,
  sparkles: Sparkles,
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function FortuneWheelClient({
  segments,
  canSpin: initialCanSpin,
  jackpotAmount,
}: FortuneWheelClientProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [canSpin, setCanSpin] = useState(initialCanSpin)
  const wheelControls = useAnimation()

  const canSpinNow = canSpin.can_spin_daily || canSpin.bonus_spins > 0
  const streakBonus = Math.round(canSpin.current_streak * 5)

  const handleSpin = useCallback(async () => {
    if (isSpinning || !canSpinNow) return

    setIsSpinning(true)
    setResult(null)
    setShowResult(false)

    try {
      // Déterminer le type de spin et appeler l'action
      const spinType = canSpin.can_spin_daily ? "daily" : "bonus"
      const response = spinType === "daily"
        ? await spinWheel("daily")
        : await spinWheelBonus()

      if (response.error || !response.data?.success) {
        console.error("Spin error:", response.error)
        setIsSpinning(false)
        return
      }

      const spinResult = response.data as SpinResult

      // Calculer l'angle de rotation
      const segmentIndex = spinResult.segment_index ?? 0
      const segmentAngle = 360 / segments.length
      const targetSegmentAngle = segmentIndex * segmentAngle
      const extraRotations = (5 + Math.random() * 3) * 360
      const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.8)
      const targetAngle = extraRotations + (360 - targetSegmentAngle) + randomOffset

      // Animer la roue
      await wheelControls.start({
        rotate: currentRotation + targetAngle,
        transition: {
          duration: 5 + Math.random() * 2,
          ease: [0.2, 0.8, 0.3, 1],
        },
      })

      setCurrentRotation((prev) => prev + targetAngle)
      setResult(spinResult)
      setShowResult(true)

      // Mettre à jour l'état canSpin
      setCanSpin(prev => ({
        ...prev,
        can_spin_daily: spinType === "bonus" ? prev.can_spin_daily : false,
        bonus_spins: spinType === "bonus" ? prev.bonus_spins - 1 : prev.bonus_spins,
        current_streak: spinResult.current_streak || prev.current_streak,
        streak_multiplier: spinResult.streak_multiplier || prev.streak_multiplier,
      }))

      // Célébration selon le type de récompense
      const rewardType = spinResult.reward_type
      const xpEarned = spinResult.xp_earned || 0

      if (rewardType === "jackpot") {
        // Mega confetti pour jackpot
        const duration = 3000
        const end = Date.now() + duration
        const frame = () => {
          confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#FFD700", "#FFA500", "#FF6B6B"],
          })
          confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#FFD700", "#FFA500", "#FF6B6B"],
          })
          if (Date.now() < end) {
            requestAnimationFrame(frame)
          }
        }
        frame()
      } else if (xpEarned >= 250 || rewardType === "bonus_spin") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#06b6d4", "#22c55e", "#facc15"],
        })
      } else if (xpEarned >= 100) {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.7 },
        })
      }
    } catch (error) {
      console.error("Spin error:", error)
    } finally {
      setIsSpinning(false)
    }
  }, [isSpinning, canSpinNow, canSpin, segments.length, wheelControls, currentRotation])

  return (
    <div className="flex flex-col items-center">
      {/* Jackpot Display */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-yellow-400" />
          <div>
            <p className="text-sm text-yellow-400/80">Jackpot actuel</p>
            <p className="text-2xl font-black text-yellow-400">
              {jackpotAmount.toLocaleString()} XP
            </p>
          </div>
        </div>
      </motion.div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-white drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <motion.div
          animate={wheelControls}
          className="relative w-80 h-80 rounded-full overflow-hidden shadow-2xl"
          style={{
            background: "conic-gradient(from 0deg, " +
              segments.map((s, i) =>
                `${s.color} ${(i / segments.length) * 100}% ${((i + 1) / segments.length) * 100}%`
              ).join(", ") + ")",
          }}
        >
          {/* Segment Labels */}
          {segments.map((segment, index) => {
            const angle = (index / segments.length) * 360 + (180 / segments.length)
            const Icon = ICON_MAP[segment.icon] || Gift

            return (
              <div
                key={segment.id}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    transform: `translateY(-100px) rotate(${-angle}deg)`,
                  }}
                >
                  <Icon className="w-6 h-6 text-white drop-shadow-md" />
                  <span className="text-xs font-bold text-white drop-shadow-md mt-1 whitespace-nowrap">
                    {segment.name}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Center Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.button
              onClick={handleSpin}
              disabled={isSpinning || !canSpinNow}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${
                canSpinNow && !isSpinning
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 cursor-pointer"
                  : "bg-zinc-700 cursor-not-allowed"
              }`}
              whileHover={canSpinNow && !isSpinning ? { scale: 1.05 } : {}}
              whileTap={canSpinNow && !isSpinning ? { scale: 0.95 } : {}}
            >
              {isSpinning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RotateCw className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <span className="text-white font-black text-lg">
                  {canSpinNow ? "SPIN" : "WAIT"}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-xl -z-10" />
      </div>

      {/* Spin Info */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {/* Daily Spin Status */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
            canSpin.can_spin_daily
              ? "bg-green-500/20 text-green-400"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {canSpin.can_spin_daily ? (
            <>
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Spin quotidien disponible !</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                Prochain spin dans{" "}
                {canSpin.next_spin_at
                  ? formatTimeRemaining(canSpin.next_spin_at)
                  : "demain"}
              </span>
            </>
          )}
        </div>

        {/* Bonus Spins */}
        {canSpin.bonus_spins > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 text-pink-400 rounded-xl">
            <RotateCw className="w-5 h-5" />
            <span className="font-medium">{canSpin.bonus_spins} spin bonus</span>
          </div>
        )}

        {/* Streak */}
        {canSpin.current_streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-xl">
            <Flame className="w-5 h-5" />
            <span className="font-medium">
              {canSpin.current_streak}j streak (+{streakBonus}%)
            </span>
          </div>
        )}
      </div>

      {/* Result Modal */}
      <SpinResultModal
        isOpen={showResult}
        result={result}
        onClose={() => setShowResult(false)}
      />
    </div>
  )
}

/* ==========================================================================
   SPIN RESULT MODAL
   ========================================================================== */

interface SpinResultModalProps {
  isOpen: boolean
  result: SpinResult | null
  onClose: () => void
}

function SpinResultModal({ isOpen, result, onClose }: SpinResultModalProps) {
  if (!result || !result.reward_type) return null

  const Icon = ICON_MAP[result.segment_icon || "gift"] || Gift
  const isJackpot = result.reward_type === "jackpot"
  const isNothing = result.reward_type === "nothing"

  const getBgColor = () => {
    switch (result.reward_type) {
      case "xp": return "bg-gradient-to-br from-cyan-500 to-blue-500"
      case "coins": return "bg-gradient-to-br from-yellow-500 to-orange-500"
      case "bonus_spin": return "bg-gradient-to-br from-purple-500 to-pink-500"
      case "multiplier": return "bg-gradient-to-br from-green-500 to-emerald-500"
      case "jackpot": return "bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500"
      case "nothing": return "bg-zinc-800"
      default: return "bg-gradient-to-br from-cyan-500 to-blue-500"
    }
  }

  const formatReward = () => {
    const value = result.reward_value || {}
    switch (result.reward_type) {
      case "xp": return `+${value.xp || result.xp_earned || 0} XP`
      case "coins": return `+${value.coins || result.coins_earned || 0} Coins`
      case "bonus_spin": return `+${value.spins || 1} Spin Bonus`
      case "multiplier": return `×${value.multiplier || 2} pendant ${value.duration || 1}h`
      case "jackpot": return "Tu as gagné le JACKPOT !"
      case "nothing": return "Retente ta chance demain !"
      default: return "Récompense mystère"
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="relative w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`h-40 flex flex-col items-center justify-center ${getBgColor()}`}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center"
              >
                {isJackpot ? (
                  <Crown className="w-12 h-12 text-white" />
                ) : (
                  <Icon className="w-12 h-12 text-white" />
                )}
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-2xl font-black mb-2 ${
                  isJackpot
                    ? "text-yellow-400"
                    : isNothing
                    ? "text-zinc-400"
                    : "text-white"
                }`}
              >
                {isJackpot
                  ? "JACKPOT !!!"
                  : isNothing
                  ? "Pas de chance..."
                  : result.segment_name}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-zinc-400 mb-6"
              >
                {formatReward()}
              </motion.p>

              {/* XP Earned */}
              {result.xp_earned && result.xp_earned > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="w-8 h-8 text-yellow-400" />
                    <span className="text-3xl font-black text-yellow-400">
                      +{result.xp_earned.toLocaleString()} XP
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Streak Info */}
              {result.current_streak && result.current_streak > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-2 text-orange-400 mb-6"
                >
                  <Flame className="w-5 h-5" />
                  <span className="font-medium">
                    Streak de {result.current_streak} jours ! (x{result.streak_multiplier?.toFixed(2)})
                  </span>
                </motion.div>
              )}

              <button
                onClick={onClose}
                className={`w-full py-3 rounded-xl font-bold text-white ${
                  isJackpot
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : isNothing
                    ? "bg-zinc-700"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                }`}
              >
                {isNothing ? "Retenter ma chance" : "Super !"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function formatTimeRemaining(nextSpinAt: string): string {
  const now = new Date()
  const next = new Date(nextSpinAt)
  const diff = next.getTime() - now.getTime()

  if (diff <= 0) return "maintenant"

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
