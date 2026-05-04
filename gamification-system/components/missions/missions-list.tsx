"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sun,
  Calendar,
  CalendarDays,
  Sparkles,
  Filter,
  Search,
  X,
  Gift,
  Loader2,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MissionCard } from "./mission-card"
import {
  type MissionWithProgress,
  type MissionType,
  type MissionStatus,
  MISSION_TYPE_CONFIG,
  sortMissionsByPriority,
  groupMissionsByType,
  countMissionsByStatus,
} from "../../features/missions/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface MissionsListProps {
  missions: MissionWithProgress[]
  onClaim?: (userMissionId: string) => Promise<void>
  onClaimAll?: () => Promise<void>
  onMissionClick?: (mission: MissionWithProgress) => void
  isLoading?: boolean
  showFilters?: boolean
  showSearch?: boolean
  groupByType?: boolean
  className?: string
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function MissionsList({
  missions,
  onClaim,
  onClaimAll,
  onMissionClick,
  isLoading = false,
  showFilters = true,
  showSearch = true,
  groupByType = true,
  className,
}: MissionsListProps) {
  const [activeTypeFilter, setActiveTypeFilter] = useState<MissionType | "all">("all")
  const [activeStatusFilter, setActiveStatusFilter] = useState<MissionStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isClaimingAll, setIsClaimingAll] = useState(false)

  // Filter and sort missions
  const filteredMissions = useMemo(() => {
    let result = [...missions]

    // Filter by type
    if (activeTypeFilter !== "all") {
      result = result.filter((m) => m.type === activeTypeFilter)
    }

    // Filter by status
    if (activeStatusFilter !== "all") {
      result = result.filter((m) => m.status === activeStatusFilter)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      )
    }

    return sortMissionsByPriority(result)
  }, [missions, activeTypeFilter, activeStatusFilter, searchQuery])

  // Group missions by type
  const groupedMissions = useMemo(() => {
    if (!groupByType || activeTypeFilter !== "all") return null
    return groupMissionsByType(filteredMissions)
  }, [filteredMissions, groupByType, activeTypeFilter])

  // Count by status
  const statusCounts = useMemo(() => countMissionsByStatus(missions), [missions])

  // Handle claim all
  const handleClaimAll = async () => {
    if (!onClaimAll || isClaimingAll) return
    setIsClaimingAll(true)
    try {
      await onClaimAll()
    } finally {
      setIsClaimingAll(false)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Claim All */}
      {statusCounts.completed > 0 && onClaimAll && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-bold text-white">
                {statusCounts.completed} mission{statusCounts.completed > 1 ? "s" : ""} complétée{statusCounts.completed > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-green-400">
                Réclame tes récompenses !
              </p>
            </div>
          </div>
          <motion.button
            onClick={handleClaimAll}
            disabled={isClaimingAll}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold",
              "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
              "hover:shadow-lg hover:shadow-green-500/25 transition-shadow"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isClaimingAll ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Gift className="w-5 h-5" />
                Tout réclamer
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Type Filters */}
          <MissionTypeFilters
            activeType={activeTypeFilter}
            onTypeChange={setActiveTypeFilter}
            missionCounts={{
              all: missions.length,
              daily: missions.filter((m) => m.type === "daily").length,
              weekly: missions.filter((m) => m.type === "weekly").length,
              monthly: missions.filter((m) => m.type === "monthly").length,
              seasonal: missions.filter((m) => m.type === "seasonal").length,
            }}
          />

          {/* Status & Search Row */}
          <div className="flex gap-3">
            {/* Status Filters */}
            <div className="flex gap-2">
              <StatusFilterButton
                status="all"
                label="Toutes"
                count={missions.length}
                isActive={activeStatusFilter === "all"}
                onClick={() => setActiveStatusFilter("all")}
              />
              <StatusFilterButton
                status="active"
                label="En cours"
                count={statusCounts.active}
                isActive={activeStatusFilter === "active"}
                onClick={() => setActiveStatusFilter("active")}
                icon={<Target className="w-3.5 h-3.5" />}
              />
              <StatusFilterButton
                status="completed"
                label="Terminées"
                count={statusCounts.completed}
                isActive={activeStatusFilter === "completed"}
                onClick={() => setActiveStatusFilter("completed")}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Search */}
            {showSearch && (
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMissions.length === 0 && (
        <EmptyMissionsState
          hasFilters={activeTypeFilter !== "all" || activeStatusFilter !== "all" || !!searchQuery}
          onClearFilters={() => {
            setActiveTypeFilter("all")
            setActiveStatusFilter("all")
            setSearchQuery("")
          }}
        />
      )}

      {/* Missions List */}
      {!isLoading && filteredMissions.length > 0 && (
        <>
          {groupedMissions ? (
            // Grouped by Type
            <div className="space-y-8">
              {(["daily", "weekly", "monthly", "seasonal"] as MissionType[]).map(
                (type) => {
                  const typeMissions = groupedMissions[type]
                  if (typeMissions.length === 0) return null

                  return (
                    <MissionTypeSection
                      key={type}
                      type={type}
                      missions={typeMissions}
                      onClaim={onClaim}
                      onMissionClick={onMissionClick}
                    />
                  )
                }
              )}
            </div>
          ) : (
            // Flat list
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredMissions.map((mission, index) => (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MissionCard
                      mission={mission}
                      onClaim={onClaim}
                      onClick={
                        onMissionClick
                          ? () => onMissionClick(mission)
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ==========================================================================
   TYPE FILTERS
   ========================================================================== */

interface MissionTypeFiltersProps {
  activeType: MissionType | "all"
  onTypeChange: (type: MissionType | "all") => void
  missionCounts: Record<MissionType | "all", number>
}

function MissionTypeFilters({
  activeType,
  onTypeChange,
  missionCounts,
}: MissionTypeFiltersProps) {
  const types: Array<{ value: MissionType | "all"; label: string; icon: any }> = [
    { value: "all", label: "Toutes", icon: Filter },
    { value: "daily", label: "Quotidiennes", icon: Sun },
    { value: "weekly", label: "Hebdo", icon: Calendar },
    { value: "monthly", label: "Mensuelles", icon: CalendarDays },
    { value: "seasonal", label: "Saison", icon: Sparkles },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {types.map(({ value, label, icon: Icon }) => {
        const isActive = activeType === value
        const count = missionCounts[value]
        const config = value !== "all" ? MISSION_TYPE_CONFIG[value] : null

        return (
          <motion.button
            key={value}
            onClick={() => onTypeChange(value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all",
              isActive
                ? config
                  ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                  : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  isActive ? "bg-white/20" : "bg-zinc-700"
                )}
              >
                {count}
              </span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   STATUS FILTER BUTTON
   ========================================================================== */

interface StatusFilterButtonProps {
  status: MissionStatus | "all"
  label: string
  count: number
  isActive: boolean
  onClick: () => void
  icon?: React.ReactNode
}

function StatusFilterButton({
  status,
  label,
  count,
  isActive,
  onClick,
  icon,
}: StatusFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        isActive
          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
          : "bg-zinc-800 text-zinc-400 hover:text-white border border-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span className="text-xs opacity-70">({count})</span>
      )}
    </button>
  )
}

/* ==========================================================================
   TYPE SECTION
   ========================================================================== */

interface MissionTypeSectionProps {
  type: MissionType
  missions: MissionWithProgress[]
  onClaim?: (userMissionId: string) => Promise<void>
  onMissionClick?: (mission: MissionWithProgress) => void
}

function MissionTypeSection({
  type,
  missions,
  onClaim,
  onMissionClick,
}: MissionTypeSectionProps) {
  const config = MISSION_TYPE_CONFIG[type]
  const completedCount = missions.filter((m) => m.status === "completed").length

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              `bg-gradient-to-br ${config.gradient}`
            )}
          >
            {type === "daily" && <Sun className="w-4 h-4 text-white" />}
            {type === "weekly" && <Calendar className="w-4 h-4 text-white" />}
            {type === "monthly" && <CalendarDays className="w-4 h-4 text-white" />}
            {type === "seasonal" && <Sparkles className="w-4 h-4 text-white" />}
          </div>
          <div>
            <h3 className="font-bold text-white">{config.label}s</h3>
            <p className="text-xs text-zinc-500">{config.resetText}</p>
          </div>
        </div>

        {completedCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            {completedCount} terminée{completedCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Missions Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {missions.map((mission, index) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <MissionCard
              mission={mission}
              onClaim={onClaim}
              onClick={onMissionClick ? () => onMissionClick(mission) : undefined}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

interface EmptyMissionsStateProps {
  hasFilters: boolean
  onClearFilters: () => void
}

function EmptyMissionsState({ hasFilters, onClearFilters }: EmptyMissionsStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
        <Target className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {hasFilters ? "Aucune mission trouvée" : "Pas de missions"}
      </h3>
      <p className="text-zinc-500 max-w-sm mb-4">
        {hasFilters
          ? "Essaie de modifier tes filtres pour voir plus de missions."
          : "De nouvelles missions arrivent bientôt ! Reviens plus tard."}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Effacer les filtres
        </button>
      )}
    </motion.div>
  )
}
