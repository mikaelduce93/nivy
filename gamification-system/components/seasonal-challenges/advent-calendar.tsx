/**
 * TEENS PARTY MOROCCO - Advent Calendar Component
 * ================================================
 *
 * Calendrier de l'Avent interactif.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Gift,
  Lock,
  Check,
  Zap,
  Star,
  Coins,
  Award,
  Package,
  Crown,
  Sparkles,
  Calendar,
  X,
} from "lucide-react"
import confetti from "canvas-confetti"
import {
  type AdventCalendarWithProgress,
  type AdventDay,
  type AdventDayReward,
  REWARD_TYPE_CONFIG,
  getAdventDayEmoji,
  getRewardMessage,
} from "../../features/seasonal-challenges"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const rewardIcons: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6" />,
  Coins: <Coins className="w-6 h-6" />,
  Award: <Award className="w-6 h-6" />,
  Gift: <Gift className="w-6 h-6" />,
  Package: <Package className="w-6 h-6" />,
  Crown: <Crown className="w-6 h-6" />,
  Star: <Star className="w-6 h-6" />,
  Box: <Package className="w-6 h-6" />,
}

/* ==========================================================================
   MAIN ADVENT CALENDAR
   ========================================================================== */

interface AdventCalendarProps {
  calendar: AdventCalendarWithProgress
  onOpenDay: (dayNumber: number) => Promise<{
    success: boolean
    data?: {
      reward: AdventDayReward
      xp_earned: number
    }
    error?: string
  }>
}

