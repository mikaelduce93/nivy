"use client"

/**
 * TEENS PARTY MOROCCO - Missions Client Component
 * ================================================
 * Composant client pour les missions
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target,
  CheckCircle,
  Clock,
  Zap,
  Calendar,
  Users,
  Trophy,
  Camera,
  Star,
  Ticket,
  Gift,
  ChevronRight,
} from "lucide-react"
import confetti from "canvas-confetti"
import { claimMissionReward, claimAllMissionRewards } from "@/gamification-system/features/missions/actions"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Mission {
  mission_id: string
  user_mission_id: string
  type: string
  category: string
  name: string
  description: string
  icon: string
  xp_reward: number
  bonus_reward: any
  target_count: number
  current_progress: number
  status: string
  expires_at: string | null
}

interface MissionStats {
  total_completed: number
  total_xp_earned: number
  current_daily_streak: number
  best_daily_streak: number
}

interface MissionsClientProps {
  missions: Mission[]
  stats: MissionStats
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  target: Target,
  check: CheckCircle,
  clock: Clock,
  zap: Zap,
  calendar: Calendar,
  users: Users,
  trophy: Trophy,
  camera: Camera,
  star: Star,
  ticket: Ticket,
  gift: Gift,
}

const CATEGORY_COLORS: Record<string, string> = {
  social: "#ec4899",
  events: "#f97316",
  challenges: "#06b6d4",
  engagement: "#22c55e",
  special: "#a855f7",
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function MissionsClient({ missions: initialMissions, stats }: MissionsClientProps) {
  const [missions, setMissions] = useState(initialMissions)
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily")
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [rewardData, setRewardData] = useState<{ xp: number; bonus: any } | null>(null)

  const filteredMissions = missions.filter((m) => m.type === activeTab)
  const activeMissions = filteredMissions.filter((m) => m.status === "active")
  const completedMissions = filteredMissions.filter((m) => m.status === "completed")
  const claimedMissions = filteredMissions.filter((m) => m.status === "claimed")

  const allCompletedMissions = missions.filter((m) => m.status === "completed")

  const handleClaim = async (userMissionId: string) => {
    setClaimingId(userMissionId)
    try {
      const result = await claimMissionReward(userMissionId)
      if (result.success) {
        // Update local state
        setMissions((prev) =>
          prev.map((m) =>
            m.user_mission_id === userMissionId ? { ...m, status: "claimed" } : m
          )
        )

        // Show reward modal
        setRewardData({ xp: result.xp_earned, bonus: result.bonus_reward })
        setShowRewardModal(true)

        // Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#06b6d4", "#facc15"],
        })
      }
    } finally {
      setClaimingId(null)
    }
  }

  const handleClaimAll = async () => {
    const result = await claimAllMissionRewards()
    if (result.claimed > 0) {
      // Update local state
      setMissions((prev) =>
        prev.map((m) =>
          m.status === "completed" ? { ...m, status: "claimed" } : m
        )
      )

      // Show reward modal
      setRewardData({ xp: result.total_xp, bonus: result.bonuses })
      setShowRewardModal(true)

      // Big confetti!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Claim All Button */}
      {allCompletedMissions.length > 0 && (
        <div className="text-center">
          <button
            onClick={handleClaimAll}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 transition-colors"
          >
            Réclamer tout ({allCompletedMissions.length} missions)
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        {[
          { id: "daily", label: "Quotidiennes", icon: Clock },
          { id: "weekly", label: "Hebdomadaires", icon: Calendar },
          { id: "monthly", label: "Mensuelles", icon: Trophy },
        ].map((tab) => {
          const count = missions.filter((m) => m.type === tab.id && m.status !== "claimed").length
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? "bg-white/20" : "bg-zinc-700"
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Missions Lists */}
      <div className="space-y-8">
        {/* Active Missions */}
        {activeMissions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              En cours ({activeMissions.length})
            </h2>
            <div className="space-y-3">
              {activeMissions.map((mission) => (
                <MissionCard
                  key={mission.user_mission_id}
                  mission={mission}
                  onClaim={handleClaim}
                  isClaiming={claimingId === mission.user_mission_id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Missions (to claim) */}
        {completedMissions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              A réclamer ({completedMissions.length})
            </h2>
            <div className="space-y-3">
              {completedMissions.map((mission) => (
                <MissionCard
                  key={mission.user_mission_id}
                  mission={mission}
                  onClaim={handleClaim}
                  isClaiming={claimingId === mission.user_mission_id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Claimed Missions */}
        {claimedMissions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-zinc-500 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Terminées ({claimedMissions.length})
            </h2>
            <div className="space-y-3 opacity-60">
              {claimedMissions.map((mission) => (
                <MissionCard
                  key={mission.user_mission_id}
                  mission={mission}
                  onClaim={handleClaim}
                  isClaiming={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredMissions.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">
              Aucune mission {activeTab === "daily" ? "quotidienne" : activeTab === "weekly" ? "hebdomadaire" : "mensuelle"} disponible
            </p>
          </div>
        )}
      </div>

      {/* Reward Modal */}
      <RewardModal
        isOpen={showRewardModal}
        reward={rewardData}
        onClose={() => {
          setShowRewardModal(false)
          setRewardData(null)
        }}
      />
    </div>
  )
}

/* ==========================================================================
   MISSION CARD
   ========================================================================== */

interface MissionCardProps {
  mission: Mission
  onClaim: (userMissionId: string) => void
  isClaiming: boolean
}

function MissionCard({ mission, onClaim, isClaiming }: MissionCardProps) {
  const Icon = ICON_MAP[mission.icon] || Target
  const progress = Math.min(100, (mission.current_progress / mission.target_count) * 100)
  const categoryColor = CATEGORY_COLORS[mission.category] || "#06b6d4"
  const isCompleted = mission.status === "completed"
  const isClaimed = mission.status === "claimed"

  // Temps restant
  const timeRemaining = mission.expires_at ? getTimeRemaining(mission.expires_at) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border transition-colors ${
        isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : isClaimed
          ? "bg-zinc-800/30 border-zinc-700/30"
          : "bg-zinc-800/50 border-zinc-700/50"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${categoryColor}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: categoryColor }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold truncate ${isClaimed ? "text-zinc-500" : "text-white"}`}>
              {mission.name}
            </h3>
            {isCompleted && !isClaimed && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                Terminée !
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mb-3">{mission.description}</p>

          {/* Progress Bar */}
          {!isClaimed && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">
                  {mission.current_progress} / {mission.target_count}
                </span>
                {timeRemaining && (
                  <span className="text-orange-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeRemaining}
                  </span>
                )}
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: isCompleted ? "#22c55e" : categoryColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reward / Claim Button */}
        <div className="shrink-0 text-right">
          {isCompleted && !isClaimed ? (
            <button
              onClick={() => onClaim(mission.user_mission_id)}
              disabled={isClaiming}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 transition-colors"
            >
              {isClaiming ? "..." : "Réclamer"}
            </button>
          ) : (
            <div className={`flex items-center gap-1 ${isClaimed ? "text-zinc-600" : "text-yellow-400"}`}>
              <Zap className="w-4 h-4" />
              <span className="font-bold">{mission.xp_reward}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   REWARD MODAL
   ========================================================================== */

interface RewardModalProps {
  isOpen: boolean
  reward: { xp: number; bonus: any } | null
  onClose: () => void
}

function RewardModal({ isOpen, reward, onClose }: RewardModalProps) {
  if (!isOpen || !reward) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="relative w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-40 flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Gift className="w-12 h-12 text-white" />
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black text-white mb-2"
            >
              Mission accomplie !
            </motion.h2>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-8 h-8 text-yellow-400" />
                <span className="text-3xl font-black text-yellow-400">
                  +{reward.xp.toLocaleString()} XP
                </span>
              </div>
            </motion.div>

            {reward.bonus && Array.isArray(reward.bonus) && reward.bonus.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-zinc-400 mb-4"
              >
                + {reward.bonus.length} bonus supplémentaire(s)
              </motion.div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 font-bold text-white"
            >
              Super !
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getTimeRemaining(expiresAt: string): string {
  const now = new Date()
  const end = new Date(expiresAt)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return "Expiré"

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}j`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
