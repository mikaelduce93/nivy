/**
 * TEENS PARTY MOROCCO - Milestones Section Component
 * ===================================================
 *
 * Section des jalons et records personnels.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Star,
  Lock,
  Check,
  PartyPopper,
  Users,
  Heart,
  Crown,
  Award,
  Medal,
  UserPlus,
  TrendingUp,
  Zap,
  Flame,
  Calendar,
  Gift,
  Sparkles,
  Timer,
  CheckCircle,
  Gamepad2,
  Target,
  Clock,
} from "lucide-react"
import {
  type Milestone,
  type PersonalRecord,
  type MilestoneType,
  type RecordType,
  MILESTONE_CONFIG,
  RECORD_CONFIG,
  formatRelativeDate,
  formatLargeNumber,
} from "../../features/stats-dashboard"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const iconMap: Record<string, React.ReactNode> = {
  PartyPopper: <PartyPopper className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Medal: <Medal className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  UserPlus: <UserPlus className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />,
  Gift: <Gift className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Timer: <Timer className="w-5 h-5" />,
  CheckCircle: <CheckCircle className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
  Target: <Target className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  CalendarDays: <Calendar className="w-5 h-5" />,
}

/* ==========================================================================
   RARITY COLORS
   ========================================================================== */

const rarityColors = {
  common: {
    bg: "bg-zinc-500/20",
    border: "border-zinc-500/30",
    text: "text-zinc-400",
    gradient: "from-zinc-500/20 to-zinc-600/20",
  },
  uncommon: {
    bg: "bg-green-500/20",
    border: "border-green-500/30",
    text: "text-green-400",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  rare: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
    text: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  epic: {
    bg: "bg-purple-500/20",
    border: "border-purple-500/30",
    text: "text-purple-400",
    gradient: "from-purple-500/20 to-violet-500/20",
  },
  legendary: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    gradient: "from-yellow-500/20 to-orange-500/20",
  },
}

/* ==========================================================================
   MILESTONES SECTION
   ========================================================================== */

interface MilestonesSectionProps {
  achieved: Milestone[]
  showLocked?: boolean
}