export function AdventCalendar({ calendar, onOpenDay }: AdventCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [openedReward, setOpenedReward] = useState<AdventDayReward | null>(null)
  const [xpEarned, setXpEarned] = useState(0)

  const openedDays = new Set(calendar.user_progress.map((p) => p.day_number))

  const handleDayClick = (day: AdventDay) => {
    if (!day.is_unlocked || openedDays.has(day.day_number)) return
    setSelectedDay(day.day_number)
  }

  const handleOpenDay = async () => {
    if (!selectedDay) return

    setIsOpening(true)
    const result = await onOpenDay(selectedDay)

    if (result.success && result.data) {
      setOpenedReward(result.data.reward)
      setXpEarned(result.data.xp_earned)

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ef4444", "#22c55e", "#eab308", "#3b82f6"],
      })
    }

    setIsOpening(false)
  }

  const closeModal = () => {
    setSelectedDay(null)
    setOpenedReward(null)
    setXpEarned(0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{calendar.title}</h2>
        <p className="text-zinc-400">{calendar.description}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
          <p className="text-2xl font-bold text-white">{calendar.stats.days_opened}</p>
          <p className="text-xs text-zinc-400">Cases ouvertes</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
          <p className="text-2xl font-bold text-yellow-400">{calendar.stats.total_xp_earned}</p>
          <p className="text-xs text-zinc-400">XP gagnés</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
          <p className="text-2xl font-bold text-orange-400">{calendar.stats.current_streak}</p>
          <p className="text-xs text-zinc-400">Série</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {calendar.days.map((day) => {
          const isOpened = openedDays.has(day.day_number)
          const isUnlocked = day.is_unlocked
          const isCurrent = day.day_number === calendar.current_day && !isOpened

          return (
            <motion.button
              key={day.day_number}
              whileHover={isUnlocked && !isOpened ? { scale: 1.05 } : {}}
              whileTap={isUnlocked && !isOpened ? { scale: 0.95 } : {}}
              onClick={() => handleDayClick(day)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                isOpened
                  ? "bg-green-500/20 border border-green-500/30"
                  : isUnlocked
                  ? isCurrent
                    ? "bg-gradient-to-br from-red-500/30 to-green-500/30 border-2 border-yellow-500 animate-pulse"
                    : "bg-gradient-to-br from-red-500/20 to-green-500/20 border border-white/10 hover:border-yellow-500/50 cursor-pointer"
                  : "bg-zinc-800/50 border border-zinc-700 opacity-50"
              }`}
            >
              {/* Day Number */}
              <span
                className={`text-lg font-bold ${
                  isOpened
                    ? "text-green-400"
                    : isUnlocked
                    ? "text-white"
                    : "text-zinc-500"
                }`}
              >
                {day.day_number}
              </span>

              {/* Status Icon */}
              {isOpened ? (
                <Check className="w-4 h-4 text-green-400 mt-1" />
              ) : isUnlocked ? (
                <span className="text-lg">{getAdventDayEmoji(day.day_number)}</span>
              ) : (
                <Lock className="w-4 h-4 text-zinc-500 mt-1" />
              )}

              {/* Bonus Badge */}
              {day.is_bonus && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Star className="w-3 h-3 text-black" />
                </div>
              )}

              {/* Current Day Indicator */}
              {isCurrent && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <span className="text-xs text-yellow-400 font-bold animate-bounce">
                    ↑
                  </span>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-zinc-400">Progression</span>
          <span className="text-white">
            {calendar.stats.completion_percentage}%
          </span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${calendar.stats.completion_percentage}%` }}
            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
          />
        </div>
      </div>

      {/* Open Day Modal */}
      <AnimatePresence>
        {selectedDay !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden"
            >
              {openedReward ? (
                // Reward Display
                <div className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center"
                  >
                    {rewardIcons[openedReward.icon] || (
                      <Gift className="w-12 h-12 text-yellow-400" />
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-4xl mb-2">
                      {getRewardMessage(openedReward.type, openedReward.amount).emoji}
                    </p>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {openedReward.title}
                    </h3>
                    <p className="text-zinc-400 mb-4">{openedReward.description}</p>

                    {xpEarned > 0 && (
                      <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold mb-4">
                        <Zap className="w-5 h-5" />
                        +{xpEarned} XP
                      </div>
                    )}
                  </motion.div>

                  <button
                    onClick={closeModal}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-green-500 text-white font-bold"
                  >
                    Super !
                  </button>
                </div>
              ) : (
                // Confirmation
                <div className="p-6 text-center">
                  <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>

                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-green-500/20 flex items-center justify-center">
                    <span className="text-4xl">{getAdventDayEmoji(selectedDay)}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">
                    Jour {selectedDay}
                  </h3>
                  <p className="text-zinc-400 mb-6">
                    Prêt à découvrir ta surprise ?
                  </p>

                  <button
                    onClick={handleOpenDay}
                    disabled={isOpening}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-green-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {isOpening ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                        Ouverture...
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5" />
                        Ouvrir la case
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   COMPACT ADVENT WIDGET
   ========================================================================== */

interface AdventWidgetProps {
  calendar: AdventCalendarWithProgress
  onPress: () => void
  canOpenToday: boolean
}

export function AdventWidget({ calendar, onPress, canOpenToday }: AdventWidgetProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="relative p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-green-500/20 border border-white/10 cursor-pointer overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10">
        <span className="text-6xl">🎄</span>
      </div>

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-green-500 flex items-center justify-center">
          <Calendar className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-bold text-white">Calendrier de l'Avent</h3>
          <p className="text-sm text-zinc-400">
            {calendar.stats.days_opened}/{calendar.total_days} cases ouvertes
          </p>
        </div>

        {/* CTA */}
        {canOpenToday && (
          <div className="px-3 py-1.5 rounded-full bg-yellow-500 text-black text-sm font-bold animate-pulse">
            Ouvrir !
          </div>
        )}
      </div>

      {/* Mini Progress */}
      <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full"
          style={{ width: `${calendar.stats.completion_percentage}%` }}
        />
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   ADVENT COUNTDOWN
   ========================================================================== */

interface AdventCountdownProps {
  startDate: string
}

export function AdventCountdown({ startDate }: AdventCountdownProps) {
  const start = new Date(startDate)
  const now = new Date()
  const diff = start.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days <= 0) return null

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-green-500/20 border border-white/10 text-center">
      <span className="text-5xl mb-4 block">🎄</span>
      <h3 className="text-xl font-bold text-white mb-2">
        Le Calendrier de l'Avent arrive !
      </h3>
      <p className="text-zinc-400 mb-4">Plus que</p>
      <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-green-500">
        {days} jour{days > 1 ? "s" : ""}
      </div>
    </div>
  )
}
