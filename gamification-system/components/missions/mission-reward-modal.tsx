"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Zap,
  Gift,
  Star,
  Sparkles,
  CheckCircle,
  Trophy,
  Ticket,
} from "lucide-react"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import {
  type MissionWithProgress,
  MISSION_TYPE_CONFIG,
  formatBonusReward,
} from "../../features/missions/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface MissionRewardModalProps {
  isOpen: boolean
  onClose: () => void
  mission?: MissionWithProgress
  xpEarned: number
  bonusReward?: MissionWithProgress["bonus_reward"]
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function MissionRewardModal({
  isOpen,
  onClose,
  mission,
  xpEarned,
  bonusReward,
}: MissionRewardModalProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Delay content animation
      const timer = setTimeout(() => setShowContent(true), 300)

      // Trigger confetti
      const confettiTimer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#10b981", "#facc15", "#06b6d4"],
        })
      }, 400)

      return () => {
        clearTimeout(timer)
        clearTimeout(confettiTimer)
      }
    } else {
      setShowContent(false)
    }
  }, [isOpen])

  const typeConfig = mission ? MISSION_TYPE_CONFIG[mission.type] : null

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Decoration */}
            <div className="relative h-32 overflow-hidden">
              <div
                className={cn(
                  "absolute inset-0",
                  typeConfig
                    ? `bg-gradient-to-br ${typeConfig.gradient}`
                    : "bg-gradient-to-br from-green-500 to-emerald-500"
                )}
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={showContent ? { scale: 1, rotate: 0 } : {}}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  {/* Sparkle effects */}
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-1 -left-3"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  >
                    <Star className="w-5 h-5 text-yellow-300" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Floating particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white/30"
                  initial={{
                    x: Math.random() * 400,
                    y: 150,
                    scale: 0,
                  }}
                  animate={showContent ? {
                    y: -50,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  } : {}}
                  transition={{
                    duration: 2,
                    delay: 0.3 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <AnimatePresence>
                {showContent && (
                  <>
                    {/* Title */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h2 className="text-2xl font-black text-white mb-2">
                        Mission accomplie !
                      </h2>
                      {mission && (
                        <p className="text-zinc-400 mb-6">{mission.name}</p>
                      )}
                    </motion.div>

                    {/* Rewards */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-4"
                    >
                      {/* XP Reward */}
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                        <div className="flex items-center justify-center gap-3">
                          <motion.div
                            animate={{
                              rotate: [0, 10, -10, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                          >
                            <Zap className="w-8 h-8 text-yellow-400" />
                          </motion.div>
                          <span className="text-4xl font-black text-yellow-400">
                            +{xpEarned} XP
                          </span>
                        </div>
                      </div>

                      {/* Bonus Reward */}
                      {bonusReward && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4"
                        >
                          <p className="text-sm text-purple-400 mb-2">
                            Bonus obtenu
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            {bonusReward.type === "badge" && (
                              <Trophy className="w-6 h-6 text-purple-400" />
                            )}
                            {bonusReward.type === "ticket" && (
                              <Ticket className="w-6 h-6 text-purple-400" />
                            )}
                            {bonusReward.type === "multiplier" && (
                              <Zap className="w-6 h-6 text-purple-400" />
                            )}
                            {bonusReward.type === "item" && (
                              <Gift className="w-6 h-6 text-purple-400" />
                            )}
                            <span className="text-xl font-bold text-purple-400">
                              {formatBonusReward(bonusReward)}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Close Button */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      onClick={onClose}
                      className={cn(
                        "mt-6 w-full py-3 rounded-xl font-bold text-white",
                        "bg-gradient-to-r from-green-500 to-emerald-500",
                        "hover:shadow-lg hover:shadow-green-500/25 transition-shadow"
                      )}
                    >
                      Super !
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   CLAIM ALL REWARDS MODAL
   ========================================================================== */

interface ClaimAllRewardsModalProps {
  isOpen: boolean
  onClose: () => void
  totalXp: number
  missionCount: number
  bonuses: Array<NonNullable<MissionWithProgress["bonus_reward"]>>
}

export function ClaimAllRewardsModal({
  isOpen,
  onClose,
  totalXp,
  missionCount,
  bonuses,
}: ClaimAllRewardsModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Multiple confetti bursts
      const burst1 = setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.3, y: 0.6 },
        })
      }, 300)

      const burst2 = setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.7, y: 0.6 },
        })
      }, 500)

      const burst3 = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { x: 0.5, y: 0.5 },
        })
      }, 700)

      return () => {
        clearTimeout(burst1)
        clearTimeout(burst2)
        clearTimeout(burst3)
      }
    }
  }, [isOpen])

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
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="relative h-32 bg-gradient-to-br from-green-500 to-emerald-500 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="flex items-center gap-4"
                >
                  <Gift className="w-12 h-12 text-white" />
                  <span className="text-4xl font-black text-white">×{missionCount}</span>
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black text-white mb-2"
              >
                Toutes les récompenses réclamées !
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-zinc-400 mb-6"
              >
                {missionCount} mission{missionCount > 1 ? "s" : ""} complétée{missionCount > 1 ? "s" : ""}
              </motion.p>

              {/* Total XP */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-4"
              >
                <div className="flex items-center justify-center gap-3">
                  <Zap className="w-10 h-10 text-yellow-400" />
                  <span className="text-5xl font-black text-yellow-400">
                    +{totalXp}
                  </span>
                  <span className="text-2xl font-bold text-yellow-400">XP</span>
                </div>
              </motion.div>

              {/* Bonuses */}
              {bonuses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2 mb-6"
                >
                  <p className="text-sm text-zinc-500 mb-2">Bonus obtenus</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {bonuses.map((bonus, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium"
                      >
                        {formatBonusReward(bonus)}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/25 transition-shadow"
              >
                Continuer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   MISSION TOAST NOTIFICATION
   ========================================================================== */

interface MissionToastProps {
  show: boolean
  mission: MissionWithProgress
  onClose: () => void
}

export function MissionCompletedToast({
  show,
  mission,
  onClose,
}: MissionToastProps) {
  const config = MISSION_TYPE_CONFIG[mission.type]

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -100, x: "-50%" }}
          className="fixed top-4 left-1/2 z-50 max-w-sm w-full"
        >
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-2xl shadow-2xl",
              "bg-zinc-900 border border-green-500/50"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                `bg-gradient-to-br ${config.gradient}`
              )}
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">
                Mission complétée !
              </p>
              <p className="text-sm text-zinc-400 truncate">{mission.name}</p>
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">+{mission.xp_reward}</span>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