export function MilestonesSection({
  achieved,
  showLocked = true,
}: MilestonesSectionProps) {
  const [filter, setFilter] = useState<"all" | "achieved" | "locked">("all")

  // Créer une map des jalons atteints
  const achievedMap = new Set(achieved.map((m) => m.milestone_type))

  // Liste de tous les jalons possibles
  const allMilestones = Object.entries(MILESTONE_CONFIG).map(([type, config]) => ({
    type: type as MilestoneType,
    config,
    achieved: achievedMap.has(type as MilestoneType),
    data: achieved.find((m) => m.milestone_type === type),
  }))

  // Filtrer selon le filtre sélectionné
  const filteredMilestones = allMilestones.filter((m) => {
    if (filter === "achieved") return m.achieved
    if (filter === "locked") return !m.achieved
    return true
  })

  // Grouper par rareté
  const byRarity = {
    legendary: filteredMilestones.filter((m) => m.config.rarity === "legendary"),
    epic: filteredMilestones.filter((m) => m.config.rarity === "epic"),
    rare: filteredMilestones.filter((m) => m.config.rarity === "rare"),
    uncommon: filteredMilestones.filter((m) => m.config.rarity === "uncommon"),
    common: filteredMilestones.filter((m) => m.config.rarity === "common"),
  }

  const achievedCount = achieved.length
  const totalCount = Object.keys(MILESTONE_CONFIG).length
  const progress = Math.round((achievedCount / totalCount) * 100)

  return (
    <div className="space-y-6">
      {/* Header avec progression */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            Jalons
          </h3>
          <span className="text-sm text-purple-400">
            {achievedCount}/{totalCount}
          </span>
        </div>

        {/* Barre de progression */}
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
          />
        </div>
        <p className="text-xs text-zinc-400 text-center">{progress}% complétés</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {[
          { key: "all" as const, label: "Tous" },
          { key: "achieved" as const, label: "Obtenus" },
          { key: "locked" as const, label: "À débloquer" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.key
                ? "bg-purple-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste par rareté */}
      {Object.entries(byRarity).map(
        ([rarity, milestones]) =>
          milestones.length > 0 && (
            <div key={rarity} className="space-y-2">
              <h4
                className={`text-sm font-medium capitalize ${
                  rarityColors[rarity as keyof typeof rarityColors].text
                }`}
              >
                {rarity === "legendary"
                  ? "Légendaire"
                  : rarity === "epic"
                  ? "Épique"
                  : rarity === "rare"
                  ? "Rare"
                  : rarity === "uncommon"
                  ? "Peu commun"
                  : "Commun"}
              </h4>
              <div className="grid gap-2">
                {milestones.map((m) => (
                  <MilestoneCard
                    key={m.type}
                    type={m.type}
                    config={m.config}
                    achieved={m.achieved}
                    achievedAt={m.data?.achieved_at}
                  />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  )
}

/* ==========================================================================
   MILESTONE CARD
   ========================================================================== */

interface MilestoneCardProps {
  type: MilestoneType
  config: (typeof MILESTONE_CONFIG)[MilestoneType]
  achieved: boolean
  achievedAt?: string
}

export function MilestoneCard({
  type,
  config,
  achieved,
  achievedAt,
}: MilestoneCardProps) {
  const colors = rarityColors[config.rarity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border ${
        achieved
          ? `bg-gradient-to-br ${colors.gradient} ${colors.border}`
          : "bg-zinc-800/30 border-zinc-700 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            achieved ? colors.bg : "bg-zinc-800"
          }`}
        >
          {achieved ? (
            <span className={colors.text}>
              {iconMap[config.icon] || <Trophy className="w-5 h-5" />}
            </span>
          ) : (
            <Lock className="w-5 h-5 text-zinc-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.emoji}</span>
            <p className={`font-medium ${achieved ? "text-white" : "text-zinc-500"}`}>
              {config.name}
            </p>
          </div>
          <p className="text-xs text-zinc-500 truncate">{config.description}</p>
        </div>

        {/* Status/Rewards */}
        <div className="text-right">
          {achieved ? (
            <>
              <div className="flex items-center gap-1 text-yellow-400 text-sm">
                <Zap className="w-3 h-3" />
                <span>+{config.xpReward}</span>
              </div>
              {achievedAt && (
                <p className="text-xs text-zinc-500">
                  {formatRelativeDate(achievedAt)}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1 text-zinc-600 text-xs">
              <Zap className="w-3 h-3" />
              <span>{config.xpReward} XP</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   PERSONAL RECORDS SECTION
   ========================================================================== */

interface PersonalRecordsSectionProps {
  records: PersonalRecord[]
}

export function PersonalRecordsSection({ records }: PersonalRecordsSectionProps) {
  // Créer une map des records existants
  const recordsMap = new Map(records.map((r) => [r.record_type, r]))

  // Liste de tous les types de records
  const allRecords = Object.entries(RECORD_CONFIG).map(([type, config]) => ({
    type: type as RecordType,
    config,
    data: recordsMap.get(type as RecordType),
  }))

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400" />
        Records Personnels
      </h3>

      <div className="grid gap-3">
        {allRecords.map((record) => (
          <RecordCard
            key={record.type}
            type={record.type}
            config={record.config}
            data={record.data}
          />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   RECORD CARD
   ========================================================================== */

interface RecordCardProps {
  type: RecordType
  config: (typeof RECORD_CONFIG)[RecordType]
  data?: PersonalRecord
}

export function RecordCard({ type, config, data }: RecordCardProps) {
  const hasRecord = data && data.record_value > 0

  return (
    <div
      className={`p-3 rounded-xl border ${
        hasRecord
          ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
          : "bg-zinc-800/30 border-zinc-700 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            hasRecord ? "bg-yellow-500/20" : "bg-zinc-800"
          }`}
        >
          <span className={hasRecord ? "text-yellow-400" : "text-zinc-600"}>
            {iconMap[config.icon] || <Star className="w-5 h-5" />}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.emoji}</span>
            <p className={`font-medium ${hasRecord ? "text-white" : "text-zinc-500"}`}>
              {config.name}
            </p>
          </div>
          <p className="text-xs text-zinc-500">{config.description}</p>
        </div>

        {/* Value */}
        <div className="text-right">
          {hasRecord ? (
            <>
              <p className="text-xl font-bold text-yellow-400">
                {formatLargeNumber(data.record_value)}
              </p>
              <p className="text-xs text-zinc-500">{config.unit}</p>
              {data.previous_record && data.previous_record > 0 && (
                <p className="text-xs text-green-400">
                  +{formatLargeNumber(data.record_value - data.previous_record)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-600">—</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   RECENT MILESTONES
   ========================================================================== */

interface RecentMilestonesProps {
  milestones: Milestone[]
  limit?: number
}

export function RecentMilestones({ milestones, limit = 5 }: RecentMilestonesProps) {
  const recent = milestones.slice(0, limit)

  if (recent.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 text-center">
        <Trophy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Aucun jalon atteint récemment</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-zinc-400">Récents</h4>
      {recent.map((milestone) => {
        const config = MILESTONE_CONFIG[milestone.milestone_type]
        if (!config) return null

        return (
          <div
            key={milestone.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30"
          >
            <span className="text-xl">{config.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{config.name}</p>
              <p className="text-xs text-zinc-500">
                {formatRelativeDate(milestone.achieved_at)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <Zap className="w-3 h-3" />
              +{config.xpReward}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   MILESTONE NOTIFICATION
   ========================================================================== */

interface MilestoneNotificationProps {
  milestone: Milestone
  onClose: () => void
}

export function MilestoneNotification({
  milestone,
  onClose,
}: MilestoneNotificationProps) {
  const config = MILESTONE_CONFIG[milestone.milestone_type]
  if (!config) return null

  const colors = rarityColors[config.rarity]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80"
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          className={`relative p-6 rounded-2xl bg-gradient-to-br ${colors.gradient} border ${colors.border} text-center max-w-sm w-full`}
        >
          {/* Emoji */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-4"
          >
            {config.emoji}
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-white mb-2"
          >
            Jalon débloqué !
          </motion.h3>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg font-medium text-white mb-1"
          >
            {config.name}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-zinc-400 mb-4"
          >
            {config.description}
          </motion.p>

          {/* Rewards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-5 h-5" />
              <span className="font-bold">+{config.xpReward} XP</span>
            </div>
            {config.coinsReward > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold">+{config.coinsReward}</span>
              </div>
            )}
          </motion.div>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={onClose}
            className={`w-full py-3 rounded-xl ${colors.bg} ${colors.text} font-bold`}
          >
            Super !
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
